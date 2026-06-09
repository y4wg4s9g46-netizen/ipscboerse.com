import os
import requests
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from datetime import datetime

# 🎯 1. API DIREKT ABRUFEN
api_url = "https://ipscmatch.de/?matchapi"

# 🛡️ Der perfekte Tarnschild: Echte Windows-PC-Header kombiniert mit deiner Mail am Ende
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 / Bot-Owner: info@ipscboerse.com",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive"
}

session = requests.Session()
retries = Retry(total=5, backoff_factor=3, status_forcelist=[403, 429, 500, 502, 503, 504], raise_on_status=False)
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))

try:
    print("Lade API-Daten...")
    response = session.get(api_url, headers=headers, timeout=15)
    
    if response.status_code != 200:
        print(f"⚠️ Server-Fehler: {response.status_code}")
        exit(0)
        
    match_data = response.json()
    matches_to_insert = []
    heute = datetime.now()

    for match_id, info in match_data.items():
        status = info.get("Status", "").lower()
        oeffnungs_datum = info.get("Startreg", "").strip()
        
        if "cancelled" in status or "abgesagt" in status:
            continue

        is_upcoming = False

        if oeffnungs_datum and oeffnungs_datum != "None":
            try:
                date_part = oeffnungs_datum[:10]
                start_date = datetime.strptime(date_part, "%d.%m.%Y")
                if start_date > heute:
                    is_upcoming = True
            except ValueError:
                if any(x in oeffnungs_datum.lower() for x in ["ang", "usek", "in a", "unbekannt"]):
                    is_upcoming = True
        
        if is_upcoming:
            match_name = info.get("Name", "Unbekanntes Match")
            datum = info.get("Date", "N/A")
            region = info.get("Region", "N/A").upper()
            level = info.get("Level", "N/A")
            disziplin = info.get("Guntype", info.get("Gun", "HG")) or "HG"
            match_url = info.get("url", f"https://ipscmatch.de/index.pl?match={match_id}")

            matches_to_insert.append({
                "match_name": match_name,
                "datum": datum,
                "auslastung": "Ankündigung",
                "anmeldung_oeffnet": oeffnungs_datum,
                "region": region,
                "level": level,
                "disziplin": disziplin,
                "url": match_url
            })

    print(f"API erfolgreich ausgelesen! {len(matches_to_insert)} Zukunfts-Matches verarbeitet.")

    # ⏳ KURZE PAUSE (3 Sekunden) um den Workflow zu entspannen, bevor Supabase anspringt
    print("⏳ Lege eine kurze Schonpause ein...")
    time.sleep(3)

    # 🎯 2. ERST JETZT SUPABASE LADEN
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
        print("🎉 Alles erledigt! Daten sind getarnt und sicher in Supabase gelandet!")
    else:
        print("Keine Matches zum Einfügen gefunden.")

except Exception as e:
    print(f"❌ Fehler: {e}")
