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
    print("Lade Übersicht...")
    response = requests.get(base_url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []

    for row in soup.find_all('tr'):
        if '%' in row.text:
            tds = row.find_all('td')
            if len(tds) >= 4:
                # Basisdaten aus der Übersicht
                disziplin = tds[0].text.strip()
                level = tds[1].text.strip()
                
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                    
                    # --- JETZT WIRD ES PRÄZISE: Detailseite öffnen ---
                    try:
                        detail_resp = requests.get(detail_url, headers=headers, timeout=10)
                        d_soup = BeautifulSoup(detail_resp.text, 'html.parser')
                        
                        # 1. Anmeldung prüfen
                        is_closed = "Anmeldung geschlossen" in detail_resp.text
                        
                        # 2. Region (Land) aus den Details lesen
                        # Oft steht das Land in einem speziellen Feld oder einer Tabelle
                        region = "N/A"
                        # Wir suchen nach einem Link mit region=
                        reg_link = d_soup.find('a', href=re.compile(r'region='))
                        if reg_link:
                            region = reg_link.text.strip()
                            
                    except:
                        is_closed = False
                        region = "N/A"
                    
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
    print(f"Erfolgreich {len(matches)} Matches inkl. Details geprüft.")

except Exception as e:
    print(f"Fehler: {e}")
