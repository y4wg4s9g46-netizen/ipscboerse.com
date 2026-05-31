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

    # Wir nutzen die bewährte Methode aus deinem Backup
    for row in soup.find_all('tr'):
        if '%' in row.text:
            tds = row.find_all('td')
            # Hier passen wir die Spalten-Indizes an: 
            # Je nachdem ob Spalte 0 das Datum ist oder nicht
            if len(tds) >= 4:
                # Da du sagtest, es hat funktioniert, behalten wir deine Logik bei
                # und fügen den Closed-Check hinzu.
                disziplin = tds[0].text.strip()
                level = tds[1].text.strip()
                region = tds[2].text.strip()
                
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                    
                    # Anmeldung-Check: Prüfe auf Detailseite auf den roten Text
                    is_closed = False
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
