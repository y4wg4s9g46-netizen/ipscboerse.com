import os
import requests
import re
from datetime import datetime
import pytz
import urllib.parse
from bs4 import BeautifulSoup
from supabase import create_client, Client

# === KONFIGURATION ===
# Diese Variablen müssen in den GitHub Repository Secrets hinterlegt sein!
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fehler: Supabase Umgebungsvariablen fehlen!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

base_url = "https://www.ipscmatch.de/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# Deutsche Zeitzone (wichtig für Sommer-/Winterzeit)
local_tz = pytz.timezone('Europe/Berlin')

try:
    print("🔍 Lade Daten von ipscmatch.de und suche nach bald öffnenden Matches...")
    response = requests.get(base_url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    matches_found = 0

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        
        # Die Tabelle auf der Website hat mindestens 8 Spalten
        if len(tds) >= 8:
            status_text = tds[6].text.strip().lower()
            
            # Prüfen, ob das Match demnächst öffnet
            if "öffnet am" in status_text or "opens on" in status_text or "opens at" in status_text:
                
                # Regex extrahiert das Format: DD.MM.YYYY und HH:MM
                # Deckt auch Varianten ab wie "öffnet am 15.08.2026 um 20:00"
                time_match = re.search(r'(\d{2})\.(\d{2})\.(\d{4})\s*(?:um|at)?\s*(\d{2}):(\d{2})', status_text)
                
                if time_match:
                    day, month, year, hour, minute = map(int, time_match.groups())
                    
                    # Zeitzonen-korrektes Datum-Objekt erstellen
                    dt_obj = local_tz.localize(datetime(year, month, day, hour, minute))
                    
                    # In weltweites ISO-Format umwandeln (für die Datenbank)
                    iso_time = dt_obj.isoformat()
                    
                    match_link = tds[3].find('a')
                    if match_link:
                        match_name = match_link.text.strip()
                        match_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                        
                        # Datenpaket für Supabase
                        match_data = {
                            "match_name": match_name,
                            "url": match_url,
                            "opening_time": iso_time
                        }
                        
                        # In Datenbank schreiben (Upsert verhindert Duplikate, benötigt 'match_name' als Unique/Primary Key)
                        try:
                            supabase.table("upcoming_matches").upsert(match_data, on_conflict="match_name").execute()
                            print(f"✅ GESPEICHERT: '{match_name}' öffnet am {day:02d}.{month:02d}.{year} um {hour:02d}:{minute:02d} Uhr")
                            matches_found += 1
                        except Exception as db_err:
                            print(f"❌ DB-Fehler bei '{match_name}': {db_err}")

    if matches_found == 0:
        print("📭 Aktuell gibt es keine neuen Matches mit dem Status 'Anmeldung öffnet'.")
    else:
        print(f"🎉 Erfolgreich {matches_found} künftige Matches in die Datenbank geladen!")

except Exception as e:
    print(f"❌ Schwerwiegender Fehler beim Scrapen: {e}")
