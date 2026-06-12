import os
import re
import unicodedata
import html
from urllib.parse import urlparse, parse_qs, quote, urljoin
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# ==========================================
# 1. SUPABASE KONFIGURATION
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://huprxirlthkisjngwash.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# 2. KONSTANTEN & PATTERNS
# ==========================================
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
}

COUNTRY_CODES = {
    "GER", "DEU", "SUI", "CHE", "BEL", "NED", "POL", "AUT", "FRA", "ITA", "ESP", "POR",
    "LUX", "CZE", "SVK", "SLO", "SVN", "SRB", "NOR", "SWE", "DEN", "FIN", "USA", "BRA",
    "HUN", "CRO", "HRV", "GBR", "UK", "IRL", "LIE", "MON", "AND"
}

DIVISION_PATTERNS = [
    (re.compile(r"\bprod\.?\s*opt(?:ics)?\b|\bproduction\s+optics\b|\bpdo\b", re.I), "Production Optics"),
    (re.compile(r"\bcarry\s*opt(?:ics)?\b|\boptics?\b|\bopt\b", re.I), "Optics"),
    (re.compile(r"\bpcc\b", re.I), "PCC"),
    (re.compile(r"\bproduction\b|\bprd\b", re.I), "Production"),
    (re.compile(r"\bstandard\b|\bstd\b", re.I), "Standard"),
    (re.compile(r"\bclassic\b|\bclc\b", re.I), "Classic"),
    (re.compile(r"\brevolver\b|\brev\b", re.I), "Revolver"),
    (re.compile(r"\bopen\b|\bopn\b", re.I), "Open"),
]

# ==========================================
# 3. HILFSFUNKTIONEN (TEXT & PARSING)
# ==========================================
def log(msg):
    print(msg, flush=True)

def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()

def normalize_text(value):
    value = str(value or "").lower()
    value = value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    value = "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()

