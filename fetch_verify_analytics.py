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

def name_matches(real_name, web_name):
    """Prüft krisensicher, ob Vor- und Nachname unabhängig von der Reihenfolge matchen"""
    if not real_name or not web_name:
        return False
    # Zerlegt z.B. "Fabian Schöps" in ['fabian', 'schöps']
    real_parts = [p.strip().lower() for p in re.split(r'[\s,]+', real_name) if p.strip()]
    web_clean = web_name.lower()
    
    if not real_parts:
        return False
    # Prüft, ob JEDES einzelne Namenselement in der Tabellenzeile existiert
    return all(part in web_clean for part in real_parts)

def discover_matches_automatically():
    """Scant ipscmatch.de (inkl. Archiv) und importiert neue Matches ab dem 01.01.2023"""
    print("🔍 Suche auf ipscmatch.de nach Matches ab dem 01.01.2023...")
    stichtag = datetime(2023, 1, 1)
    
    urls_to_scan = [
        "https://ipscmatch.de/",
        "https://ipscmatch.de/index.pl?archiv=1",
        "https://ipscmatch.de/index.pl?action=archiv"
    ]
    
    discovered = []
    matches_to_scrape = []
    
    try:
        existing_response = supabase.table("matches").select("id").execute()
        existing_ids = [str(m["id"]) for m in existing_response.data] if existing_response.data else []

        for url in urls_to_scan:
            try:
                response = requests.get(url, timeout=15)
                if response.status_code != 200:
                    continue
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                for row in soup.find_all('tr'):
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
                        if match_id_str not in existing_ids or alter_in_tagen <= 14:
                            matches_to_scrape.append(match_data)
            except Exception:
                pass

        print(f"🔗 Insgesamt {len(discovered)} Matches seit 2023 im System/Archiv erkannt.")
        print(f"⚡ {len(matches_to_scrape)} Matches werden jetzt auf deine Treffer analysiert...")

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
    try:
        alphas, charlies, deltas, misses, no_shoots = 0, 0, 0, 0, 0
        scoring_type = "Comstock"

        if is_verify_mode:
            scoring_type = cells[3].text.strip()
            alphas = int(cells[4].text.strip())
            charlies = int(cells[5].text.strip())
            deltas = int(cells[6].text.strip())
            misses = int(cells[7].text.strip())
            no_shoots = int(cells[8].text.strip())
            stage_time = float(cells[9].text.strip().replace(',', '.'))
            hit_factor = float(cells[10].text.strip().replace(',', '.'))
        else:
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
        print(f"   ⚡ Treffer eingetragen: {real_name} -> {stage_title} ({match_name})")
    except Exception:
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
        
        # PLAN A: VERIFY.HTML
        url_verify = f"https://ipscmatch.de/matches/{match_id}/verify.html"
        response = requests.get(url_verify, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            for row in soup.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 11: continue
                web_name = cells[1].text.strip().lower()
                for shooter in shooters:
                    if name_matches(shooter["real_name"], web_name):
                        parse_and_save_row(shooter["id"], shooter["real_name"], match_id, match_name, cells[2].text.strip(), cells, is_verify_mode=True)
            continue

        # PLAN B: STAGE.HTML FALLBACK
        url_stage_root = f"https://ipscmatch.de/matches/{match_id}/stage.html"
        response_stage = requests.get(url_stage_root, timeout=10)
        if response_stage.status_code != 200: continue

        soup_stage = BeautifulSoup(response_stage.text, 'html.parser')
        stage_links = []
        for a in soup_stage.find_all('a', href=True):
            href = a['href']
            if 'stage_' in href.lower() or 'stg' in href.lower():
                if href not in stage_links: stage_links.append(href)

        if not stage_links: stage_links = ["stage.html"]

        for file_path in stage_links:
            url_sub_stage = f"https://ipscmatch.de/matches/{match_id}/{file_path}" if file_path != "stage.html" else url_stage_root
            res_sub = requests.get(url_sub_stage, timeout=10)
            if res_sub.status_code != 200: continue
            
            sub_soup = BeautifulSoup(res_sub.text, 'html.parser')
            title_el = sub_soup.find(['h1', 'h2', 'h3'])
            stage_title = title_el.text.strip() if title_el else f"Stage ({file_path.split('.')[0]})"

            for row in sub_soup.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 9: continue
                
                web_name = cells[1].text.strip().lower()
                for shooter in shooters:
                    if name_matches(shooter["real_name"], web_name):
                        parse_and_save_row(shooter["id"], shooter["real_name"], match_id, match_name, stage_title, cells, is_verify_mode=False)

if __name__ == "__main__":
    scrape_verify_list()
