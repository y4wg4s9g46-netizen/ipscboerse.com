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

# 🛡️ Sichere Session aufbauen
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
            
            # 🔍 Wir filtern STRENG: Nur wenn "ankündigung" im Status steht
            ist_ankuedigung = "ankündigung" in status_text or "ankundigung" in status_text
            
            # Wenn es KEINE Ankündigung ist (oder storniert/geschlossen) -> Überspringen!
            if not ist_ankuedigung:
                continue
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
                
                # 🎯 GENIALER TRICK: Weil die Anmeldung zu ist, steht das Öffnungsdatum
                # direkt in der Spalte "Auslastung" der Haupttabelle!
                oeffnungs_datum = auslastung_text.strip().upper()
                
                # Falls dort wider Erwarten nichts steht, nutzen wir die Detailseite als Backup
                if not oeffnungs_datum or oeffnungs_datum == "ANKÜNDIGUNG":
                    oeffnungs_datum = "Siehe Detailseite"
                
                # Datum des Turniers aus der Haupttabelle auslesen
                datum_raw = tds[5].text.strip()
                datum_match = re.search(r'\d{2}\.\d{2}\.(?:\s*-\s*\d{2}\.\d{2}\.)?\s*\d{2,4}', datum_raw)
                datum = datum_match.group(0).strip() if datum_match else (datum_raw if datum_raw else "N/A")

                # Match zur Liste hinzufügen
                matches.append({
                    "name": best_name,
                    "datum": datum,
                    "auslastung": "Ankündigung",
                    "anmeldung_oeffnet": oeffnungs_datum,
                    "region": region,
                    "level": level,
                    "disziplin": disziplin,
                    "url": detail_url
                })

    # Speichern unter upcoming_matches.json
    with open('upcoming_matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print(f"Erfolgreich {len(matches)} reine Ankündigungen gefunden und in upcoming_matches.json gespeichert.")

except Exception as e:
    print(f"Fehler: {e}")
