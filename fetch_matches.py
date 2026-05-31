import requests
import json
from bs4 import BeautifulSoup

# Hier kommt deine Web-App-URL vom Google Sheet rein
proxy_url = https://script.google.com/macros/s/AKfycbwAIM7EpJp0P_ntlg8shLeLE2YJXXf_JtQWfyb1C2GgFhcFX9R4myo6U5HRFjv3ymS11A/exec

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
