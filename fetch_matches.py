import requests
import json
from bs4 import BeautifulSoup
import re
import urllib.parse

base_url = "https://www.ipscmatch.de/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

try:
    response = requests.get(base_url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []

    for row in soup.find_all('tr'):
        if '%' in row.text:
            tds = row.find_all('td')
            if len(tds) >= 4:
                # Spalten-Mapping: 0=Datum, 1=Disziplin, 2=Level, 3=Region, 4=Veranstaltung
                disziplin = tds[0].text.strip()
                level = tds[1].text.strip()
                region = tds[2].text.strip() # Hier steht die Region fest in der Tabelle
                
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                    
                    # Anmeldung-Check: Prüfe auf den Text in der Zelle UND auf der Detailseite
                    is_closed = "geschlossen" in row.text.lower()
                    if not is_closed:
                        try:
                            d_resp = requests.get(detail_url, headers=headers, timeout=5)
                            if "Anmeldung geschlossen" in d_resp.text:
                                is_closed = True
                        except:
                            pass
                    
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
