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
        existing_response = supabase.table("matches").select("id").execute()
        existing_ids = [str(m["id"]) for m in existing_response.data] if existing_response.data else []

        response = requests.get(base_url, timeout=15)
        if response.status_code != 200:
            print("❌ Startseite von ipscmatch.de konnte nicht geladen werden.")
            return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        discovered = []
        matches_to_scrape = []

        for row in soup.find_all('tr'):
            cells = row.find_all('td')
            row_text = row.get_text()
            
            date_match = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', row_text)
            if not date_match:
                continue
                
            tag, monat, jahr = map(int, date_match.groups())
            try:
                match_date = datetime(jahr, monat, tag)
            except ValueError:
                continue
            
            if match_date < stichtag:
                continue

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

                alter_in_tagen = (datetime.now() - match_date).days
                if match_id_str not in existing_ids or alter_in_tagen <= 7:
                    matches_to_scrape.append(match_data)

        print(f"🔗 {len(discovered)} Matches ab 2025 erkannt.")
        print(f"⚡ {len(matches_to_scrape)} Matches werden aktiv überprüft.")

        for match in discovered:
            supabase.table("matches").upsert({"id": match["id"], "name": match["name"]}, on_conflict="id").execute()
            
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

def parse_and_save_row(shooter_id, real_name, match_id, match_name, stage_title, cells, is_verify_mode):
    """Verarbeitet eine Tabellenzeile und speichert sie in Supabase"""
    try:
        # Standard-Werte für Fallback-Modus (Stage-Ergebnisse ohne A/C/D-Details)
        alphas, charlies, deltas, misses, no_shoots = 0, 0, 0, 0, 0
        scoring_type = "Comstock"

        if is_verify_mode:
            # Zeilen-Index für verify.html (A, C, D, M, NS vorhanden)
            scoring_type = cells[3].text.strip()
            alphas = int(cells[4].text.strip())
            charlies = int(cells[5].text.strip())
            deltas = int(cells[6].text.strip())
            misses = int(cells[7].text.strip())
            no_shoots = int(cells[8].text.strip())
            stage_time = float(cells[9].text.strip().replace(',', '.'))
            hit_factor = float(cells[10].text.strip().replace(',', '.'))
        else:
            # Zeilen-Index für die standardmäßige stage.html (WinMSS Export Layout)
            # Spalten: Pos | Name | Reg | Sq | Div | Cat | Time | Pts | HitF
            stage_time = float(cells[6].text.strip().replace(',', '.'))
            hit_factor = float(cells[8].text.strip().replace(',', '.'))

        payload = {
            "user_id": shooter_id, 
            "match_id": str(match_id),
            "match_name": match_name,
            "stage_name": stage_title,
            "scoring_type": scoring_type,
            "alphas": alphas,
            "charlies": charlies,
            "deltas": deltas,
            "misses": misses,
            "no_shoots": no_shoots,
            "stage_time": stage_time,
            "hit_factor": hit_factor
        }

        supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
        print(f"   ⚡ Daten erfasst ({'Verify' if is_verify_mode else 'Stage-Liste'}): {real_name} -> {stage_title}")
    except Exception as e:
        pass

def scrape_verify_list():
    matches_to_process = discover_matches_automatically()
    if not matches_to_process:
        print("☕ Alles up to date.")
        return

    shooters = get_active_shooters()
    if not shooters:
        print("ℹ️ Keine Schützen mit hinterlegtem Klarnamen gefunden.")
        return

    for match in matches_to_process:
        match_id = match["id"]
        match_name = match["name"]
        
        # ─── PLAN A: VERSUCHE VERIFY.HTML (Volle Daten) ───
        url_verify = f"https://ipscmatch.de/matches/{match_id}/verify.html"
        print(f"Scanne Match {match_id} (Plan A: Verify)...")
        response = requests.get(url_verify, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            for row in soup.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 11: continue
                web_name = cells[1].text.strip().lower()
                for shooter in shooters:
                    if shooter["real_name"].lower() in web_name:
                        parse_and_save_row(shooter["id"], shooter["real_name"], match_id, match_name, cells[2].text.strip(), cells, is_verify_mode=True)
            continue # Gefunden und verarbeitet, weiter zum nächsten Match!

        # ─── PLAN B: FALLBACK AUF STAGE.HTML (Immer verfügbar!) ───
        print(f"ℹ️ Plan A nicht verfügbar für Match {match_id}. Wechsle auf Plan B (Stage-Ergebnisse)...")
        url_stage_root = f"https://ipscmatch.de/matches/{match_id}/stage.html"
        response_stage = requests.get(url_stage_root, timeout=10)
        
        if response_stage.status_code != 200:
            continue # Match hat keinerlei HTML-Ergebnisse online

        soup_stage = BeautifulSoup(response_stage.text, 'html.parser')
        
        # Sammle alle Links zu den einzelnen Stages (z.B. stage_01.html, stg_1.html)
        stage_links = []
        for a in soup_stage.find_all('a', href=True):
            href = a['href']
            if 'stage_' in href.lower() or 'stg' in href.lower():
                if href not in stage_links: stage_links.append(href)

        # Falls die Tabelle direkt auf der Hauptseite eingebettet ist
        if not stage_links:
            stage_links = ["stage.html"]

        # Scrape jede einzelne Unter-Stage
        for file_path in stage_links:
            url_sub_stage = f"https://ipscmatch.de/matches/{match_id}/{file_path}" if file_path != "stage.html" else url_stage_root
            res_sub = requests.get(url_sub_stage, timeout=10)
            if res_sub.status_code != 200: continue
            
            sub_soup = BeautifulSoup(res_sub.text, 'html.parser')
            
            # Ermittle den Stage Namen aus der Überschrift (h1, h2, h3)
            title_el = sub_soup.find(['h1', 'h2', 'h3'])
            stage_title = title_el.text.strip() if title_el else f"Stage ({file_path.split('.')[0]})"

            for row in sub_soup.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 9: continue # Standard WinMSS Stage-Tabelle hat mind. 9 Spalten
                
                web_name = cells[1].text.strip().lower()
                for shooter in shooters:
                    if shooter["real_name"].lower() in web_name:
                        parse_and_save_row(shooter["id"], shooter["real_name"], match_id, match_name, stage_title, cells, is_verify_mode=False)

if __name__ == "__main__":
    scrape_verify_list()
