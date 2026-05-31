import requests
import json
from bs4 import BeautifulSoup

url = 'https://www.ipscmatch.de/'

try:
    # Die einfachstmögliche Anfrage ohne zusätzliche Header
    response = requests.get(url, timeout=30)
    response.raise_for_status() 
    
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []
    
    for row in soup.find_all('tr'):
        if '%' in row.text:
            matches.append(row.text.strip())
            
    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False)
        
except Exception as e:
    print(f"Fehler: {e}")
