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
retry = Retry(total=5, backoff_factor=3, status_forcelist=[403, 429, 500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)

BASE_URL = "https://www.ipscmatch.de/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive"
}
TIMEOUT_SECONDS = 30
PAUSE_SECONDS = 30  # ⏳ Dauer der Pause nach 20 PDFs in Sekunden

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

# --- NEU: Erweiterte Funktion für Schützen & Cache laden ---
def get_active_shooters():
    try:
        # Lade 'history_scanned' mit, um neue User zu erkennen
        response = supabase.table("profiles").select("id, real_name, history_scanned").not_.is_("real_name", "null").execute()
        shooters = [s for s in response.data if s.get("real_name") and str(s["real_name"]).strip() != ""]
        
        # Filtern: Wer ist komplett neu?
        new_shooters = [s for s in shooters if s.get("history_scanned") is False]
        
        print(f"👥 INFO: {len(shooters)} aktive Schützen gesamt. Davon {len(new_shooters)} NEUE Schützen.")
        return shooters, new_shooters
    except Exception as e:
        print(f"❌ Fehler beim Laden der Profile: {e}")
        return [], []

def load_url_cache():
    print("🔍 Lade Cache aus Supabase...")
    try:
        response = supabase.table("scrape_cache").select("url, last_modified").execute()
        return {row["url"]: row["last_modified"] for row in response.data}
    except Exception as e:
        print(f"⚠️ Konnte Cache nicht laden (Existiert die Tabelle 'scrape_cache'?): {e}")
        return {}
# -----------------------------------------------------------

def extract_float(text):
    try:
        return float(re.sub(r'[^0-9,.-]', '', text).replace(',', '.'))
    except:
        return 0.0

def load_master_page():
    print("🔍 Verbinde mit IPSC-Server und lade Gesamtliste...")
    url = "https://www.ipscmatch.de/index.pl?long=1"
    try:
        res = session.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)
        if res.status_code == 200: 
            print("✅ Hauptseite erfolgreich geladen!")
            return BeautifulSoup(res.text, 'html.parser')
        else:
            print(f"❌ Server hat uns geblockt! HTTP-Status: {res.status_code}")
    except Exception as e:
        print(f"❌ Netzwerkfehler beim Laden der Liste: {e}")
    return None

