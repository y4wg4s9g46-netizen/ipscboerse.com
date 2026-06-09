import os
import requests
import time
import urllib.parse
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
from datetime import datetime

# 🎯 1. HOMEPAGE AUSLESEN (Der sichere Weg über die normale Webseite)
base_url = "https://www.ipscmatch.de/"
url = "https://www.ipscmatch.de/index.pl?long=1"

# Wir nutzen exakt die funktionierenden PC-Header aus deinem Analytics-Bot
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

    # Wir gehen Zeile für Zeile durch die Tabelle der Webseite
    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        # Eine gültige Zeile hat mindestens 5 Spalten (Name, Level, Region, Ort, Auslastung/Meldestart)
        if len(tds) >= 5:
            # Spalte 5 (Index 4) enthält entweder die Prozentzahl ODER den Meldestart/Status
            status_text = tds[4].get_text().strip()
            
            # Wenn ein Prozentzeichen drin ist, ist die Anmeldung schon offen -> Ignorieren!
            if "%" in status_text:
                continue

            match_link = tds[0].find('a') # In der ersten Spalte ist der Link zum Match
            if match_link:
                match_name = match_link.text.strip()
                href = match_link.get('href', '')
                
                # Match-ID aus dem Link extrahieren
                match_id = str(abs(hash(match_name)))
                if "match=" in href:
                    qs = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                    if 'match' in qs: 
                        match_id = qs['match'][0]

                # Stornierte oder geschlossene Matches aussortieren
                status_low = status_text.lower()
                if any(x in status_low for x in ["cancelled", "abgesagt", "geschlossen", "closed"]):
                    continue

                # Kalender-Prüfung: Liegt das Datum in der Zukunft?
                is_upcoming = False
                oeffnungs_datum = status_text

                # Wir versuchen, ein Datum aus den ersten 10 Zeichen zu lesen (z.B. "15.06.2026")
                if len(status_text) >= 10:
                    try:
                        date_part = status_text[:10]
                        start_date = datetime.strptime(date_part, "%d.%m.%Y")
                        if start_date > heute:
                            is_upcoming = True
                    except ValueError:
                        # Kein reines Datum? Dann prüfen wir auf Text-Ankündigungen
                        if any(x in status_low for x in ["ang", "usek", "in a", "unbekannt", "meldestart"]):
                            is_upcoming = True
                else:
                    if any(x in status_low for x in ["ang", "usek", "in a", "unbekannt", "meldestart"]):
                        is_upcoming = True

                if is_upcoming:
                    # Region und Level auslesen
                    level = tds[1].get_text().strip()
                    region = tds[2].get_text().strip().upper()
                    
                    # Disziplin ermitteln (Standardmäßig HG, es sei denn PCC steht im Namen)
                    disziplin = "HG"
                    if "PCC" in match_name.upper():
                        disziplin = "PCC"
                    elif "MINI RIFLE" in match_name.upper() or "MR" in match_name.upper():
                        disziplin = "MR"

                    match_url = urllib.parse.urljoin(base_url, href)

                    matches_to_insert.append({
                        "match_name": match_name,
                        "datum": "Siehe Detailseite", # Das genaue Match-Datum steht in einer anderen Spalte, "Ankündigung" reicht für die Übersicht
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
        print("🎉 Auslesen der Homepage war erfolgreich! Daten sind in Supabase.")
    else:
        print("Keine kommenden Ankündigungen auf der Homepage gefunden.")

except Exception as e:
    print(f"❌ Fehler: {e}")
