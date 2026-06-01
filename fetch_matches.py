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
                disziplin = tds[0].text.strip()
                level = tds[1].text.strip()
                
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip()
                    detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                    
                    # --- NEU: Datum kugelsicher auslesen ---
                    datum = "N/A"
                    # Sucht nach 15.09.2024 oder 15.09. - 16.09.2024
                    datum_match = re.search(r'\d{2}\.\d{2}\.(?:\s*-\s*\d{2}\.\d{2}\.)?\s*\d{2,4}', row.text)
                    if datum_match:
                        datum = datum_match.group(0).strip()
                    
                    # Glättet den Text der Tabellenzeile
                    row_text_clean = re.sub(r'\s+', ' ', row.text.lower())
                    is_closed = "geschlossen" in row_text_clean
                    region = ""

                    if not is_closed:
                        try:
                            d_resp = requests.get(detail_url, headers=headers, timeout=10)
                            d_soup = BeautifulSoup(d_resp.text, 'html.parser')
                            
                            d_clean_text = re.sub(r'\s+', ' ', d_soup.get_text(" ", strip=True).lower())
                            
                            if "anmeldung geschlossen" in d_clean_text or "closed" in d_clean_text:
                                is_closed = True
                            else:
                                reg_match = re.search(r'region.*?(GER|AUT|SUI|NED|BEL|FRA|CZE|POL|DEN|ITA|ESP|POR|GBR|HUN|SVK|SLO|CRO|GRE|FIN|SWE|NOR)', d_clean_text, re.IGNORECASE)
                                if reg_match:
                                    region = reg_match.group(1).upper()
                                else:
                                    region = "N/A"
                        except:
                            pass
                    
                    if is_closed:
                        continue
                    
                    prozent_match = re.search(r'(\d{1,3})\s*%', row.text)
                    if prozent_match and int(prozent_match.group(1)) < 100:
                        matches.append({
                            "name": best_name,
                            "datum": datum, # Gibt das Datum an deine Website weiter
                            "auslastung": f"{prozent_match.group(1)}%",
                            "region": region,
                            "level": level,
                            "disziplin": disziplin,
                            "url": detail_url
                        })

    with open('matches.json', 'w', encoding='utf-8') as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print(f"Erfolgreich {len(matches)} offene Matches gefunden.")

except Exception as e:
    print(f"Fehler: {e}")
