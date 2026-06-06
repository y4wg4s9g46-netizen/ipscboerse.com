import os
import requests
import re
from bs4 import BeautifulSoup
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fehler: Umgebungsvariablen nicht gesetzt!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def discover_matches_automatically():
    """Scant die Startseite von ipscmatch.de und findet alle Match-IDs"""
    print("🔍 Suche auf ipscmatch.de nach aktuellen Matches...")
    base_url = "https://ipscmatch.de/"
    
    try:
        response = requests.get(base_url, timeout=15)
        if response.status_code != 200:
            print("❌ Startseite von ipscmatch.de konnte nicht geladen werden.")
            return
        
        soup = BeautifulSoup(response.text, 'html.parser')
        discovered = []

        # Wir suchen nach allen Links, die eine Match-ID enthalten
        # Typisch ist z.B. index.pl?match=73 oder Ordnerstrukturen /matches/73/
        for link in soup.find_all('a', href=True):
            href = link['href']
            match_id = None
            
            # Regulärer Ausdruck, um die ID herauszufiltern
            if "match=" in href:
                match_id_search = re.search(r'match=(\d+)', href)
                if match_id_search:
                    match_id = match_id_search.group(1)
            elif "/matches/" in href:
                match_id_search = re.search(r'/matches/(\d+)', href)
                if match_id_search:
                    match_id = match_id_search.group(1)

            if match_id and match_id not in [m['id'] for m in discovered]:
                match_name = link.text.strip() or f"Match #{match_id}"
                discovered.append({"id": str(match_id), "name": match_name})

        print(f"🔗 {len(discovered)} Matches auf der Startseite entdeckt.")

        # Neue Matches in die Supabase-Tabelle 'matches' pushen
        for match in discovered:
            supabase.table("matches").upsert(
                {"id": match["id"], "name": match["name"]},
                on_conflict="id"
            ).execute()
            
        print("✅ Match-Liste in Supabase erfolgreich aktualisiert.")

    except Exception as e:
        print(f"❌ Fehler bei der Match-Entdeckung: {e}")

def get_active_shooters():
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        return response.data
    except Exception as e:
        print(f"Fehler beim Laden der Profile: {e}")
        return []

def scrape_verify_list():
    # 1. Erst automatisch nach neuen Matches suchen
    discover_matches_automatically()

    shooters = get_active_shooters()
    if not shooters:
        print("ℹ️ Keine Schützen mit hinterlegtem Klarnamen gefunden.")
        return

    # 2. Alle Matches aus der Datenbank laden, die wir scannen müssen
    try:
        # Hier holen wir uns die Matches (z.B. die neuesten 10, um den Server zu schonen)
        match_response = supabase.table("matches").select("id, name").order("created_at", {"ascending": False}).limit(15).execute()
        matches = match_response.data
    except Exception as e:
        print(f"Fehler beim Laden der Match-Tabelle: {e}")
        return

    # 3. Schleife durch die Matches und Verify-Listen parsen
    for match in matches:
        match_id = match["id"]
        match_name = match["name"]
        url = f"https://ipscmatch.de/matches/{match_id}/verify.html"

        try:
            response = requests.get(url, timeout=15)
            if response.status_code != 200:
                # Falls WinMSS-Struktur anders ist, hier alternativer Pfad-Versuch
                url = f"https://ipscmatch.de/index.pl?match={match_id}&action=verify"
                response = requests.get(url, timeout=15)
                if response.status_code != 200:
                    continue

            soup = BeautifulSoup(response.text, 'html.parser')
            for row in soup.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 11:
                    continue
                
                web_name = cells[1].text.strip().lower()

                for shooter in shooters:
                    real_name = shooter["real_name"].lower()

                    if real_name in web_name or web_name in real_name:
                        try:
                            payload = {
                                "user_id": shooter["id"], 
                                "match_id": str(match_id),
                                "match_name": match_name,
                                "stage_name": cells[2].text.strip(),
                                "scoring_type": cells[3].text.strip(),
                                "alphas": int(cells[4].text.strip()),
                                "charlies": int(cells[5].text.strip()),
                                "deltas": int(cells[6].text.strip()),
                                "misses": int(cells[7].text.strip()),
                                "no_shoots": int(cells[8].text.strip()),
                                "stage_time": float(cells[9].text.strip().replace(',', '.')),
                                "hit_factor": float(cells[10].text.strip().replace(',', '.'))
                            }

                            supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
                            print(f"   ⚡ Daten geladen für {shooter['real_name']} auf Stage {payload['stage_name']}")
                        except Exception as parse_error:
                            pass
        except Exception as conn_error:
            print(f"❌ Verbindung fehlgeschlagen für Match {match_id}: {conn_error}")

if __name__ == "__main__":
    scrape_verify_list()
