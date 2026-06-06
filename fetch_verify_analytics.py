import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# 1. Verbindung zu deiner Supabase herstellen (Nutzt Umgebungsvariablen)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Erlaubt das Lesen des gesicherten real_name Felds

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fehler: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gesetzt!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_active_reloaders():
    """Holt die IDs und echten Namen aller registrierten Schützen"""
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        return response.data
    except Exception as e:
        print(f"Fehler beim Laden der Schützenprofile: {e}")
        return []

def get_tracked_matches():
    """Holt die aktuellen Matches aus deiner bestehenden Match-Liste, um sie zu scannen"""
    try:
        # Hier wird angenommen, dass du eine Tabelle 'matches' hast, in der du die IDs von ipscmatch.de speicherst
        response = supabase.table("matches").select("id, name").execute()
        return response.data
    except Exception as e:
        # Fallback, falls du noch keine Match-Tabelle hast (zum Testen von Handgun Matches 2026)
        print("Hinweis: Keine 'matches'-Tabelle gefunden, nutze Test-Match ID.")
        return [{"id": "12345", "name": "Deutsche Meisterschaft Handgun 2026"}]

def scrape_verify_list():
    shooters = get_active_reloaders()
    matches = get_tracked_matches()

    if not shooters:
        print("ℹ️ Keine Schützen mit hinterlegtem Klarnamen in der Datenbank.")
        return

    for match in matches:
        match_id = match["id"]
        match_name = match["name"]
        
        # Die offizielle WinMSS/PractiScore Verify-URL-Struktur auf ipscmatch.de
        url = f"https://ipscmatch.de/matches/{match_id}/verify.html"
        print(f"Scanne Match: {match_name} ({url})...")

        try:
            response = requests.get(url, timeout=15)
            if response.status_code != 200:
                print(f"-> Keine Verify-Liste für Match {match_id} online (Status {response.status_code}).")
                continue

            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Wir durchsuchen alle Tabellenzeilen des offiziellen HTML-Exports
            for row in soup.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 11:
                    continue # Keine gültige Wertungszeile einer Stage
                
                # In der zweiten Spalte [1] steht auf ipscmatch.de üblicherweise der Name des Teilnehmers
                web_name = cells[1].text.strip().lower()

                for shooter in shooters:
                    real_name = shooter["real_name"].lower()

                    # Flexibler Abgleich (erkennt "Mustermann, Max" genauso wie "Max Mustermann")
                    if real_name in web_name or web_name in real_name:
                        try:
                            # Werte aus den Standard-WinMSS-Spalten extrahieren
                            payload = {
                                "user_id": shooter["id"], # Absolute Anonymität im Frontend!
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

                            # Sicherer Cloud-Upload (Aktualisiert bestehende Werte, falls sich etwas ändert)
                            supabase.table("user_match_analytics").upsert(
                                payload, 
                                on_conflict="user_id,match_id,stage_name"
                            ).execute()
                            
                            print(f"   ⚡ Treffer geladen für Schützen-ID {shooter['id']} auf {payload['stage_name']}")
                        
                        except Exception as parse_error:
                            print(f"❌ Fehler beim Parsen der Stage-Zeile: {parse_error}")

        except Exception as conn_error:
            print(f"❌ Verbindung zu ipscmatch.de fehlgeschlagen: {conn_error}")

if __name__ == "__main__":
    scrape_verify_list()
