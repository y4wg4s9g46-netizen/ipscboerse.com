import requests
import json
from bs4 Beautifulsoup
import re
import urllib.parse

base_url = "https://www.ipscmatch.de/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

try:
    print("Lade Daten von ipscmatch.de...")
    response = requests.get(base_url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        
        # Die Tabelle auf der Website hat 8 Spalten
        if len(tds) >= 8:
            auslastung_text = tds[7].text.strip()
            
            if '%' in auslastung_text:
                prozent_match = re.search(r'(\d{1,3})', auslastung_text)
                
                if prozent_match:
                    auslastung_int = int(prozent_match.group(1))
                    
                    # 1. FILTER: Nur weiter, wenn die Auslastung unter 100% liegt
                    if auslastung_int < 100:
                        status_text = tds[6].text.strip().lower()
                        
                        # 2. FILTER: Wenn storniert oder geschlossen -> überspringen
                        if "cancelled" in status_text or "geschlossen" in status_text or "closed" in status_text:
                            continue
                            
                        disziplin = tds[0].text.strip()
                        level = tds[1].text.strip()
                        
                        # --- REGION KUGELSICHER AUSLESEN (Da es ein Flaggen-Bild ist) ---
                        region = tds[2].text.strip()
                        if not region:
                            img = tds[2].find('img')
                            if img:
                                # Holt das Land aus dem 'title' oder 'alt' Attribut des Bildes (z.B. "GER")
                                region = img.get('title', img.get('alt', '')).strip().upper()
                                
                                # Extra-Fallback: Falls es im Dateinamen steht (z.B. "flags/ger.png")
                                if not region and img.get('src'):
                                    src_match = re.search(r'([a-zA-Z]{3})\.(?:png|jpg|gif)', img.get('src'))
                                    if src_match:
                                        region = src_match.group(1).upper()
                        
                        # Falls alle Stricke reißen, kriegt es einen Platzhalter
                        if not region:
                            region = "N/A"
                        
                        match_link = tds[3].find('a')
                        if match_link:
                            best_name = match_link.text.strip()
                            detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                            
                            is_closed = False
                            
                            # 3. DETAIL-CHECK: Nur für potenziell offene Matches die Detailseite prüfen
                            try:
                                d_resp = requests.get(detail_url, headers=headers, timeout=10)
                                d_soup = BeautifulSoup(d_resp.text, 'html.parser')
                                d_clean_text = re.sub(r'\s+', ' ', d_soup.get_text(" ", strip=True).lower())
                                
                                if "anmeldung geschlossen" in d_clean_text or "closed" in d_clean_text:
                                    is_closed = True
                            except Exception as e:
                                print(f"Warnung: Konnte Detailseite für {best_name} nicht prüfen ({e})")
                            
                            if is_closed:
                                continue
                            
                            # Datum aus der Spalte auslesen und bereinigen
                            datum_raw = tds[5].text.strip()
                            datum_match = re.search(r'\d{2}\.\d{2}\.(?:\s*-\s*\d{2}\.\d{2}\.)?\s*\d{2,4}', datum_raw)
                            datum = datum_match.group(0).strip() if datum_match else (datum_raw if datum_raw else "N/A")

                            matches.append({
                                "name": best_name,
                                "datum": datum,
                                "auslastung": f"{auslastung_int}%",
                                "region": region,
                                "level": level,
                                "disziplin": disziplin,
                                "url": detail_url
                            })

    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print(f"Erfolgreich {len(matches)} offene Matches gefunden und in matches.json gespeichert.")

except Exception as e:
    print(f"Fehler: {e}")