def scrape_verify_list():
    shooters, new_shooters = get_active_shooters()
    if not shooters: return
    
    url_cache = load_url_cache()

    soup = load_master_page()
    if not soup: return

    matches_found = []

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        if len(tds) >= 4:
            text = row.get_text()
            if any(year in text for year in ['2023', '2024', '2025', '2026', '2027']):
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
                        
                        if any(good in l_href or good in l_text for good in ["results", "verify", ".pdf", "ergebnis", "overall", "stage"]):
                            result_links.append(urllib.parse.urljoin(BASE_URL, a['href']))
                    
                    if result_links:
                        matches_found.append({"id": m_id, "name": m_name, "links": result_links})

    print(f"📋 {len(matches_found)} Turniere gefunden. Starte smarte Analyse...")

    pdf_count = 0  

    for data in matches_found:
        m_id = data["id"]
        m_name = data["name"]
        
        visited_urls = set()
        links_queue = list(set(data["links"]))
        
        while links_queue:
            url = links_queue.pop(0)
            if url in visited_urls: continue
            visited_urls.add(url)
            
            try:
                # --- NEU: INTELLIGENTER CACHE CHECK ---
                head_res = session.head(url, headers=HEADERS, timeout=TIMEOUT_SECONDS, allow_redirects=True)
                server_last_modified = head_res.headers.get('Last-Modified', '') if head_res.status_code == 200 else ''
                
                is_modified = True
                if head_res.status_code == 200 and url in url_cache and url_cache[url] == server_last_modified and server_last_modified != '':
                    is_modified = False
                
                has_new_users = len(new_shooters) > 0
                
                if not is_modified and not has_new_users:
                    print(f"   ⏩ Überspringe (bereits aktuell & keine neuen User): {url}")
                    continue
                
                if not is_modified and has_new_users:
                    current_search_shooters = new_shooters
                    print(f"   🕵️‍♂️ {url} -> Datei ist alt, durchsuche NUR nach {len(new_shooters)} neuen Usern.")
                else:
                    current_search_shooters = shooters
                    print(f"   ⬇️ {url} -> Lade Datei neu (Geändert oder noch nicht im Cache).")
                    time.sleep(0.5)

                # --- START DOWNLOAD ---
                res = session.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)
                if res.status_code != 200: continue
                
                content_type = res.headers.get('Content-Type', '').lower()
                
                # --- PDF SMART PARSER ---
                if 'application/pdf' in content_type:
                    pdf_count += 1  
                    
                    pdf_file = io.BytesIO(res.content)
                    reader = PdfReader(pdf_file)
                    
                    current_div_pdf = "Unknown"
                    current_stage_pdf = "Unknown Stage"
                    current_winner_hf_pdf = 0.0
                    
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if not page_text: continue
                        for line in page_text.split('\n'):
                            line = line.strip()
                            
                            for div in KNOWN_DIVISIONS:
                                if f"{div.upper()} --" in line.upper() or line.upper().startswith(div.upper()):
                                    current_div_pdf = div
                                    break
                            
                            stage_match = re.search(r'(Stage\s+\d+\s+--\s+.*)', line, re.IGNORECASE)
                            if stage_match:
                                extracted_stage = stage_match.group(1).split('--')[0].strip()
                                if extracted_stage != current_stage_pdf:
                                    current_stage_pdf = extracted_stage
                                    current_winner_hf_pdf = 0.0
                                
                            if "Overall Match Results" in line:
                                if current_stage_pdf != "Overall Match Results (PDF)":
                                    current_stage_pdf = "Overall Match Results (PDF)"
                                    current_winner_hf_pdf = 100.0

                            tokens = line.split()
                            numeric_vals = []
                            for t in tokens:
                                if re.match(r'^-?\d+([.,]\d+)?$', t):
                                    numeric_vals.append(float(t.replace(',', '.')))
                                else:
                                    break
                                    
                            if len(numeric_vals) >= 6:
                                if int(numeric_vals[0]) == 1 or int(numeric_vals[0]) == 100:
                                    if numeric_vals[3] > 0: current_winner_hf_pdf = numeric_vals[3]

                            # 🔥 HIER: Die dynamische Suchliste verwenden!
                            for shooter in current_search_shooters:
                                if name_matches(shooter["real_name"], line):
                                    if len(numeric_vals) >= 6: # Stage-Ergebnis
                                        rank_val = int(numeric_vals[0])
                                        pts_val = numeric_vals[1]
                                        time_val = numeric_vals[2]
                                        hf_val = numeric_vals[3]
                                        
                                        payload = {
                                            "user_id": shooter["id"], "match_id": str(m_id), "match_name": m_name,
                                            "stage_name": current_stage_pdf, "scoring_type": "Comstock",
                                            "hit_factor": hf_val, "stage_time": time_val,
                                            "pts": pts_val,
                                            "division": current_div_pdf,
                                            "stage_rank": rank_val,
                                            "winner_hit_factor": current_winner_hf_pdf
                                        }
                                        supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
                                        print(f"   🔥 {shooter['real_name']} in PDF (Stage) gespeichert! ({current_div_pdf} | {current_stage_pdf} | PTS: {pts_val} | HF: {hf_val})")
                                        
                                    elif len(numeric_vals) >= 3 and current_stage_pdf == "Overall Match Results (PDF)": # Match-Ergebnis
                                        rank_val = int(numeric_vals[0])
                                        percentage = numeric_vals[1] 
                                        pts_val = numeric_vals[2]
                                        
                                        payload = {
                                            "user_id": shooter["id"], "match_id": str(m_id), "match_name": m_name,
                                            "stage_name": current_stage_pdf, "scoring_type": "Comstock",
                                            "stage_time": 0.0, 
                                            "hit_factor": percentage,
                                            "pts": pts_val,
                                            "division": current_div_pdf,
                                            "stage_rank": rank_val,
                                            "winner_hit_factor": 100.0
                                        }
                                        supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
                                        print(f"   🔥 {shooter['real_name']} in PDF (Overall) gespeichert! ({current_div_pdf} - {percentage}% - {pts_val} PTS)")

                    if pdf_count % 20 == 0:
                        print(f"⏳ {pdf_count} PDFs verarbeitet. Lege {PAUSE_SECONDS} Sekunden Pause ein, um den Server zu schonen...")
                        time.sleep(PAUSE_SECONDS)

                # --- HTML SMART PARSER ---
                elif 'text/html' in content_type:
                    sub_soup = BeautifulSoup(res.text, 'html.parser')
                    
                    for a in sub_soup.find_all('a', href=True):
                        h_low = a['href'].lower()
                        t_low = a.text.lower()
                        if any(good in h_low or good in t_low for good in [".pdf", "ergebnis", "overall", "results", "stage"]):
                            new_url = urllib.parse.urljoin(BASE_URL, a['href'])
                            if any(bad in new_url.lower() for bad in ['urkunden', 'team', 'category', 'region']): continue
                            if new_url not in visited_urls and new_url not in links_queue:
                                links_queue.append(new_url)
                                
                    current_division = "Unknown"
                    current_stage_title = "Unknown Stage"
                    current_winner_hf = 0.0
                    is_verify = "verify" in url.lower()

                    for el in sub_soup.find_all(['h1', 'h2', 'h3', 'h4', 'tr']):
                        text = el.get_text().strip()
                        
                        if el.name in ['h1', 'h2', 'h3', 'h4']:
                            for div in KNOWN_DIVISIONS:
                                if div.lower() in text.lower():
                                    current_division = div
                                    break
                            if "stage" in text.lower():
                                if current_stage_title != text:
                                    current_stage_title = text
                                    current_winner_hf = 0.0
                            continue
                            
                        if el.name == 'tr':
                            cells = el.find_all(['td', 'th'])
                            if not cells: continue
                            
                            if len(cells) == 1:
                                for div in KNOWN_DIVISIONS:
                                    if div.lower() in cells[0].get_text().lower():
                                        current_division = div
                                        current_winner_hf = 0.0
                                        break
                                continue
                                
                            if len(cells) < 7: continue
                            
                            row_text = el.get_text()
                            rank_str = cells[0].get_text().strip().replace('.', '')
                            
                            hf = 0.0
                            if len(cells) >= 11: hf = extract_float(cells[10].text)
                            elif len(cells) >= 8: hf = extract_float(cells[8].text) if cells[8].text else extract_float(cells[7].text)

                            if rank_str == '1' or rank_str == '100,00':
                                if hf > 0: current_winner_hf = hf

                            # 🔥 HIER: Die dynamische Suchliste verwenden!
                            for shooter in current_search_shooters:
                                if name_matches(shooter["real_name"], row_text):
                                    stage_name_to_save = cells[2].text.strip() if is_verify else current_stage_title
                                    rank_val = int(rank_str) if rank_str.isdigit() else 0
                                    
                                    payload = {
                                        "user_id": shooter["id"], "match_id": str(m_id), "match_name": m_name,
                                        "stage_name": stage_name_to_save, "scoring_type": "Comstock",
                                        "hit_factor": hf,
                                        "division": current_division,
                                        "stage_rank": rank_val,
                                        "winner_hit_factor": current_winner_hf
                                    }
                                    
                                    try:
                                        if len(cells) >= 11:
                                            payload["alphas"] = int(cells[4].text.strip())
                                            payload["charlies"] = int(cells[5].text.strip())
                                            payload["deltas"] = int(cells[6].text.strip())
                                            payload["misses"] = int(cells[7].text.strip())
                                            payload["stage_time"] = extract_float(cells[9].text)
                                    except: pass

                                    supabase.table("user_match_analytics").upsert(payload, on_conflict="user_id,match_id,stage_name").execute()
                
                # --- NEU: CACHE AKTUALISIEREN ---
                if server_last_modified:
                    supabase.table("scrape_cache").upsert({
                        "url": url, 
                        "last_modified": server_last_modified
                    }).execute()

            except Exception as e:
                print(f"❌ Fehler beim Verarbeiten von {url}: {e}")
                pass
                
    # --- NEU: NEUE USER ALS GESCANNT MARKIEREN ---
    if new_shooters:
        print("🧹 Markiere neue User als vollständig gescannt...")
        for user in new_shooters:
            try:
                supabase.table("profiles").update({"history_scanned": True}).eq("id", user["id"]).execute()
            except Exception as e:
                print(f"⚠️ Konnte history_scanned für {user['real_name']} nicht updaten: {e}")

    print("🏁 Smart-Analyse erfolgreich beendet!")

if __name__ == "__main__":
    scrape_verify_list()
