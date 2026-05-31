import requests
import json
from bs4 import BeautifulSoup
import re

url = "https://www.ipscmatch.de/"

# Wir tarnen uns als normaler Windows-Chrome-Browser
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

try:
    print("Verbinde mit ipscmatch.de ...")
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []
    
    # Alle Tabellenzeilen durchsuchen
    for row in soup.find_all('tr'):
        text = row.text
        if '%' in text:
            # Wir suchen den Link zum Match
            link_tag = row.find('a')
            
            if link_tag and 'href' in link_tag.attrs:
                # Link zusammenbauen
                href = link_tag['href']
                match_url = url + href if not href.startswith('http') else href
                match_name = link_tag.text.strip()
                
                # Prozentzahl auslesen (z.B. "85%")
                prozent_match = re.search(r'(\d{1,3})\s*%', text)
                if prozent_match:
                    prozent_wert = int(prozent_match.group(1))
                    
                    # NUR Matches unter 100% speichern
                    if prozent_wert < 100:
                        matches.append({
                            "name": match_name,
                            "auslastung": f"{prozent_wert}%",
                            "url": match_url
                        })
                        
    # Daten in die JSON-Datei schreiben
    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
        
    print(f"Erfolgreich! {len(matches)} freie Matches gefunden und in 'matches.json' gespeichert.")

except Exception as e:
    print(f"Ein Fehler ist aufgetreten: {e}")
