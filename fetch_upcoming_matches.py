import os
import requests
import time
import urllib.parse
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
from datetime import datetime

# 🎯 1. HOMEPAGE AUSLESEN (Sicherer Weg über die normale Webseite)
base_url = "https://www.ipscmatch.de/"
url = "https://www.ipscmatch.de/index.pl?long=1"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive"
}

session = requests.Session()
retries = Retry(total=5, backoff_factor=3, status_forcelist=[403, 429, 500, 502, 503, 504], raise_on_status=False)
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))

try:
    print("Verbinde mit IPSC-Server und lese Homepage-Tabelle aus...")
    response = session.get(url, headers=headers, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Server-Fehler beim Laden der Homepage: {response.status_code}")
        exit(0)
        
    soup = BeautifulSoup(response.text, 'html.parser')
    matches_to_insert = []
    heute = datetime.now()

    # Wir scannen alle Tabellenzeilen
    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        if len(tds) >= 3:
            row_text = row.get_text().strip()
            row_low = row_text.lower()
            
            # 1. Wenn ein Prozentzeichen in der Zeile ist, ist die Anmeldung offen -> Weg damit!
            if "%" in row_text:
                continue
                
            # 2. Stornierte oder geschlossene Matches aussortieren
            if any(x in row_low for x in ["cancelled", "abgesagt", "geschlossen", "closed"]):
                continue

            match_link = tds[0].find('a')
            if match_link:
                match_name = match_link.text.strip()
                href = match_link.get('href', '')
                
                # Wir suchen im gesamten Text der Zeile nach einem Datum (z.B. 15.06.2026)
                is_upcoming = False
                oeffnungs_datum = "Ankündigung"
                
                # Wir extrahieren alle Datums-ähnlichen Fragmente per Regex (DD.MM.YYYY)
                import re
                found_dates = re.findall(r'\b\d{2}\.\d{2}\.\d{4}\b', row_text)
                
                if found_dates:
                    for d_str in found_dates:
                        try:
                            start_date = datetime.strptime(d_str, "%d.%m.%Y")
                            # Wenn EIN gefundenes Datum in der Zukunft liegt, ist es unser Match!
                            if start_date > heute:
                                is_upcoming = True
                                oeffnungs_datum = d_str
                                break
                        except ValueError:
                            continue
                
                # Falls kein hartes Datum gefunden wurde, aber Text-Hinweise auf eine Ankündigung vorliegen
                if not is_upcoming:
                    if any(x in row_low for x in ["ang", "usek", "in a", "unbekannt", "meldestart"]):
                        is_upcoming = True
                        oeffnungs_datum = "Ankündigung (Text-Status)"

                if is_upcoming:
                    # Dynamische Spaltenzuweisung, da Ankündigungen weniger Spalten haben
                    level = tds[1].get_text().strip() if len(tds) > 1 else "N/A"
                    region = tds[2].get_text().strip().upper() if len(tds) > 2 else "N/A"
                    
                    disziplin = "HG"
                    if "PCC" in match_name.upper():
                        disziplin = "PCC"
                    elif "MINI RIFLE" in match_name.upper() or "MR" in match_name.upper():
                        disziplin = "MR"

                    match_url = urllib.parse.urljoin(base_url, href)

                    matches_to_insert.append({
                        "match_name": match_name,
                        "datum": "Siehe Detailseite",
                        "auslastung": "Ankündigung",
                        "anmeldung_oeffnet": oeffnungs_datum,
                        "region": region,
                        "level": level,
                        "disziplin": disziplin,
                        "url": match_url
                    })

    print(f"Webseite erfolgreich gescannt! {len(matches_to_insert)} Ankündigungen gefunden.")

    # ⏳ Kurze Pause zum Entspannen
    time.sleep(3)

    # 🎯 2. IN SUPABASE SPEICHERN
    if matches_to_insert:
        from supabase import create_client, Client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            print("❌ Fehler: Supabase Credentials fehlen!")
            exit(1)

        supabase: Client = create_client(supabase_url, supabase_key)

        print(f"Lösche alte Einträge...")
        supabase.from_("upcoming_matches").delete().neq("match_name", "---").execute()
        
        print(f"Schreibe {len(matches_to_insert)} Matches in Supabase...")
        supabase.from_("upcoming_matches").insert(matches_to_insert).execute()
        print("🎉 Auslesen der Homepage war erfolgreich! Daten sind sauber in Supabase.")
    else:
        print("Keine kommenden Ankündigungen auf der Homepage gefunden.")

except Exception as e:
    print(f"❌ Fehler: {e}")
