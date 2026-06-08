import requests
import json
from bs4 import BeautifulSoup
import re
import urllib.parse
import time
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

base_url = "https://www.ipscmatch.de/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# 🛡️ Sichere Session aufbauen (wie im ersten Skript)
session = requests.Session()
retry = Retry(total=5, backoff_factor=3, status_forcelist=[403, 429, 500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)

try:
    print("Lade Daten von ipscmatch.de...")
    response = session.get(base_url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        
        if len(tds) >= 8:
            status_text = tds[6].text.strip().lower()
            auslastung_text = tds[7].text.strip()
            
            # 🔍 PRÜFUNG: Ist es ENTWEDER ein offenes Match (< 100%) ODER eine reine Ankündigung?
            ist_ankuedigung = "ankündigung" in status_text or "ankundigung" in status_text
            hat_prozent = '%' in auslastung_text
            
            auslastung_int = 0
            if hat_prozent:
                prozent_match = re.search(r'(\d{1,3})', auslastung_text)
                if prozent_match:
                    auslastung_int = int(prozent_match.group(1))

            # Filter: Nur verarbeiten, wenn offen (<100%) ODER wenn es eine bald öffnende Ankündigung ist
            if (hat_prozent and auslastung_int < 100) or ist_ankuedigung:
                
                # Wenn storniert oder geschlossen -> überspringen
                if "cancelled" in status_text or "geschlossen" in status_text or "closed" in status_text:
                    continue
                    
                disziplin = tds[0].text.strip()
                level = tds[1].text.strip()
                
                # --- Region auslesen ---
                region = tds[2].text.strip()
                if not region:
                    img = tds[2].find('img')
                    if img:
                        region = img.get('title', img.get('alt', '')).strip().upper()
                        if not region and img.get('src'):
                            src_match = re.search(r'([a-zA-Z]{3})\.(?:png|jpg|gif)', img.get('src'))
                            if src_match:
                                region = src_match.group(1).upper()
                if not region:
                    region = "N/A"
                
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                    
                    is_closed = False
                    oeffnungs_datum = "Unbekannt"
                    
                    # ⏳ Kurze Pause vor dem Laden der Detailseite (Server schonen!)
                    time.sleep(0.5)
                    
                    try:
                        d_resp = session.get(detail_url, headers=headers, timeout=10)
                        d_soup = BeautifulSoup(d_resp.text, 'html.parser')
                        
                        # Wir holen den reinen Text ohne HTML-Tags
                        d_clean_text = d_soup.get_text(" ", strip=True)
                        
                        # Prüfen, ob die Anmeldung hart geschlossen ist
                        if "anmeldung geschlossen" in d_clean_text.lower() or "closed" in d_clean_text.lower():
                            is_closed = True
                        
                        # 🎯 KUGELSICHERER REGEX OHNE UMLAUTE:
                        # Wir suchen nach "anmeldung" (Groß/Klein egal) und überspringen 
                        # jegliche Sonderzeichen/Wörter bis zum Wochentag oder Datum
                        oeffnet_match = re.search(r'anmeldung\s+[^0-9a-zA-Z]*(?:öffnet|offnet)?\s*([a-zA-Z0-9.\s:-]+)', d_clean_text, re.IGNORECASE)
                        
                        if oeffnet_match:
                            raw_date = oeffnet_match.group(1).strip()
                            # Wir schneiden den Text sauber ab, falls zu viel Text mitgerissen wurde (max. 5 Wörter für das Datum)
                            oeffnungs_datum = " ".join(raw_date.split()[:5]).upper()
                        else:
                            # Fallback 2: Suche nach dem Wort "öffnet um" oder "offnet um"
                            zeit_match = re.search(r'(?:öffnet|offnet)\s+([a-zA-Z0-9.\s:-]+)', d_clean_text, re.IGNORECASE)
                            if zeit_match:
                                oeffnungs_datum = " ".join(zeit_match.group(1).strip().split()[:5]).upper()
                            else:
                                oeffnungs_datum = "DATUM NICHT GEFUNDEN"
                                
                    except Exception as e:
                        print(f"Warnung: Konnte Detailseite für {best_name} nicht prüfen ({e})")
                        oeffnungs_datum = "FEHLER BEIM LADEN"
                    
                    if is_closed:
                        continue
                    
                    # Datum aus der Haupttabelle auslesen
                    datum_raw = tds[5].text.strip()
                    datum_match = re.search(r'\d{2}\.\d{2}\.(?:\s*-\s*\d{2}\.\d{2}\.)?\s*\d{2,4}', datum_raw)
                    datum = datum_match.group(0).strip() if datum_match else (datum_raw if datum_raw else "N/A")

                    # Das Match wird JETZT GARANTIERT hinzugefügt, egal ob mit oder ohne Öffen-Datum!
                    matches.append({
                        "name": best_name,
                        "datum": datum,
                        "auslastung": f"{auslastung_int}%" if hat_prozent else "Ankündigung",
                        "anmeldung_oeffnet": oeffnungs_datum,
                        "region": region,
                        "level": level,
                        "disziplin": disziplin,
                        "url": detail_url
                    })

    # 🎯 HIER WURDE ES KORRIGIERT: Der Dateiname lautet nun physisch 'upcoming_matches.json'
    with open('upcoming_matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print(f"Erfolgreich {len(matches)} offene/bald öffnende Matches gefunden und in upcoming_matches.json gespeichert.")

except Exception as e:
    print(f"Fehler: {e}")
