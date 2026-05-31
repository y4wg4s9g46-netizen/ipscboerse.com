import requests
import json
from bs4 import BeautifulSoup

url = 'https://www.ipscmatch.de/'
# Den Bot als normalen Browser tarnen
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
}

try:
    # Timeout hinzugefügt, falls die Seite langsam ist
    response = requests.get(url, headers=headers, timeout=20)
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
