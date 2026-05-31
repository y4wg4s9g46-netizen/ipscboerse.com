import requests
import json
from bs4 import BeautifulSoup

proxy_url = "https://script.google.com/macros/s/AKfycbxYRYQGelgaC0kuqm1tTVsJqVw_chiV8SJMCChRta0gS8YkoqCYhF0LZW1vEnB2687gTQ/exec"

try:
    response = requests.get(proxy_url, timeout=60)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    matches = []
    for row in soup.find_all('tr'):
        if '%' in row.text:
            matches.append(row.text.strip())
            
    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False)
except Exception as e:
    print(f"Fehler: {e}")
