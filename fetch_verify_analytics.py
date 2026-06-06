import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import re
import urllib.parse
import io
import time
from bs4 import BeautifulSoup
from supabase import create_client, Client

try:
    from PyPDF2 import PdfReader
except ImportError:
    print("❌ Fehler: PyPDF2 ist nicht installiert! Bitte in der GitHub Action hinzufügen.")
    exit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fehler: Umgebungsvariablen nicht gesetzt!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

session = requests.Session()
retry = Retry(total=3, backoff_factor=2, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)

BASE_URL = "https://www.ipscmatch.de/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
TIMEOUT_SECONDS = 10

def clean_variants(name_part):
    """Erzeugt verschiedene Varianten für einen Namen, um PDF-Codierungsfehler (kaputte Umlaute) abzufangen."""
    part = name_part.lower().strip()
    variants = [
        re.sub(r'[^a-z0-9]', '', part), # Normal (fabian)
        re.sub(r'[^a-z0-9]', '', part.replace('ö','oe').replace('ä','ae').replace('ü','ue').replace('ß','ss')), # schoeps
        re.sub(r'[^a-z0-9]', '', part.replace('ö','o').replace('ä','a').replace('ü','u').replace('ß','s')), # schops
        re.sub(r'[^a-z0-9]', '', part.replace('ö','').replace('ä','').replace('ü','')) # schps (PDF-Bug)
    ]
    return [v for v in variants if v]

def name_matches(real_name, text_to_search):
    if not real_name or not text_to_search: return False
    text_clean = re.sub(r'[^a-z0-9]', '', text_to_search.lower())
    real_parts = [p.strip() for p in re.split(r'[\s,.-]+', real_name) if p.strip()]
    
    # Prüfe, ob von JEDEM Namensteil (Vor- und Nachname) eine der Schreibweisen im Text vorkommt
    for part in real_parts:
        part_variants = clean_variants(part)
        if not any(variant in text_clean for variant in part_variants):
            return False
    return True

def get_active_shooters():
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        shooters = [s for s in response.data if s.get("real_name") and str(s["real_name"]).strip() != ""]
        print(f"👥 INFO: Suche aktiv nach Schützen: {[s['real_name'] for s in shooters]}")
        return shooters
    except Exception as e:
        print(f"❌ Fehler beim Laden der Profile: {e}")
        return []

def parse_and_save_html_row(shooter_id, match_id, match_name, stage_title, cells, is_verify_mode):
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
    except Exception:
        pass

def parse_and_save_pdf_row(shooter_id, match_id, match_name, line_text):
    try:
        numbers = re.findall(r'\d+[.,]\d+', line_text)
        percentage, points = 0.0, 0.0
        
        if len(numbers) >= 2:
            percentage = float(numbers[0].replace(',', '.'))
            points = float(numbers[1].replace(',', '.'))
            
        payload = {
            "user_id": shooter_id, "match_id": str(match_id), "match_name": match_name,
            "stage_name": "Overall Match Results (PDF)", "scoring_type": "Comstock",
            "alphas": 0, "charlies": 0, "deltas": 0,
            "misses": 0, "no_shoots": 0, 
            "stage_time": percentage, 
            "hit_factor": points      
        }
        supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
    except Exception:
        pass

def load_master_page():
    print("🔍 Lade Gesamtliste...")
    url = "https://www.ipscmatch.de/index.pl?long=1"
    try:
        res = session.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)
        if res.status_code == 200: return BeautifulSoup(res.text, 'html.parser')
    except Exception:
        pass
    return None

