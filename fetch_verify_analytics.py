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

# Die exakte Konfiguration deines funktionierenden Scrapers!
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

def get_active_shooters():
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        return response.data
    except Exception as e:
        print(f"❌ Fehler beim Laden der Profile aus Supabase: {e}")
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
        print(f"      🎯 -> TREFFER ERFOLGREICH IN SUPABASE GESPEICHERT: {stage_title} ({match_name})")
    except Exception as e:
        print(f"      ❌ Fehler beim Speichern einer Zeile in Supabase: {e}")

def scrape_verify_list():
    shooters = get_active_shooters()
    print(f"👤 Geladene Profile aus Supabase: {shooters}")
    if not shooters: return

    print("🔍 Starte kugelgelenkte Match-Discovery (Spiegelung zu fetch_matches.py)...")
    url = "https://www.ipscmatch.de/"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code != 200:
            print(f"❌ Hauptseite nicht erreichbar. Status: {response.status_code}")
            return
            
        soup = BeautifulSoup(response.text, 'html.parser')
        matches_found = []
        
        # Durchsucht die Tabelle exakt wie dein funktionierender Scraper
        for row in soup.find_all('tr'):
            tds = row.find_all('td')
            if len(tds) >= 8:
                match_link = tds[3].find('a')
                if not match_link: continue
                
                match_name = match_link.text.strip()
                href = match_link.get('href', '')
                
                match_id = None
                if "match=" in href:
                    parsed_url = urllib.parse.urlparse(href)
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    if 'match' in query_params: 
                        match_id = query_params['match'][0]
                elif "/matches/" in href:
                    match_id = href.split("/matches/")[-1].split("/")[0].split("?")[0]
                    
                if match_id:
                    matches_found.append({"id": match_id, "name": match_name})
                    
        print(f"📋 {len(matches_found)} aktuelle Turniere auf der Hauptseite erkannt.")
        
        # Mögliche Ergebnis-Dateien, die direkt im Match-Ordner liegen
        filenames_to_try = ["verify.html", "verify.htm", "overall.html", "overall.htm", "stage.html"]
        
        for match in matches_found:
            m_id = match["id"]
            m_name = match["name"]
            
            for filename in filenames_to_try:
                res_url = f"https://www.ipscmatch.de/matches/{m_id}/{filename}"
                try:
                    # Jede einzelne Abfrage wird isoliert probiert, damit nichts den Scraper crasht
                    res_sub = requests.get(res_url, headers=HEADERS, timeout=8)
                    if res_sub.status_code == 200:
                        sub_soup = BeautifulSoup(res_sub.text, 'html.parser')
                        sub_rows = sub_soup.find_all('tr')
                        
                        if len(sub_rows) < 3: continue  # Überspringt leere Dummy-Seiten
                        
                        print(f"🟢 Ergebnisliste geöffnet: {m_id}/{filename} ({len(sub_rows)} Zeilen)")
                        is_verify = "verify" in filename
                        
                        title_el = sub_soup.find(['h1', 'h2', 'h3'])
                        stage_title = title_el.text.strip() if title_el else "Stage"
                        
                        for sub_row in sub_rows:
                            cells = sub_row.find_all('td')
                            min_len = 11 if is_verify else 7
                            if len(cells) < min_len: continue
                            
                            row_text = sub_row.get_text()
                            for shooter in shooters:
                                if name_matches(shooter["real_name"], row_text):
                                    print(f"   🔥 Schütze '{shooter['real_name']}' im Dokument erkannt!")
                                    current_title = cells[2].text.strip() if is_verify else stage_title
                                    parse_and_save_row(shooter["id"], shooter["real_name"], m_id, m_name, current_title, cells, is_verify_mode=is_verify)
                except Exception:
                    pass  # Falls eine Datei fehlt oder hakt, nahtlos mit der nächsten weitermachen
                    
    except Exception as e:
        print(f"❌ Fataler Fehler im Haupt-Scraper-Loop: {e}")

if __name__ == "__main__":
    scrape_verify_list()
