import urllib.request
import json
from bs4 import BeautifulSoup

url = "https://www.ipscmatch.de/"
# Wir simulieren einen echten Browser noch stärker
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req, timeout=30) as response:
        html = response.read()
        soup = BeautifulSoup(html, 'html.parser')
        
        matches = []
        for row in soup.find_all('tr'):
            if '%' in row.text:
                matches.append(row.text.strip())
                
        with open('matches.json', 'w', encoding='utf-8') as f:
            json.dump(matches, f, ensure_ascii=False)
        print("Erfolgreich gespeichert.")

except Exception as e:
    print(f"Fehler: {e}")