def scrape_verify_list():
    shooters = get_active_shooters()
    if not shooters: return

    soup = load_master_page()
    if not soup: return

    matches_found = []

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        if len(tds) >= 4:
            text = row.get_text()
            if '2026' in text or '2027' in text:
                match_link = tds[3].find('a')
                if match_link:
                    m_name = match_link.text.strip()
                    href = match_link.get('href', '')
                    m_id = str(abs(hash(m_name)))
                    
                    if "match=" in href:
                        qs = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                        if 'match' in qs: m_id = qs['match'][0]
                    elif "/matches/" in href:
                        m_id = href.split("/matches/")[-1].split("/")[0].split("?")[0]
                        
                    result_links = []
                    for a in row.find_all('a', href=True):
                        l_href = a['href'].lower()
                        l_text = a.text.lower()
                        
                        if any(bad in l_text for bad in ['urkunden', 'team', 'category', 'region']): continue
                        if any(bad in l_href for bad in ['urkunden', 'team', 'category', 'region']): continue
                        
                        if any(good in l_href or good in l_text for good in ["results", "verify", ".pdf", "ergebnis", "overall"]):
                            result_links.append(urllib.parse.urljoin(BASE_URL, a['href']))
                    
                    if result_links:
                        matches_found.append({"id": m_id, "name": m_name, "links": result_links})

    print(f"📋 {len(matches_found)} Turniere gefunden. Starte Analyse...")

    for data in matches_found:
        m_id = data["id"]
        m_name = data["name"]
        
        visited_urls = set()
        links_queue = list(set(data["links"]))
        
        while links_queue:
            url = links_queue.pop(0)
            if url in visited_urls: continue
            visited_urls.add(url)
            
            print(f"   🔗 Scanne: {url}")
            time.sleep(0.1)
            
            try:
                res = session.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)
                if res.status_code != 200: continue
                
                content_type = res.headers.get('Content-Type', '').lower()
                
                # Wenn es ECHTE PDF-Daten sind, egal wie der Link heißt!
                if 'application/pdf' in content_type:
                    pdf_file = io.BytesIO(res.content)
                    reader = PdfReader(pdf_file)
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if not page_text: continue
                        for line in page_text.split('\n'):
                            for shooter in shooters:
                                if name_matches(shooter["real_name"], line):
                                    print(f"   🔥 {shooter['real_name']} in PDF gefunden! ({m_name})")
                                    parse_and_save_pdf_row(shooter["id"], m_id, m_name, line)
                
                # Wenn es eine HTML-Seite ist, suchen wir Tabellen UND weitere Links (wie "Overall")
                elif 'text/html' in content_type:
                    sub_soup = BeautifulSoup(res.text, 'html.parser')
                    
                    # 1. Neue Links finden
                    for a in sub_soup.find_all('a', href=True):
                        h_low = a['href'].lower()
                        t_low = a.text.lower()
                        if any(good in h_low or good in t_low for good in [".pdf", "ergebnis", "overall", "results", "stage"]):
                            new_url = urllib.parse.urljoin(BASE_URL, a['href'])
                            if any(bad in new_url.lower() for bad in ['urkunden', 'team', 'category', 'region']): continue
                            if new_url not in visited_urls and new_url not in links_queue:
                                links_queue.append(new_url)
                                
                    # 2. HTML Tabellen lesen
                    sub_rows = sub_soup.find_all('tr')
                    if len(sub_rows) >= 3:
                        is_verify = "verify" in url.lower()
                        title_el = sub_soup.find(['h1', 'h2', 'h3'])
                        stage_title = title_el.text.strip() if title_el else "Stage"
                        
                        for sub_row in sub_rows:
                            cells = sub_row.find_all('td')
                            if len(cells) < 7: continue
                            row_text = sub_row.get_text()
                            for shooter in shooters:
                                if name_matches(shooter["real_name"], row_text):
                                    print(f"   🔥 {shooter['real_name']} in HTML gefunden! ({m_name})")
                                    current_title = cells[2].text.strip() if is_verify else stage_title
                                    parse_and_save_html_row(shooter["id"], m_id, m_name, current_title, cells, is_verify_mode=is_verify)
            except Exception:
                pass
                
    print("🏁 Analyse erfolgreich beendet!")

if __name__ == "__main__":
    scrape_verify_list()
