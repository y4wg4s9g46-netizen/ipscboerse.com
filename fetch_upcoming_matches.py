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

# 🛡️ Die clevere Session mit automatischen Retries (wie beim Analytics-Bot)
session = requests.Session()
retries = Retry(
    total=5,              # Versuche es bei einem Fehler bis zu 5 Mal
    backoff_factor=3,     # Warte zwischen den Versuchen (3s, 6s, 12s...)
    status_forcelist=[403, 429, 500, 502, 503, 504],
    raise_on_status=False
)
# Adapter an die Session binden
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))

api_url = "https://ipscmatch.de/?matchapi"

# 🛡️ Menschlicher Tarnkappen-Header + Keep-Alive
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Connection": "keep-alive"
}

try:
    print("Lade saubere JSON-Daten über die IPSC-API...")
    
    # 🎯 HIER NEU: Wir nutzen die abgesicherte Session statt dem normalen 'requests.get'
    response = session.get(api_url, headers=headers, timeout=15)
    
    # Prüfen, ob die Seite uns wegen IP-Sperre geblockt hat, trotz Retries
    if response.status_code != 200:
        print(f"⚠️ Warnung: Server antwortet mit Status-Code {response.status_code}.")
        print("Möglicherweise ist die GitHub-IP gerade blockiert. Versuch es später noch einmal.")
        exit(0)
        
    match_data = response.json()
    matches_to_insert = []

    for match_id, info in match_data.items():
        status = info.get("Status", "").lower()
        auslastung = info.get("Utilisation", "")
        
        # Filter: Wir holen uns nur echte Ankündigungen (kein '%' in der Auslastung)
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
        print(f"Lösche alte Einträge aus 'upcoming_matches'...")
        supabase.from_("upcoming_matches").delete().neq("match_name", "---").execute()
        
        print(f"Schreibe {len(matches_to_insert)} neue Ankündigungen in Supabase...")
        supabase.from_("upcoming_matches").insert(matches_to_insert).execute()
        print("🎉 Gigantischer Erfolg! API-Daten erfolgreich mit Supabase synchronisiert!")
    else:
        print("Aktuell keine ungeöffneten Ankündigungen in der API gefunden.")

except requests.exceptions.RetryError as e:
    print("\n⚠️ NETZWERK-FEHLER (Trotz mehrfacher Versuche):")
    print("Der IPSC-Server blockiert diese GitHub-IP hartnäckig. Das Skript probiert es beim nächsten Durchlauf erneut.")
except Exception as e:
    print(f"❌ Unerwarteter Fehler: {e}")
