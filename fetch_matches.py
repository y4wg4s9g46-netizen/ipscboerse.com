import requests
import json
from bs4 import BeautifulSoup

# Wir versuchen es direkt mit einem sehr "echten" Browser-Header
url = "https://www.ipscmatch.de/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7"
}

try:
    # Wir machen die Anfrage direkt
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status() 
    
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []
    # Suche nach Zeilen, die IPSC-Daten enthalten könnten
    for row in soup.find_all('tr'):
        if '%' in row.text:
            matches.append(row.text.strip())
            
    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False)
    print("Erfolgreich gespeichert.")
        
except Exception as e:
    print(f"Fehler: {e}")
