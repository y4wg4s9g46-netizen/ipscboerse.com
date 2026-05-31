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
            best_name = ""
            best_url = ""
            land = "N/A"
            max_len = 0
            
            # Wir schauen uns ALLE Links in der Zeile an
            for a in row.find_all('a'):
                a_text = a.text.strip()
                href = a.get('href', '')
                
                # Ist es der Link für das Land? (Erkennt man am 'region=' im Link)
                if 'region=' in href:
                    land = a_text
                # Wir ignorieren Waffenart (?type=), Level (?level=) und das Land selbst für den Match-Namen
                elif 'type=' not in href and 'level=' not in href and 'region=' not in href:
                    if len(a_text) > max_len:
                        max_len = len(a_text)
                        best_name = a_text
                        best_url = urllib.parse.urljoin(url, href)
            
            # Nur speichern, wenn wir einen echten Match-Namen gefunden haben
            if best_name and max_len > 3:
                prozent_match = re.search(r'(\d{1,3})\s*%', text)
                if prozent_match:
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