def part_variants(part):
    raw = str(part or "").lower()
    variants = set()
    replacements = [
        {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"},
        {"ä": "a",  "ö": "o",  "ü": "u",  "ß": "ss"},
    ]
    for repl in replacements:
        v = raw
        for a, b in repl.items():
            v = v.replace(a, b)
        variants.add(normalize_text(v))
    variants.add(normalize_text(raw))
    return {v for v in variants if v}

def name_parts_match(text, real_name):
    norm = normalize_text(text)
    parts = [p for p in str(real_name or "").split() if p]
    return all(any(v and v in norm for v in part_variants(p)) for p in parts)

def full_name_variants(real_name):
    parts = [p for p in str(real_name or "").split() if p]
    if not parts: return []
    first = parts[0]
    last = " ".join(parts[1:]) if len(parts) > 1 else ""
    first_vs = part_variants(first)
    last_vs = part_variants(last) if last else {""}
    out = set()
    for f in first_vs:
        for l in last_vs:
            out.add(clean_text(f"{f} {l}"))
            if l: out.add(clean_text(f"{l} {f}"))
    return sorted(out, key=len, reverse=True)

def find_name_pos(text, real_name):
    norm = normalize_text(text)
    for variant in full_name_variants(real_name):
        if variant and variant in norm:
            return norm.index(variant), variant
    if name_parts_match(text, real_name):
        return 0, "parts-only"
    return -1, None

def normalize_division(text):
    text = clean_text(text)
    for rx, div in DIVISION_PATTERNS:
        if rx.search(text):
            return div
    return None

def extract_date_and_location(body_text):
    match_date = "2026-01-01" 
    location = "Unbekannt"
    try:
        date_matches = re.findall(r'(\d{2}\.\d{2}\.\d{4})', body_text)
        if date_matches:
            parts = date_matches[0].split('.')
            match_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        else:
            date_matches_iso = re.findall(r'(\d{4}-\d{2}-\d{2})', body_text)
            if date_matches_iso:
                match_date = date_matches_iso[0]

        loc_match = re.search(r'(?:Ort|Location|Austragungsort):\s*([^\n\r]+)', body_text, re.I)
        if loc_match:
            location = loc_match.group(1).strip()
    except Exception as e:
        log(f"WARN: Datum/Ort Extraktion fehlgeschlagen: {e}")
    return match_date, location

def get_match_id(url):
    try:
        qs = parse_qs(urlparse(url).query)
        if qs.get("match"): return qs["match"][0]
    except Exception:
        pass
    m = re.search(r"[?&]match=([^&]+)", url or "")
    return m.group(1) if m else None

def base_match_url(url):
    mid = get_match_id(url)
    if not mid: return url
    return f"https://ipscmatch.de/index.pl?match={quote(mid)}"

def analysis_url(match_url, division):
    if not division:
        return None
    return f"{base_match_url(match_url)}&complist&grepdiv={quote(division)}"

def candidate_urls(match_url):
    base = base_match_url(match_url)
    urls = [base, f"{base}&squads", f"{base}&list=starter", f"{base}&list=main_match", f"{base}&complist"]
    try:
        r = requests.get(base, headers=HEADERS, timeout=20)
        soup = BeautifulSoup(r.text, "lxml")
        for a in soup.select("a[href]"):
            href = a.get("href") or ""
            txt = clean_text(a.get_text(" "))
            if any(k in f"{txt} {href}".lower() for k in ["squad", "starter", "teilnehmer", "shooter", "list", "complist", "main_match"]):
                urls.append(urljoin(base, href))
    except Exception as e:
        log(f"Link-Discovery übersprungen: {e}")

    seen = set()
    out = []
    for u in urls:
        u = u.replace("index.php", "index.pl")
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out

# ==========================================
# 4. EXTRAKTIONS-LOGIK
# ==========================================
def extract_squad_from_text(text):
    m = re.search(r"(?:Sq\.?|Squad|Gruppe)[\s:]*(\d+)", text, re.I)
    if not m: 
        if re.search(r"warteliste", text, re.I): return "SQ99", "Warteliste"
        return "TBD", "Approved"
    
    num = m.group(1)
    if num == "0": return "TBD", "Approved"
    elif num == "99" or re.search(r"warteliste", text, re.I): return "SQ99", "Warteliste"
        
    return f"Squad {num}", "Approved"

def extract_from_segment(segment, real_name, squad="TBD", status="Approved"):
    if not name_parts_match(segment, real_name): return None
    tokens = clean_text(segment).split()
    
    start_idx = -1
    
    for i in range(len(tokens)):
        window = " ".join(tokens[i:i+6])
        if name_parts_match(window, real_name):
            start_idx = i
            break

    if start_idx == -1:
        return None

    tail_tokens = tokens[start_idx:]
    country_idx = None
    for i, t in enumerate(tail_tokens):
        if re.sub(r"[^A-Za-z]", "", t).upper() in COUNTRY_CODES:
            country_idx = i
            break

    if country_idx is None:
        div = normalize_division(" ".join(tail_tokens))
    else:
        after_country = " ".join(tail_tokens[country_idx+1:country_idx+8])
        div = normalize_division(after_country)

    if not div: return None
    return {"squad": squad, "status": status, "division": div}

def scan_tables(soup, real_name):
    results = []
    for table in soup.select("table"):
        current_squad_left = "TBD"
        current_squad_right = "TBD"
        squad_col_idx = -1

        for tr in table.select("tr"):
            cells = [clean_text(td.get_text(" ")) for td in tr.find_all(["td", "th"])]
            cells = [c for c in cells if c]
            if not cells: continue

            # 1. Block-Header für Squads
            squad_matches = []
            for idx, cell in enumerate(cells):
                if re.search(r"^(?:Sq\.?|Squad|Gruppe)[\s:]*\d+", cell, re.I):
                    m = re.search(r"(\d+)", cell)
                    if m:
                        sq_num = m.group(1)
                        if sq_num == "0": squad_matches.append("TBD")
                        elif sq_num == "99": squad_matches.append("SQ99")
                        else: squad_matches.append(f"Squad {sq_num}")

            if squad_matches:
                current_squad_left = squad_matches[0]
                current_squad_right = squad_matches[1] if len(squad_matches) > 1 else current_squad_left
                continue 

            # 2. Spalten-Köpfe einer flachen Tabelle
            row_text = clean_text(" ".join(cells))
            if re.search(r"\b(Name|Vorname|Region|Division|Category|Competitor)\b", row_text, re.I):
                for idx, val in enumerate(cells):
                    if re.search(r"^(?:Sq|Squad|Gruppe)\b", val, re.I):
                        squad_col_idx = idx
                continue 

            status = "Warteliste" if "warteliste" in row_text.lower() else "Approved"

            # 3. Schützen-Zeile auswerten
            for i, c in enumerate(cells):
                if re.sub(r"[^A-Za-z]", "", c).upper() in COUNTRY_CODES and i >= 1:
                    name_cell = re.sub(r"^[✓✔✗×xX\s#\d.\-]+", "", cells[i-1]).strip()
                    
                    if name_parts_match(name_cell, real_name):
                        div = normalize_division(" ".join(cells[i+1:]))
                        
                        assigned_squad = current_squad_left
                        if len(cells) >= 6 and i >= (len(cells) / 2) and current_squad_right != "TBD":
                            assigned_squad = current_squad_right
                        
                        if squad_col_idx != -1 and squad_col_idx < len(cells):
                            sq_val = cells[squad_col_idx]
                            m = re.search(r"(\d+)", sq_val)
                            if m:
                                sq_num = m.group(1)
                                if sq_num == "0": assigned_squad = "TBD"
                                elif sq_num == "99": assigned_squad = "SQ99"
                                else: assigned_squad = f"Squad {sq_num}"

                        if assigned_squad == "TBD":
                            for cell_val in reversed(cells[i:]):
                                val_clean = cell_val.strip()
                                m = re.search(r"^(?:Sq\.?\s*|Squad\s*)?(\d{1,3})$", val_clean, re.I)
                                if m:
                                    sq_num = m.group(1)
                                    if sq_num == "99": assigned_squad = "SQ99"
                                    elif sq_num != "0": assigned_squad = f"Squad {sq_num}"
                                    break

                        if assigned_squad == "SQ99":
                            status = "Warteliste"

                        if div or assigned_squad != "TBD":
                            results.append({"squad": assigned_squad, "status": status, "division": div})
            
            # Fallback
            hit = extract_from_segment(row_text, real_name, current_squad_left, status)
            if hit:
                if hit["squad"] == "TBD":
                    if squad_col_idx != -1 and squad_col_idx < len(cells):
                        sq_val = cells[squad_col_idx]
                        m = re.search(r"(\d+)", sq_val)
                        if m:
                            sq_num = m.group(1)
                            if sq_num == "99": hit["squad"] = "SQ99"; hit["status"] = "Warteliste"
                            elif sq_num != "0": hit["squad"] = f"Squad {sq_num}"
                    else:
                        for cell_val in reversed(cells):
                            val_clean = cell_val.strip()
                            m = re.search(r"^(?:Sq\.?\s*|Squad\s*)?(\d{1,3})$", val_clean, re.I)
                            if m:
                                sq_num = m.group(1)
                                if sq_num == "99": hit["squad"] = "SQ99"; hit["status"] = "Warteliste"
                                elif sq_num != "0": hit["squad"] = f"Squad {sq_num}"
                                break
                results.append(hit)

    return results

def scan_text_blocks(soup, real_name):
    text = html.unescape(soup.get_text("\n"))
    parts = re.split(r"(?=(?:Sq\.?|Squad|Gruppe)\s*\d+)", text, flags=re.I)
    blocks = [p for p in parts if clean_text(p)] or [text]
    results = []
    for block in blocks:
        block_clean = clean_text(block)
        squad, status = extract_squad_from_text(block_clean)
        if not name_parts_match(block_clean, real_name): continue
        hit = extract_from_segment(block_clean, real_name, squad, status)
        if hit: results.append(hit)
    return results

# ==========================================
# 5. DATENBANK LOGIK
# ==========================================
def get_app_users():
    log("Lade User aus der profiles-Tabelle...")
    try:
        response = supabase.table("profiles").select("id, real_name").execute()
        users = [u for u in response.data if u.get('real_name')]
        log(f"{len(users)} User mit real_name gefunden.")
        return users
    except Exception as e:
        log(f"Fehler beim Laden der User: {e}")
        return []

def update_or_create_match(user_id, real_name, match_data):
    match_name = match_data['match_name']
    
    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()
        
    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        if (db_match.get('status') != match_data['status'] or 
            db_match.get('squad') != match_data['squad'] or 
            db_match.get('match_date') != match_data['match_date'] or
            db_match.get('ipsc_division') != match_data['division']): 
            
            log(f"🔄 UPDATE: '{real_name}' bei '{match_name}' -> Status: {match_data['status']} | Squad: {match_data['squad']} | Div: {match_data.get('division')}")
            supabase.table("user_matches").update({
                "match_date": match_data['match_date'],
                "match_location": match_data['location'],
                "status": match_data['status'],
                "squad": match_data['squad'],
                "ipsc_division": match_data['division'],
                "analysis_url": match_data['analysis_url'],
                "auto_imported": True, 
                "match_url": match_data['match_url']
            }).eq("id", db_match['id']).execute()
    else:
        log(f"✨ NEU: '{real_name}' -> '{match_name}' (Squad: {match_data['squad']} | Div: {match_data.get('division')}).")
        supabase.table("user_matches").insert({
            "user_id": user_id,
            "match_name": match_name,
            "match_date": match_data['match_date'],
            "match_location": match_data['location'],
            "status": match_data['status'],
            "squad": match_data['squad'],
            "ipsc_division": match_data['division'],
            "analysis_url": match_data['analysis_url'],
            "auto_imported": True,
            "match_url": match_data['match_url']
        }).execute()

# ==========================================
# 6. HAUPT-SCHLEIFE
# ==========================================
def scrape_ipscmatch_and_sync():
    app_users = get_app_users()
    if not app_users:
        log("Keine User gefunden. Breche ab.")
        return

    base_url = "https://ipscmatch.de/"
    log(f"Lade Matches von {base_url}...")
    
    try:
        r = requests.get(base_url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        main_soup = BeautifulSoup(r.text, "lxml")
    except Exception as e:
        log(f"Fehler beim Laden der Hauptseite: {e}")
        return

    match_links = []
    for a in main_soup.select("a[href*='match=']"):
        url = a.get("href")
        name = clean_text(a.get_text())
        if url and name and not any(m['url'] == url for m in match_links):
            match_links.append({'name': name, 'url': url})

    for match in match_links:
        log(f"\n--- Durchsuche: {match['name']} ---")
        
        match_date, location = "2026-01-01", "Unbekannt"
        try:
            r_match = requests.get(match['url'], headers=HEADERS, timeout=15)
            match_date, location = extract_date_and_location(r_match.text)
        except Exception:
            pass

        urls_to_check = candidate_urls(match['url'])
        found_users = set()

        for url in urls_to_check:
            if len(found_users) == len(app_users): break 
            
            try:
                r_page = requests.get(url, headers=HEADERS, timeout=15)
                soup = BeautifulSoup(r_page.text, "lxml")
            except Exception:
                continue
                
            for user in app_users:
                real_name = user['real_name']
                if real_name in found_users: continue
                
                hits = scan_tables(soup, real_name) + scan_text_blocks(soup, real_name)
                
                if hits:
                    best_hit = hits[0] 
                    found_users.add(real_name)
                    
                    div = best_hit.get('division')
                    
                    match_data = {
                        "match_name": match['name'],
                        "match_date": match_date,
                        "location": location,
                        "status": best_hit['status'],
                        "squad": best_hit['squad'],
                        "division": div,
                        "match_url": match['url'],
                        "analysis_url": analysis_url(match['url'], div)
                    }
                    update_or_create_match(user['id'], real_name, match_data)

if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
