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
    print("Lade Daten von ipscmatch.de...")
    response = requests.get(base_url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    matches = []

    for row in soup.find_all('tr'):
        if '%' in row.text:
            tds = row.find_all('td')
            if len(tds) >= 4:
                # Basisdaten aus der Übersichtstabelle auslesen
                disziplin = tds[0].text.strip()
                level = tds[1].text.strip()
                
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                    
                    # 1. Check in der Hauptübersicht, ob das Wort geschlossen vorkommt
                    is_closed = "geschlossen" in row.text.lower()
                    region = ""

                    # Wenn es nicht offensichtlich geschlossen ist, prüfen wir die Detailseite
                    if not is_closed:
                        try:
                            d_resp = requests.get(detail_url, headers=headers, timeout=5)
                            d_text = d_resp.text
                            
                            # Prüfe, ob auf der Detailseite "Anmeldung geschlossen" steht
                            if "Anmeldung geschlossen" in d_text:
                                is_closed = True
                            else:
                                # Lese das Land / die Region aus der Detailseite aus
                                # Sucht nach dem Wort "Region" gefolgt von einem Länderkürzel (z.B. GER, AUT, SUI)
                                reg_match = re.search(r'Region.*?(GER|AUT|SUI|NED|BEL|FRA|CZE|POL|DEN|ITA|ESP)', d_text, re.IGNORECASE)
                                if reg_match:
                                    region = reg_match.group(1).upper()
                                else:
                                    region = "N/A"
                        except:
                            pass
                    
                    # WICHTIG: Wenn das Match geschlossen ist, wird es sofort übersprungen 
                    # und gar nicht erst in die json-Datei geschrieben!
                    if is_closed:
                        continue
                    
                    prozent_match = re.search(r'(\d{1,3})\s*%', row.text)
                    if prozent_match and int(prozent_match.group(1)) < 100:
                        matches.append({
                            "name": best_name,
                            "auslastung": f"{prozent_match.group(1)}%",
                            "region": region,
                            "level": level,
                            "disziplin": disziplin,
                            "url": detail_url
                            # Das Feld 'is_closed' haben wir entfernt, da geschlossene Matches ohnehin rausfliegen
                        })

    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print(f"Erfolgreich {len(matches)} offene Matches gefunden.")

except Exception as e:
    print(f"Fehler: {e}")
