import requests
import json
from bs4 import BeautifulSoup

# Wir nutzen einen Proxy-Dienst, der Anfragen für uns weiterleitet
proxy_url = "https://api.allorigins.win/get?url=" + requests.utils.quote("https://www.ipscmatch.de/")

try:
    response = requests.get(proxy_url, timeout=30)
    data = response.json()
    soup = BeautifulSoup(data['contents'], 'html.parser')
    
    matches = []
    for row in soup.find_all('tr'):
        if '%' in row.text:
            matches.append(row.text.strip())
            
    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False)
        
except Exception as e:
    print(f"Fehler: {e}")
