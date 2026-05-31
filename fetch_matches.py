import requests
import json
from bs4 import BeautifulSoup
import re
import urllib.parse

base_url = "https://www.ipscmatch.de/"
headers = {"User-Agent": "Mozilla/5.0"}

try:
    response = requests.get(base_url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []
    
    table = soup.find('table')
    if table:
        for row in table.find_all('tr')[1:]: # Kopfzeile überspringen
            cells = row.find_all('td')
            if len(cells) >= 5:
                # Flaggen-Trick: Wir entfernen alle Bilder aus der Zelle, BEVOR wir den Text lesen
                for img in row.find_all('img'):
                    img.decompose()
                
                disziplin = cells[0].text.strip()
                level = cells[1].text.strip()
                region = cells[2].text.strip() # Jetzt ohne Flagge!
                
                # Veranstaltung (mit Link-Check)
                match_link = cells[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                    
                    # Status prüfen
                    is_closed = "closed" in row.text.lower() or "geschlossen" in row.text.lower()
                    if not is_closed:
                        try:
                            d_resp = requests.get(detail_url, headers=headers, timeout=5)
                            if "anmeldung geschlossen" in d_resp.text.lower():
                                is_closed = True
                        except: pass
                    
                    prozent_match = re.search(r'(\d{1,3})\s*%', row.text)
                    if prozent_match and int(prozent_match.group(1)) < 100:
                        matches.append({
                            "name": best_name,
                            "auslastung": f"{prozent_match.group(1)}%",
                            "region": region,
                            "level": level,
                            "disziplin": disziplin,
                            "url": detail_url,
                            "is_closed": is_closed
                        })

    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print("Update erfolgreich.")

except Exception as e:
    print(f"Fehler: {e}")
