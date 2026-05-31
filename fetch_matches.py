import requests
import json
from bs4 import BeautifulSoup
import re

url = "https://www.ipscmatch.de/"
# Wir tarnen den GitHub-Server als normalen Browser
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

try:
    print("Lade Daten von ipscmatch.de...")
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []

    for row in soup.find_all('tr'):
        text = row.text
        if '%' in text:
            link_tag = row.find('a')
            if link_tag and 'href' in link_tag.attrs:
                href = link_tag['href']
                match_url = url + href if not href.startswith('http') else href
                match_name = link_tag.text.strip()
                prozent_match = re.search(r'(\d{1,3})\s*%', text)
                if prozent_match:
                    prozent_wert = int(prozent_match.group(1))
                    if prozent_wert < 100:
                        matches.append({
                            "name": match_name,
                            "auslastung": f"{prozent_wert}%",
                            "url": match_url
                        })

    # Speichert die Datei einfach direkt ab
    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
        
    print(f"Erfolgreich {len(matches)} Matches gefunden und gespeichert.")

except Exception as e:
    print(f"Fehler: {e}")
