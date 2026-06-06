import os
import requests
import re
from datetime import datetime
from bs4 import BeautifulSoup
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fehler: Umgebungsvariablen nicht gesetzt!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def discover_matches_automatically():
    """Scant ipscmatch.de und importiert neue Matches ab dem 01.01.2025"""
    print("🔍 Suche auf ipscmatch.de nach Matches ab dem 01.01.2025...")
    base_url = "https://ipscmatch.de/"
    stichtag = datetime(2025, 1, 1)
    
    try:
        # Erst holen wir uns die IDs, die wir SCHON in unserer DB haben
        existing_response = supabase.table("matches").select("id").execute()
        existing_ids = [str(m["id"]) for m in existing_response.data] if existing_response.data else []

        response = requests.get(base_url, timeout=15)
        if response.status_code != 200:
            print("❌ Startseite von ipscmatch.de konnte nicht geladen werden.")
            return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        discovered = []
        matches_to_scrape = []

        # Wir gehen durch alle Tabellenzeilen der Match-Liste
        for row in soup.find_all('tr'):
            cells = row.find_all('td')
            row_text = row.get_text()
            
            # Datum in der Zeile suchen (Format: TT.MM.JJJJ)
            date_match = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', row_text)
            if not date_match:
                continue
                
            tag, monat, jahr = map(int, date_match.groups())
            try:
                match_date = datetime(jahr, monat, tag)
            except ValueError:
                continue
            
            # Filter: Nur Matches ab 01.01.2025
            if match_date < stichtag:
                continue

            # Match-ID aus dem Link extrahieren
            link = row.find('a', href=True)
            if not link:
                continue
                
            href = link['href']
            match_id = None
            
            if "match=" in href:
                id_search = re.search(r'match=(\d+)', href)
                if id_search: match_id = id_search.group(1)
            elif "/matches/" in href:
                id_search = re.search(r'/matches/(\d+)', href)
                if id_search: match_id = id_search.group(1)

            if match_id and match_id not in [m['id'] for m in discovered]:
                match_id_str = str(match_id)
                formatted_name = f"{link.text.strip()} ({tag:02d}.{monat:02d}.{jahr})"
                
                match_data = {"id": match_id_str, "name": formatted_name}
                discovered.append(match_data)

                # --- DER INTELLIGENTE FILTER ---
                # Wie alt ist das Match in Tagen?
                alter_in_tagen = (datetime.now() - match_date).days
                
                # Wir scrapen nur, wenn das Match BRANDNEU ist (noch nicht in DB)
                # ODER wenn es jünger als 7 Tage ist (da sich Ergebnisse noch ändern können)
                if match_id_str not in existing_ids or alter_in_tagen <= 7:
                    matches_to_scrape.append(match_data)
                else:
                    # Match ist alt und bereits gespeichert -> Überspringen!
                    pass

        print(f"🔗 {len(discovered)} Matches ab 2025 auf Startseite erkannt.")
        print(f"⚡ {len(matches_to_scrape)} Matches müssen aktiv gescannt werden (der Rest ist bereits sicher gespeichert).")

        # Alle entdeckten Matches einmal in der Übersichtstabelle speichern/aktualisieren
        for match in discovered:
            supabase.table("matches").upsert(
                {"id": match["id"], "name": match["name"]},
                on_conflict="id"
            ).execute()
            
        return matches_to_scrape

    except Exception as e:
        print(f"❌ Fehler bei der Match-Entdeckung: {e}")
        return []

def get_active_shooters():
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        return response.data
    except Exception as e:
        print(f"Fehler beim Laden der Profile: {e}")
        return []

def scrape_verify_list():
    # Holt NUR die Matches, die laut unserem Filter Zuwendung benötigen
    matches_to_process = discover_matches_automatically()

    if not matches_to_process:
        print("☕ Alles up to date. Keine alten Matches müssen geladen werden.")
        return

    shooters = get_active_shooters()
    if not shooters:
        print("ℹ️ Keine Schützen mit hinterlegtem Klarnamen gefunden.")
        return

    print(f"🚀 Starte Daten-Abgleich für {len(shooters)} Schütze(n) über {len(matches_to_process)} relevante Matches...")

    for match in matches_to_process:
        match_id = match["id"]
        match_name = match["name"]
        url = f"https://ipscmatch.de/matches/{match_id}/verify.html"

        try:
            response = requests.get(url, timeout=15)
            if response.status_code != 200:
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
                            print(f"   ⚡ Treffer erfasst: {shooter['real_name']} -> {payload['stage_name']} ({match_name})")
                        except Exception:
                            pass
        except Exception as conn_error:
            print(f"❌ Verbindung fehlgeschlagen für Match {match_id}: {conn_error}")

if __name__ == "__main__":
    scrape_verify_list()
