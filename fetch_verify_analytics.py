import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
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

# --- STOSSDÄMPFER FÜR GITHUB-NETZWERKAUSFÄLLE ---
session = requests.Session()
retry = Retry(total=5, backoff_factor=1, status_forcelist=[ 500, 502, 503, 504 ])
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)

BASE_URL = "https://www.ipscmatch.de/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def clean_and_normalize(text):
    if not text: return ""
    text = text.lower().strip()
    text = text.replace("ö", "oe").replace("ä", "ae").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r'[^a-z0-9]', '', text)

def name_matches(real_name, text_to_search):
    if not real_name or not text_to_search: return False
    real_parts = [p.strip() for p in re.split(r'[\s,]+', real_name) if p.strip()]
    search_normalized = clean_and_normalize(text_to_search)
    return all(clean_and_normalize(part) in search_normalized for part in real_parts) if real_parts else False

def get_active_shooters():
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        return response.data
    except Exception as e:
        print(f"❌ Fehler beim Laden der Profile: {e}")
        return []

def parse_and_save_row(shooter_id, real_name, match_id, match_name, stage_title, cells, is_verify_mode):
    try:
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
            scoring_type = "Comstock"
            alphas, charlies, deltas, misses, no_shoots = 0, 0, 0, 0, 0
            try:
                stage_time = float(cells[6].text.strip().replace(',', '.'))
                hit_factor = float(cells[8].text.strip().replace(',', '.'))
            except:
                stage_time = float(cells[5].text.strip().replace(',', '.'))
                hit_factor = float(cells[7].text.strip().replace(',', '.'))
        else:
            return

        payload = {
            "user_id": shooter_id, "match_id": str(match_id), "match_name": match_name,
            "stage_name": stage_title, "scoring_type": scoring_type,
            "alphas": alphas, "charlies": charlies, "deltas": deltas,
            "misses": misses, "no_shoots": no_shoots, "stage_time": stage_time, "hit_factor": hit_factor
        }

        supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
        print(f"      🎯 TREFFER GESPEICHERT: {stage_title} ({match_name})")
    except:
        pass

def load_master_page():
    print("🔍 Lade die magische Gesamtliste (long=1)...")
    url = "https://www.ipscmatch.de/index.pl?long=1"
    try:
        res = session.get(url, headers=HEADERS, timeout=20)
        if res.status_code == 200:
            print("✅ Gesamtliste erfolgreich geladen!")
            return BeautifulSoup(res.text, 'html.parser')
    except Exception as e:
        print(f"❌ Netzwerkfehler bei Gesamtliste: {e}")
    return None

def scrape_verify_list():
    shooters = get_active_shooters()
    if not shooters: return

    soup = load_master_page()
    if not soup: return

    matches_found = {}

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        if len(tds) >= 4:
            text = row.get_text()
            # Nur relevante Jahre ab 2023 scannen
            if any(y in text for y in ['2023', '2024', '2025', '2026', '2027']):
                match_link = tds[3].find('a')
                if match_link:
                    m_name = match_link.text.strip()
                    href = match_link.get('href', '')
                    m_id = None
                    
                    if "match=" in href:
                        qs = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                        if 'match' in qs: m_id = qs['match'][0]
                    elif "/matches/" in href:
                        m_id = href.split("/matches/")[-1].split("/")[0].split("?")[0]
                        
                    if m_id and m_id not in matches_found:
                        result_links = []
                        # Sammelt alle Links, die ganz hinten in der Spalte für Ergebnisse stehen
                        for a in row.find_all('a', href=True):
                            l_href = a['href'].lower()
                            if "/matches/" in l_href and "match=" not in l_href:
                                result_links.append(urllib.parse.urljoin(BASE_URL, a['href']))
                        
                        matches_found[m_id] = {"name": m_name, "links": result_links}

    print(f"📋 {len(matches_found)} Turniere seit 2023 gefunden. Analysiere Ergebnis-Links...")

    for m_id, data in matches_found.items():
        m_name = data["name"]
        row_links = data["links"]
        
        # Falls die Seite keine Links in der Spalte hat, probieren wir unsere Standard-Pfade
        links_to_check = row_links if row_links else [
            f"https://www.ipscmatch.de/matches/{m_id}/verify.html",
            f"https://www.ipscmatch.de/matches/{m_id}/overall.html"
        ]
        
        for url in links_to_check:
            if '.pdf' in url.lower():
                print(f"   📄 PDF gefunden für {m_name} (wird übersprungen)")
                continue
                
            try:
                res_sub = session.get(url, headers=HEADERS, timeout=8)
                if res_sub.status_code == 200:
                    sub_soup = BeautifulSoup(res_sub.text, 'html.parser')
                    sub_rows = sub_soup.find_all('tr')
                    if len(sub_rows) < 3: continue
                    
                    print(f"🟢 HTML-Liste geöffnet: {url}")
                    is_verify = "verify" in url.lower()
                    
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
