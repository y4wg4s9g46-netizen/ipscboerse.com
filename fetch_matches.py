import requests
import json
from bs4 import BeautifulSoup
import re
import urllib.parse

url = "https://www.ipscmatch.de/"
# Wir tarnen den GitHub-Server als normalen Browser
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

try:
    print("Lade Daten von ipscmatch.de...")
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []

    for row in soup.find_all('tr'):
        text = row.text
        if '%' in text:
            # Wir zerschneiden die Tabellenzeile exakt in ihre einzelnen Spalten (<td>)
            tds = row.find_all('td')
            
            # Die Tabelle hat feste Spalten: 0=Datum, 1=Art, 2=Level, 3=Veranstaltung, 4=Land
            if len(tds) >= 5:
                best_name = ""
                best_url = ""
                land = "N/A"
                
                # --- SPALTE 4: VERANSTALTUNG (Index 3) ---
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    best_url = urllib.parse.urljoin(url, match_link.get('href', ''))
                else:
                    # Falls es mal kein Link ist, nimm wenigstens den Text
                    best_name = tds[3].text.strip()
                    
                # --- SPALTE 5: LAND/REGION (Index 4) ---
                land_link = tds[4].find('a')
                if land_link:
                    land = land_link.text.strip()
                else:
                    land = tds[4].text.strip()
                    
                # Prozentzahl aus der Zeile filtern
                prozent_match = re.search(r'(\d{1,3})\s*%', text)
                
                # Nur speichern, wenn wir auch wirklich einen Namen in Spalte 4 gefunden haben
                if best_name and prozent_match:
                    prozent_wert = int(prozent_match.group(1))
                    
                    if prozent_wert < 100:
                        matches.append({
                            "name": best_name,
                            "auslastung": f"{prozent_wert}%",
                            "land": land,
                            "url": best_url
                        })

    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
        
    print(f"Erfolgreich {len(matches)} Matches gefunden und gespeichert.")

except Exception as e:
    print(f"Fehler: {e}")
