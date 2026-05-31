import requests
import json
from bs4 import BeautifulSoup

url = "https://www.ipscmatch.de/"
headers = {"User-Agent": "Mozilla/5.0"}

try:
    response = requests.get(url, headers=headers, timeout=20)
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []
    
    table = soup.find('table')
    if table:
        for row in table.find_all('tr')[1:]:
            cells = row.find_all('td')
            if len(cells) >= 5:
                # Flaggen entfernen
                for img in cells[2].find_all('img'): img.decompose()
                
                disziplin = cells[0].text.strip()
                level = cells[1].text.strip()
                region = cells[2].text.strip()
                
                link_tag = cells[4].find('a')
                if link_tag:
                    name = link_tag.text.strip()
                    m_url = "https://www.ipscmatch.de/" + link_tag.get('href', '')
                    
                    # Auslastung prüfen
                    prozent = 0
                    if '%' in row.text:
                        import re
                        m = re.search(r'(\d+)\s*%', row.text)
                        if m: prozent = int(m.group(1))
                    
                    if 0 < prozent < 100:
                        # Anmeldung-Check
                        is_closed = "geschlossen" in row.text.lower() or "closed" in row.text.lower()
                        
                        matches.append({
                            "name": name,
                            "auslastung": f"{prozent}%",
                            "region": region,
                            "level": level,
                            "disziplin": disziplin,
                            "url": m_url,
                            "is_closed": is_closed
                        })

    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print("Fertig.")
except Exception as e:
    print(f"Fehler: {e}")
