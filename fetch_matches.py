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
    for row in table.find_all('tr'):
        cells = row.find_all('td')
        # Wir brauchen mindestens 4 Zellen, um alle Infos zu haben
        if len(cells) >= 4:
            # 1. Den gesamten Textinhalt der Zellen holen
            # Wir bereinigen die Region-Zelle (Zelle 2) von allen Bildern (Flaggen)
            region_cell = cells[2]
            for img in region_cell.find_all('img'):
                img.decompose()
            
            disziplin = cells[0].text.strip()
            level = cells[1].text.strip()
            region = region_cell.text.strip() # Sollte nun z.B. "GER" sein
            
            # Die Match-Daten sind oft in Zelle 3 oder 4
            # Wir suchen das <a> Tag in der gesamten Zeile
            match_link = row.find('a')
            if match_link:
                name = match_link.text.strip()
                url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                
                prozent_match = re.search(r'(\d{1,3})\s*%', row.text)
                if prozent_match and int(prozent_match.group(1)) < 100:
                    matches.append({
                        "name": name,
                        "auslastung": f"{prozent_match.group(1)}%",
                        "region": region,
                        "level": level,
                        "disziplin": disziplin,
                        "url": url,
                        "is_closed": "geschlossen" in row.text.lower() or "closed" in row.text.lower()
                    })

    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print("Update erfolgreich.")
except Exception as e:
    print(f"Fehler: {e}")
