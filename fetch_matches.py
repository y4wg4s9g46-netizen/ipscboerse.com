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
        # Wir suchen nur Zeilen, die eine Prozentzahl enthalten
        if '%' in text:
            tds = row.find_all('td')
            
            # Wir prüfen, ob die Tabelle mindestens 4 Spalten hat
            if len(tds) >= 4:
                # Jetzt nutzen wir exakt DEINE Spalten-Zählweise!
                disziplin = tds[0].text.strip()  # Spalte 1
                level = tds[1].text.strip()      # Spalte 2
                region = tds[2].text.strip()     # Spalte 3 (Hier ist jetzt die Region!)
                
                best_name = ""
                best_url = ""
                # Spalte 4: Veranstaltung
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    best_url = urllib.parse.urljoin(url, match_link.get('href', ''))
                else:
                    best_name = tds[3].text.strip()
                
                # Erkennt sofort, ob das Match im Hintergrund als "closed" markiert ist
                is_closed = "closed" in text.lower() or "geschlossen" in text.lower()
                    
                prozent_match = re.search(r'(\d{1,3})\s*%', text)
                
                # Nur speichern, wenn wir einen Namen und eine Auslastung gefunden haben
                if best_name and prozent_match:
                    prozent_wert = int(prozent_match.group(1))
                    
                    # Wir nehmen nur Matches, die unter 100% sind
                    if prozent_wert < 100:
                        matches.append({
                            "name": best_name,
                            "auslastung": f"{prozent_wert}%",
                            "region": region,
                            "level": level,
                            "disziplin": disziplin,
                            "url": best_url,
                            "is_closed": is_closed # Gibt das Signal an dein HTML weiter
                        })

    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
        
    print(f"Erfolgreich {len(matches)} Matches gefunden und gespeichert.")

except Exception as e:
    print(f"Fehler: {e}")
