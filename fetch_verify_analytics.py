import os
import requests
import re
import urllib.parse
from bs4 import BeautifulSoup
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fehler: Umgebungsvariablen nicht gesetzt!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_URL = "https://www.ipscmatch.de/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

def clean_and_normalize(text):
    if not text: return ""
    text = text.lower().strip()
    text = text.replace("ö", "oe").replace("ä", "ae").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r'[^a-z0-9]', '', text)

def name_matches(real_name, text_to_search):
    if not real_name or not text_to_search:
        return False
    real_parts = [p.strip() for p in re.split(r'[\s,]+', real_name) if p.strip()]
    search_normalized = clean_and_normalize(text_to_search)
    if not real_parts:
        return False
    return all(clean_and_normalize(part) in search_normalized for part in real_parts)

def discover_matches_automatically():
    print("🔍 Starte Match-Discovery auf ipscmatch.de ab 2023...")
    urls_to_scan = [
        "https://www.ipscmatch.de/",
        "https://www.ipscmatch.de/index.pl?archiv=1",
        "https://www.ipscmatch.de/index.pl?action=archiv"
    ]
    matches_to_scrape = []
    seen_ids = set()
    
    for url in urls_to_scan:
        try:
            response = requests.get(url, headers=HEADERS, timeout=25)
            if response.status_code != 200: continue
            soup = BeautifulSoup(response.text, 'html.parser')
            for row in soup.find_all('tr'):
                tds = row.find_all('td')
                if len(tds) >= 6:
                    datum_raw = tds[5].text.strip()
                    year_match = re.search(r'\b(202[3-7])\b', datum_raw)
                    if not year_match or int(year_match.group(1)) < 2023: continue
                        
                    match_link = tds[3].find('a')
                    if not match_link: continue
                        
                    href = match_link.get('href', '')
                    match_id = None
                    if "match=" in href:
                        parsed_url = urllib.parse.urlparse(href)
                        query_params = urllib.parse.parse_qs(parsed_url.query)
                        if 'match' in query_params: match_id = query_params['match'][0]
                    elif "/matches/" in href:
                        match_id = href.split("/matches/")[-1].split("/")[0].split("?")[0]

                    if match_id and match_id not in seen_ids:
                        seen_ids.add(match_id)
                        matches_to_scrape.append({"id": str(match_id), "name": f"{match_link.text.strip()} ({datum_raw})"})
        except Exception as e:
            print(f"   ⚠️ Fehler beim Scannen von {url}: {e}")
            
    print(f"📋 Discovery beendet. {len(matches_to_scrape)} Turniere ab 2023 im System erkannt.")
    return matches_to_scrape

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

        if is_verify_mode and len(cells) >= 11:
            scoring_type = cells[3].text.strip()
            alphas = int(cells[4].text.strip())
            charlies = int(cells[5].text.strip())
            deltas = int(cells[6].text.strip())
            misses = int(cells[7].text.strip())
            no_shoots = int(cells[8].text.strip())
            stage_time = float(cells[9].text.strip().replace(',', '.'))
            hit_factor = float(cells[10].text.strip().replace(',', '.'))
        elif len(cells) >= 9:
            stage_time = float(cells[6].text.strip().replace(',', '.'))
            hit_factor = float(cells[8].text.strip().replace(',', '.'))
        else:
            return

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
        print(f"      🎯 -> TREFFER ERFOLGREICH IMPORTIERT: {stage_title} ({match_name})")
    except Exception as e:
        print(f"      ❌ Datenbank-Fehler beim Speichern: {e}")

def scrape_verify_list():
    shooters = get_active_shooters()
    print(f"👤 Geladene Profile aus Supabase: {shooters}")
    if not shooters: return

    matches_to_process = discover_matches_automatically()
    print(f"⚡ Überprüfe Ergebnisdateien direkt über kugelgelenkte Pfade...")

    # Alle gängigen Bezeichnungen für Ergebnisdateien
    filenames_to_try = ["verify.html", "verify.htm", "stage.html", "stages.html", "overall.html"]

    for match in matches_to_process:
        match_id = match["id"]
        match_name = match["name"]
        
        for filename in filenames_to_try:
            url = f"https://www.ipscmatch.de/matches/{match_id}/{filename}"
            try:
                response = requests.get(url, headers=HEADERS, timeout=6)
                if response.status_code != 200: continue
                
                soup = BeautifulSoup(response.text, 'html.parser')
                rows = soup.find_all('tr')
                
                # Wenn eine Seite weniger als 3 Tabellenzeilen hat, ist es eine leere Dummy-Seite
                if len(rows) < 3: continue
                
                print(f"🟢 Datei erfolgreich geöffnet: {match_id}/{filename} ({len(rows)} Zeilen)")
                is_verify = "verify" in filename
                
                title_el = soup.find(['h1', 'h2', 'h3'])
                stage_title = title_el.text.strip() if title_el else "Stage"

                for row in rows:
                    cells = row.find_all('td')
                    min_len = 11 if is_verify else 7
                    if len(cells) < min_len: continue
                    
                    row_text = row.get_text()
                    for shooter in shooters:
                        if name_matches(shooter["real_name"], row_text):
                            print(f"   🔥 Schütze '{shooter['real_name']}' im Dokument erkannt!")
                            current_title = cells[2].text.strip() if is_verify else stage_title
                            parse_and_save_row(shooter["id"], shooter["real_name"], match_id, match_name, current_title, cells, is_verify_mode=is_verify)
            except Exception:
                pass

if __name__ == "__main__":
    scrape_verify_list()
