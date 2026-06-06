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

# Bekannte IPSC Divisionen für die automatische Erkennung
KNOWN_DIVISIONS = ["Production Optics", "Optics", "Production", "Standard", "Open", "Classic", "Revolver", "PCC", "Modified"]

def clean_variants(name_part):
    part = name_part.lower().strip()
    variants = [
        re.sub(r'[^a-z0-9]', '', part),
        re.sub(r'[^a-z0-9]', '', part.replace('ö','oe').replace('ä','ae').replace('ü','ue').replace('ß','ss')),
        re.sub(r'[^a-z0-9]', '', part.replace('ö','o').replace('ä','a').replace('ü','u').replace('ß','s')),
        re.sub(r'[^a-z0-9]', '', part.replace('ö','').replace('ä','').replace('ü',''))
    ]
    return [v for v in variants if v]

def name_matches(real_name, text_to_search):
    if not real_name or not text_to_search: return False
    text_clean = re.sub(r'[^a-z0-9]', '', text_to_search.lower())
    real_parts = [p.strip() for p in re.split(r'[\s,.-]+', real_name) if p.strip()]
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

def extract_float(text):
    try:
        return float(re.sub(r'[^0-9,.]', '', text).replace(',', '.'))
    except:
        return 0.0

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
                        
                        # Wir suchen jetzt auch explizit nach "stage" Ergebnissen!
                        if any(good in l_href or good in l_text for good in ["results", "verify", ".pdf", "ergebnis", "overall", "stage"]):
                            result_links.append(urllib.parse.urljoin(BASE_URL, a['href']))
                    
                    if result_links:
                        matches_found.append({"id": m_id, "name": m_name, "links": result_links})

    print(f"📋 {len(matches_found)} Turniere gefunden. Starte smarte Analyse...")

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
                
                if 'application/pdf' in content_type:
                    pdf_file = io.BytesIO(res.content)
                    reader = PdfReader(pdf_file)
                    current_div_pdf = "Unknown"
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if not page_text: continue
                        for line in page_text.split('\n'):
                            # Versuche Division aus PDF-Header zu lesen
                            for div in KNOWN_DIVISIONS:
                                if div.upper() in line.upper():
                                    current_div_pdf = div
                                    break
                                    
                            for shooter in shooters:
                                if name_matches(shooter["real_name"], line):
                                    numbers = re.findall(r'\d+[.,]\d+', line)
                                    percentage, points = 0.0, 0.0
                                    if len(numbers) >= 2:
                                        percentage = float(numbers[0].replace(',', '.'))
                                        points = float(numbers[1].replace(',', '.'))
                                        
                                    payload = {
                                        "user_id": shooter["id"], "match_id": str(m_id), "match_name": m_name,
                                        "stage_name": "Overall Match Results (PDF)", "scoring_type": "Comstock",
                                        "stage_time": percentage, "hit_factor": points,
                                        "division": current_div_pdf
                                    }
                                    supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
                                    print(f"   🔥 {shooter['real_name']} in PDF gefunden! ({current_div_pdf} - {percentage}%)")
                
                elif 'text/html' in content_type:
                    sub_soup = BeautifulSoup(res.text, 'html.parser')
                    
                    # Links sammeln
                    for a in sub_soup.find_all('a', href=True):
                        h_low = a['href'].lower()
                        t_low = a.text.lower()
                        if any(good in h_low or good in t_low for good in [".pdf", "ergebnis", "overall", "results", "stage"]):
                            new_url = urllib.parse.urljoin(BASE_URL, a['href'])
                            if any(bad in new_url.lower() for bad in ['urkunden', 'team', 'category', 'region']): continue
                            if new_url not in visited_urls and new_url not in links_queue:
                                links_queue.append(new_url)
                                
                    # --- SMART HTML PARSER ---
                    current_division = "Unknown"
                    current_stage_title = "Stage"
                    current_winner_hf = 0.0
                    is_verify = "verify" in url.lower()

                    for el in sub_soup.find_all(['h1', 'h2', 'h3', 'h4', 'tr']):
                        text = el.get_text().strip()
                        
                        # 1. Überschriften scannen (Division & Stage erkennen)
                        if el.name in ['h1', 'h2', 'h3', 'h4']:
                            for div in KNOWN_DIVISIONS:
                                if div.lower() in text.lower():
                                    current_division = div
                                    break
                            if "stage" in text.lower():
                                current_stage_title = text
                                current_winner_hf = 0.0 # Reset für neue Stage
                            continue
                            
                        # 2. Tabellen-Zeilen (tr) scannen
                        if el.name == 'tr':
                            cells = el.find_all(['td', 'th'])
                            if not cells: continue
                            
                            # Manchmal steht die Division in einer breiten Tabellenzeile
                            if len(cells) == 1:
                                for div in KNOWN_DIVISIONS:
                                    if div.lower() in cells[0].get_text().lower():
                                        current_division = div
                                        current_winner_hf = 0.0
                                        break
                                continue
                                
                            if len(cells) < 7: continue
                            
                            # Werte auslesen
                            row_text = el.get_text()
                            rank_str = cells[0].get_text().strip().replace('.', '')
                            
                            # HFs finden (unterschiedliche Spalten je nach HTML)
                            hf = 0.0
                            if len(cells) >= 11: hf = extract_float(cells[10].text)
                            elif len(cells) >= 8: hf = extract_float(cells[8].text) if cells[8].text else extract_float(cells[7].text)

                            # Wenn es Platz 1 ist, merke dir den Sieger-Hit-Factor!
                            if rank_str == '1' or rank_str == '100,00':
                                if hf > 0: current_winner_hf = hf

                            # Wenn wir den Schützen finden -> Speichern!
                            for shooter in shooters:
                                if name_matches(shooter["real_name"], row_text):
                                    stage_name_to_save = cells[2].text.strip() if is_verify else current_stage_title
                                    
                                    # Fallback für Rank, wenn leer
                                    rank_val = int(rank_str) if rank_str.isdigit() else 0
                                    
                                    payload = {
                                        "user_id": shooter["id"], "match_id": str(m_id), "match_name": m_name,
                                        "stage_name": stage_name_to_save, "scoring_type": "Comstock",
                                        "hit_factor": hf,
                                        "division": current_division,
                                        "stage_rank": rank_val,
                                        "winner_hit_factor": current_winner_hf
                                    }
                                    
                                    # Optionale Details speichern
                                    try:
                                        if len(cells) >= 11:
                                            payload["alphas"] = int(cells[4].text.strip())
                                            payload["charlies"] = int(cells[5].text.strip())
                                            payload["deltas"] = int(cells[6].text.strip())
                                            payload["misses"] = int(cells[7].text.strip())
                                            payload["stage_time"] = extract_float(cells[9].text)
                                    except: pass

                                    supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
                                    print(f"   🎯 {shooter['real_name']} gespeichert! (Stage: {stage_name_to_save} | Div: {current_division} | Rank: {rank_val} | HF: {hf} | Winner-HF: {current_winner_hf})")
            except Exception as e:
                pass
                
    print("🏁 Smart-Analyse erfolgreich beendet!")

if __name__ == "__main__":
    scrape_verify_list()
