import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from supabase import create_client, Client

# 🔐 Supabase-Verbindung aus den GitHub-Secrets auslesen
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("Fehler: Supabase Credentials fehlen in den Umgebungsvariablen!")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

# 🛡️ Die clevere Session mit automatischen Retries
session = requests.Session()
retries = Retry(
    total=5,
    backoff_factor=3,
    status_forcelist=[403, 429, 500, 502, 503, 504],
    raise_on_status=False
)
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))

# 🎯 HIER IST DER MAGISCHE TRICK: Wir nutzen exakt die www-Domain wie dein anderer Bot!
api_url = "https://www.ipscmatch.de/?matchapi"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Connection": "keep-alive"
}

try:
    print("Lade saubere JSON-Daten über die IPSC-API (mit www-Tarnkappe)...")
    
    response = session.get(api_url, headers=headers, timeout=15)
    
    if response.status_code != 200:
        print(f"⚠️ Warnung: Server antwortet mit Status-Code {response.status_code}.")
        print("Die API-Tür ist für GitHub aktuell leider verschlossen.")
        exit(0)
        
    match_data = response.json()
    matches_to_insert = []

    for match_id, info in match_data.items():
        status = info.get("Status", "").lower()
        auslastung = info.get("Utilisation", "")
        
        if "%" not in auslastung:
            if "cancelled" in status or "geschlossen" in status or "closed" in status:
                continue
                
            match_name = info.get("Name", "Unbekanntes Match")
            datum = info.get("Date", "N/A")
            oeffnungs_datum = info.get("Startreg", "Siehe Detailseite")
            region = info.get("Region", "N/A").upper()
            level = info.get("Level", "N/A")
            
            disziplin = info.get("Guntype", info.get("Gun", "HG"))
            if not disziplin:
                disziplin = "HG"

            match_url = info.get("url", f"https://www.ipscmatch.de/index.pl?match={match_id}")

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
        print(f"Lösche alte Einträge aus 'upcoming_matches'...")
        supabase.from_("upcoming_matches").delete().neq("match_name", "---").execute()
        
        print(f"Schreibe {len(matches_to_insert)} neue Ankündigungen in Supabase...")
        supabase.from_("upcoming_matches").insert(matches_to_insert).execute()
        print("🎉 Jackpot! API-Daten erfolgreich mit Supabase synchronisiert!")
    else:
        print("Aktuell keine ungeöffneten Ankündigungen in der API gefunden.")

except requests.exceptions.RetryError as e:
    print("\n⚠️ NETZWERK-FEHLER:")
    print("Der Türsteher hat den Braten gerochen. Wir müssen auf den Raspberry Pi umziehen!")
except Exception as e:
    print(f"❌ Unerwarteter Fehler: {e}")
