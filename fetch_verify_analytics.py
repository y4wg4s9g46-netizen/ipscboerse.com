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

def get_active_shooters():
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        return response.data
    except Exception as e:
        print(f"❌ Fehler beim Laden der Profile: {e}")
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
        elif len(cells) >= 8:
            try:
                stage_time = float(cells[6].text.strip().replace(',', '.'))
                hit_factor = float(cells[8].text.strip().replace(',', '.'))
            except Exception:
                stage_time = float(cells[5].text.strip().replace(',', '.'))
                hit_factor = float(cells[7].text.strip().replace(',', '.'))
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
        print(f"      🎯 TREFFER GESPEICHERT: {stage_title} ({match_name})")
    except Exception as e:
        print(f"      ❌ Fehler beim Speichern: {e}")

def scrape_verify_list():
    shooters = get_active_shooters()
    if not shooters: return

    print("🔍 Suche Match-IDs im Archiv und auf der Hauptseite...")
    
    # Wir durchkämmen das Archiv für die echten, vergangenen Turniere!
    urls_to_scan = [
        "https://www.ipscmatch.de/",
        "https://www.ipscmatch.de/index.pl?action=archiv"
    ]
    
    matches_found = {}

    for url in urls_to_scan:
        try:
            res = requests.get(url, headers=HEADERS, timeout=20)
            if res.status_code != 200: continue
            
            soup = BeautifulSoup(res.text, 'html.parser')
            
            # Panzerknacker: Egal wie viele Spalten, wir lesen einfach den ganzen Text
            for row in soup.find_all('tr'):
                text = row.get_text()
                
                # Wir greifen uns alle Turniere der letzten und aktuellen Jahre
                if any(y in text for y in ['2023', '2024', '2025', '2026']):
                    for a in row.find_all('a', href=True):
                        href = a['href']
                        match_id = None
                        
                        if "match=" in href:
                            parsed = urllib.parse.urlparse(href)
                            qs = urllib.parse.parse_qs(parsed.query)
                            if 'match' in qs: match_id = qs['match'][0]
                        elif "/matches/" in href:
                            match_id = href.split("/matches/")[-1].split("/")[0].split("?")[0]
                            
                        if match_id and match_id not in matches_found:
                            matches_found[match_id] = a.text.strip() or match_id
        except Exception as e:
            print(f"⚠️ Fehler auf Übersichtsseite {url}: {e}")

    print(f"📋 {len(matches_found)} Turniere seit 2023 gefunden. Lese Ergebnisse aus...")

    # Sucht alle gängigen Datei-Namen für Ergebnisse
    filenames_to_try = ["verify.html", "verify.htm", "overall.html", "overall.htm", "stage.html", "stages.html"]

    for m_id, m_name in matches_found.items():
        for filename in filenames_to_try:
            try:
                res_url = f"https://www.ipscmatch.de/matches/{m_id}/{filename}"
                res_sub = requests.get(res_url, headers=HEADERS, timeout=5)
                
                if res_sub.status_code == 200:
                    sub_soup = BeautifulSoup(res_sub.text, 'html.parser')
                    sub_rows = sub_soup.find_all('tr')
                    if len(sub_rows) < 3: continue
                    
                    print(f"🟢 Datei geöffnet: {m_id}/{filename}")
                    is_verify = "verify" in filename
                    
                    title_el = sub_soup.find(['h1', 'h2', 'h3'])
                    stage_title = title_el.text.strip() if title_el else "Stage"
                    
                    for sub_row in sub_rows:
                        cells = sub_row.find_all('td')
                        if len(cells) < 7: continue
                        
                        row_text = sub_row.get_text()
                        for shooter in shooters:
                            if name_matches(shooter["real_name"], row_text):
                                print(f"   🔥 Schütze {shooter['real_name']} erkannt!")
                                current_title = cells[2].text.strip() if is_verify else stage_title
                                parse_and_save_row(shooter["id"], shooter["real_name"], m_id, m_name, current_title, cells, is_verify_mode=is_verify)
            except Exception:
                pass

if __name__ == "__main__":
    scrape_verify_list()
