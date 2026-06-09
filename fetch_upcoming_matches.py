import os
import requests
from supabase import create_client, Client
from datetime import datetime

# 🔐 Supabase-Verbindung aus den GitHub-Secrets auslesen
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("Fehler: Supabase Credentials fehlen in den Umgebungsvariablen!")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

# 🎯 Der neue, unzerstörbare API-Link!
api_url = "https://ipscmatch.de/?matchapi"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
}

try:
    print("Lade saubere JSON-Daten über die IPSC-API...")
    response = requests.get(api_url, headers=headers, timeout=15)
    
    # Die API liefert direkt ein Python-Dictionary
    match_data = response.json()
    matches_to_insert = []

    # Wir loopen durch alle Matches in der API
    for match_id, info in match_data.items():
        status = info.get("Status", "").lower()
        auslastung = info.get("Utilisation", "")
        
        # 🎯 FILTER: Wir holen uns nur echte Ankündigungen!
        # Ein Match ist eine Ankündigung, wenn kein '%' in der Auslastung steht
        if "%" not in auslastung:
            
            # Falls storniert oder geschlossen -> überspringen
            if "cancelled" in status or "geschlossen" in status or "closed" in status:
                continue
                
            match_name = info.get("Name", "Unbekanntes Match")
            datum = info.get("Date", "N/A")
            oeffnungs_datum = info.get("Startreg", "Siehe Detailseite")
            region = info.get("Region", "N/A").upper()
            level = info.get("Level", "N/A")
            
            # Disziplin ermitteln (Manche Einträge nutzen 'Guntype', manche 'Gun')
            disziplin = info.get("Guntype", info.get("Gun", "HG"))
            if not disziplin:
                disziplin = "HG"

            match_url = info.get("url", f"https://ipscmatch.de/index.pl?match={match_id}")

            # Datenstruktur exakt passend für deine saubere Supabase-Tabelle
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
        
        print(f"Schreibe {len(matches_to_insert)} neue Ankündigungen über die API in Supabase...")
        supabase.from_("upcoming_matches").insert(matches_to_insert).execute()
        print("🎉 Gigantischer Erfolg! API-Daten erfolgreich mit Supabase synchronisiert!")
    else:
        print("Aktuell keine ungeöffneten Ankündigungen in der API gefunden.")

except Exception as e:
    print(f"❌ Fehler bei der API-Verarbeitung: {e}")
