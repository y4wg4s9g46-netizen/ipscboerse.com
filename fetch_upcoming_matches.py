import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from supabase import create_client, Client
from datetime import datetime

# 🔐 Supabase-Verbindung aus den GitHub-Secrets auslesen
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("❌ Fehler: Supabase Credentials fehlen!")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

# 🛡️ Session mit Retries
session = requests.Session()
retries = Retry(total=5, backoff_factor=3, status_forcelist=[403, 429, 500, 502, 503, 504], raise_on_status=False)
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))

api_url = "https://ipscmatch.de/?matchapi"
headers = {
    "User-Agent": "Doppel-AA-IPSC-Bot / info@ipscboerse.com",
    "Accept": "application/json"
}

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
        
        # Stornierte Sachen fliegen natürlich immer raus
        if "cancelled" in status or "abgesagt" in status:
            continue

        is_upcoming = False

        if oeffnungs_datum and oeffnungs_datum != "None":
            try:
                # Wir holen das Datum raus (die ersten 10 Zeichen, z.B. "30.06.2026")
                date_part = oeffnungs_datum[:10]
                start_date = datetime.strptime(date_part, "%d.%m.%Y")
                
                # Radikale Logik: Liegt der Meldestart in der Zukunft? -> Dann sichern!
                if start_date > heute:
                    is_upcoming = True
            except ValueError:
                # Falls Text drin steht wie "angekündigt", nehmen wir es mit rein
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

    if matches_to_insert:
        print(f"Lösche alte Einträge...")
        supabase.from_("upcoming_matches").delete().neq("match_name", "---").execute()
        
        print(f"Schreibe {len(matches_to_insert)} Matches in Supabase...")
        supabase.from_("upcoming_matches").insert(matches_to_insert).execute()
        print("🎉 Großartig! Jetzt haben wir alle zukünftigen Matches erwischt!")
    else:
        print("Keine Matches gefunden.")

except Exception as e:
    print(f"❌ Fehler: {e}")
