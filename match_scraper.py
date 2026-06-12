import os
import time
import re
import unicodedata
from urllib.parse import urlparse, parse_qs, quote

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from supabase import create_client, Client

# ==========================================
# 1. SUPABASE KONFIGURATION
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://huprxirlthkisjngwash.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

COUNTRY_CODES = {
    "GER", "DEU", "SUI", "CHE", "BEL", "NED", "POL", "AUT", "FRA", "ITA", "ESP", "POR",
    "LUX", "CZE", "SVK", "SLO", "SVN", "SRB", "NOR", "SWE", "DEN", "FIN", "USA", "BRA"
}

VALID_DIVISIONS = [
    "Production Optics",
    "Optics",
    "Production",
    "Standard",
    "Open",
    "Classic",
    "Revolver",
    "PCC",
]

def log(msg):
    print(msg, flush=True)

def normalize_text(text):
    """Normalisiert Umlaute und Text fÃ¼r einen robusten Abgleich."""
    if not text:
        return ""
    text = str(text).lower()
    text = text.replace('Ã¤', 'ae').replace('Ã¶', 'oe').replace('Ã¼', 'ue').replace('Ã', 'ss')
    text = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    return re.sub(r"\s+", " ", text).strip()

def clean_text(text):
    return re.sub(r"\s+", " ", str(text or "").replace("\xa0", " ")).strip()

def normalize_division(text):
    raw = clean_text(text)
    norm = normalize_text(raw)

    # Reihenfolge ist wichtig: Production Optics vor Production, sonst wird falsch gekÃ¼rzt.
    if re.search(r"prod\.?\s*opt|production\s+optics|pdo", norm):
        return "Production Optics"
    if re.search(r"carry\s*opt|\boptics?\b|\bopt\b", norm):
        return "Optics"
    if re.search(r"\bpcc\b", norm):
        return "PCC"
    if re.search(r"production|\bprd\b", norm):
        return "Production"
    if re.search(r"standard|\bstd\b", norm):
        return "Standard"
    if re.search(r"classic|\bclc\b", norm):
        return "Classic"
    if re.search(r"revolver|\brev\b", norm):
        return "Revolver"
    if re.search(r"\bopen\b|\bopn\b", norm):
        return "Open"
    return None

def get_match_id(url):
    try:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        if "match" in qs and qs["match"]:
            return qs["match"][0]
    except Exception:
        pass
    m = re.search(r"[?&]match=([^&]+)", url or "")
    return m.group(1) if m else None

def build_analysis_url(match_url, division):
    match_id = get_match_id(match_url)
    if not match_id or not division:
        return None
    return f"https://ipscmatch.de/index.pl?match={quote(match_id)}&complist&grepdiv={quote(division)}"

def extract_date_and_location(driver):
    match_date = "2026-01-01"
    location = "Unbekannt"
    try:
        body_text = driver.find_element(By.TAG_NAME, "body").text
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

def safe_db_write(kind, table_query, payload, fallback_payload=None):
    """Schreibt neue Spalten mit und fÃ¤llt sauber auf alte Spalten zurÃ¼ck, falls die DB-Spalten noch fehlen."""
    try:
        return table_query(payload).execute()
    except Exception as e:
        if fallback_payload is None:
            raise
        log(f"WARN: {kind} mit neuen Spalten fehlgeschlagen ({e}). Fallback ohne ipsc_division/analysis_url...")
        return table_query(fallback_payload).execute()

def update_or_create_match(user_id, real_name, match_data):
    match_name = match_data['match_name']

    base_payload = {
        "match_date": match_data['match_date'],
        "match_location": match_data['location'],
        "status": match_data['status'],
        "squad": match_data['squad'],
        "auto_imported": True,
        "match_url": match_data['match_url'],
    }
    enhanced_payload = {
        **base_payload,
        "ipsc_division": match_data.get('ipsc_division'),
        "analysis_url": match_data.get('analysis_url'),
    }

    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()

    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        relevant_fields = ["status", "squad", "match_date", "ipsc_division", "analysis_url"]
        changed = any(str(db_match.get(k)) != str(match_data.get(k)) for k in relevant_fields)

        if changed:
            log(
                f"ð UPDATE: '{real_name}' bei '{match_name}' -> "
                f"Status: {match_data['status']} | Squad: {match_data['squad']} | "
                f"Division: {match_data.get('ipsc_division') or '-'}"
            )
            safe_db_write(
                "Update",
                lambda payload: supabase.table("user_matches").update(payload).eq("id", db_match['id']),
                enhanced_payload,
                base_payload,
            )
    else:
        insert_payload = {
            "user_id": user_id,
            "match_name": match_name,
            **enhanced_payload,
        }
        fallback_insert_payload = {
            "user_id": user_id,
            "match_name": match_name,
            **base_payload,
        }
        log(
            f"â¨ NEU: '{real_name}' -> '{match_name}' "
            f"(Squad: {match_data['squad']} | Status: {match_data['status']} | "
            f"Division: {match_data.get('ipsc_division') or '-'})"
        )
        safe_db_write(
            "Insert",
            lambda payload: supabase.table("user_matches").insert(payload),
            insert_payload,
            fallback_insert_payload,
        )

def normalize_token(token):
    """Token-Normalisierung fuer Namen/Laender in IPSCMatch-Zeilen."""
    return normalize_text(re.sub(r"[^A-Za-zÃÃÃÃ¤Ã¶Ã¼Ã0-9\-]", "", str(token or "")))

def name_text_variants(value):
    """Erzeugt Varianten: SchÃ¶ps, Schoeps, Schops werden vergleichbar."""
    raw = str(value or "").lower()
    variants = set()

    def cleanup(v):
        v = "".join(c for c in unicodedata.normalize('NFD', v) if unicodedata.category(c) != 'Mn')
        v = re.sub(r"[^a-z0-9]+", " ", v)
        return re.sub(r"\s+", " ", v).strip()

    repl_sets = [
        {'Ã¤': 'ae', 'Ã¶': 'oe', 'Ã¼': 'ue', 'Ã': 'ss'},
        {'Ã¤': 'a',  'Ã¶': 'o',  'Ã¼': 'u',  'Ã': 'ss'},
    ]
    for repl in repl_sets:
        v = raw
        for a, b in repl.items():
            v = v.replace(a, b)
        variants.add(cleanup(v))

    variants.add(cleanup(normalize_text(value)))
    return {v for v in variants if v}

def name_matches(candidate_name, real_name):
    """True, wenn alle Teile des Profilnamens im Kandidatennamen vorkommen; umlauttolerant."""
    candidate_variants = name_text_variants(candidate_name)
    raw_parts = [p for p in re.split(r"\s+", str(real_name or "").strip()) if p]
    if not raw_parts:
        return False

    for candidate in candidate_variants:
        ok = True
        for part in raw_parts:
            part_variants = name_text_variants(part)
            if not any(p and p in candidate for p in part_variants):
                ok = False
                break
        if ok:
            return True
    return False

def find_name_token_span(tokens, real_name):
    """
    Gibt (start, ende_exklusiv) der Namens-Tokens zurueck.
    Akzeptiert Schoeps/SchÃ¶ps/Schops und verhindert, dass die Division vom vorherigen Schuetzen gezogen wird.
    """
    name_parts_raw = [p for p in re.split(r"\s+", str(real_name or "").strip()) if p]
    norm_tokens_joined = [" ".join(name_text_variants(t)) for t in tokens]

    for start in range(len(tokens)):
        for end in range(start + 1, min(len(tokens), start + len(name_parts_raw) + 4) + 1):
            candidate = " ".join(tokens[start:end])
            if name_matches(candidate, real_name):
                return start, end
    return None

def extract_division_segment_after_name(line, real_name):
    """
    Schneidet aus zusammengeklebten Zeilen nur den Teil des gesuchten Schuetzen heraus.
    Beispiel:
    '... Daniel ... GER Optics Overall 11 Thomas Krieter GER Open Overall'
    wird fuer Thomas zu 'Thomas Krieter GER Open Overall'.
    """
    tokens = line.split()
    span = find_name_token_span(tokens, real_name)
    if not span:
        return None, None

    name_start, name_end = span

    region_index = -1
    for i in range(name_end, len(tokens)):
        token_clean = re.sub(r'[^A-Za-z]', '', tokens[i]).upper()
        if token_clean in COUNTRY_CODES:
            region_index = i
            break

    if region_index < 0:
        segment = " ".join(tokens[name_start:min(len(tokens), name_end + 8)])
        return normalize_division(segment), segment

    # Ab LandeskÃ¼rzel nur bis zur Kategorie oder bis zum nÃ¤chsten Startnummernblock lesen.
    stop = min(len(tokens), region_index + 8)
    category_words = {"overall", "senior", "lady", "junior", "supersenior", "super", "grand", "master"}
    for j in range(region_index + 1, min(len(tokens), region_index + 8)):
        tj = normalize_token(tokens[j])
        # Nach Kategorie stoppen, damit kein fremder Folgeschuetze mit in den Log/Parser faellt.
        if tj in category_words:
            stop = j + 1
            break
        # Falls direkt ein neuer Datensatz beginnt: Nummer + Name ...
        if j > region_index + 1 and re.fullmatch(r"\d{1,5}", tokens[j]):
            stop = j
            break

    segment = " ".join(tokens[name_start:stop])
    after_region = " ".join(tokens[region_index + 1:stop])
    division = normalize_division(after_region) or normalize_division(segment)
    return division, segment

def extract_structured_entries_from_dom(driver):
    """
    Liest Tabellenzellen statt body.text. Das ist viel stabiler, weil IPSCMatch mobile/HTML
    teils zwei Schuetzen in eine sichtbare Textzeile klebt.
    """
    entries = []
    try:
        tables = driver.execute_script("""
            return Array.from(document.querySelectorAll('table')).map(table => ({
                text: table.innerText || '',
                rows: Array.from(table.querySelectorAll('tr')).map(tr =>
                    Array.from(tr.children).map(td => (td.innerText || '').trim())
                )
            }));
        """) or []
    except Exception:
        return entries

    current_squad = "TBD"
    current_status = "Approved"

    for table in tables:
        table_text = clean_text(table.get('text', ''))
        sq_in_table = re.search(r'(?:Sq\.?|Squad|Gruppe)\s*(\d+)', table_text, re.I)
        if sq_in_table:
            num = sq_in_table.group(1)
            current_squad = "SQ99" if num == "99" else f"Squad {num}"
            current_status = "Warteliste" if num == "99" or "warteliste" in table_text.lower() else "Approved"

        for cells in table.get('rows', []):
            cells = [clean_text(c) for c in cells if clean_text(c)]
            if not cells:
                continue
            row_text = clean_text(" ".join(cells))

            sq = re.search(r'(?:Sq\.?|Squad|Gruppe)\s*(\d+)', row_text, re.I)
            if sq:
                num = sq.group(1)
                current_squad = "SQ99" if num == "99" else f"Squad {num}"
                current_status = "Warteliste" if num == "99" or "warteliste" in row_text.lower() else "Approved"

            if re.search(r'\b(Name|Vorname|Region|Division|Category)\b', row_text, re.I):
                continue

            # Suche jede LÃ¤nderzelle. Die Zelle links davon ist in IPSCMatch fast immer der Name.
            for i, cell in enumerate(cells):
                country = re.sub(r'[^A-Za-z]', '', cell).upper()
                if country not in COUNTRY_CODES or i < 1:
                    continue

                name_cell = clean_text(cells[i - 1])
                # HÃ¤kchen/Kreuz/Nummern aus dem Namen entfernen.
                name_cell = re.sub(r'^[âââÃxX\s#\d.\-]+', '', name_cell).strip()
                name_cell = re.sub(r'\s+', ' ', name_cell)
                if len(name_cell) < 3 or re.search(r'^(name|vorname)$', name_cell, re.I):
                    continue

                division_text = " ".join(cells[i + 1:i + 4])
                division = normalize_division(division_text)
                if not division:
                    continue

                entries.append({
                    "name": name_cell,
                    "country": country,
                    "division": division,
                    "squad": current_squad,
                    "status": current_status,
                    "raw_line": f"{name_cell} {country} {division_text}".strip(),
                })

    return entries

def extract_user_start_from_entries(entries, real_name):
    for entry in entries:
        if name_matches(entry.get('name'), real_name):
            log(
                f"ð¯ TREFFER: '{real_name}' -> {entry.get('squad')} ({entry.get('status')}) | "
                f"Division: {entry.get('division')} | Tabellenzeile: {entry.get('raw_line')}"
            )
            return {
                "status": entry.get('status') or "Approved",
                "squad": entry.get('squad') or "TBD",
                "ipsc_division": entry.get('division'),
                "raw_line": entry.get('raw_line') or entry.get('name'),
            }
    return None

def extract_user_start_from_lines(lines, real_name):
    """Fallback fuer Seiten ohne auswertbare Tabellen."""
    current_squad = "TBD"
    status = "Approved"

    for raw_line in lines:
        line = clean_text(raw_line)
        if not line:
            continue
        norm_line = normalize_text(line)

        squad_match = re.search(r'(?:squad|sq\.?|gruppe)\s*(\d+)', norm_line)
        if squad_match:
            squad_num = squad_match.group(1)
            if squad_num == "99":
                current_squad = "SQ99"
                status = "Warteliste"
            else:
                current_squad = f"Squad {squad_num}"
                status = "Approved"
        elif "warteliste" in norm_line:
            current_squad = "SQ99"
            status = "Warteliste"

        if not name_matches(line, real_name):
            continue

        division, segment = extract_division_segment_after_name(line, real_name)
        log(
            f"ð¯ TREFFER: '{real_name}' -> {current_squad} ({status}) | "
            f"Division: {division or 'UNERKANNT'} | Segment: {segment or line}"
        )
        return {
            "status": status,
            "squad": current_squad,
            "ipsc_division": division,
            "raw_line": segment or line,
        }

    return None

def find_starter_page(driver):
    """Navigiert mÃ¶glichst sicher zu einer Seite, auf der Squads/Starter sichtbar sind."""
    link_xpaths = [
        "//a[contains(@href, 'list=starter')]",
        "//a[contains(@href, 'list=main_match')]",
        "//a[contains(@href, 'squads')]",
        "//a[contains(@href, 'complist')]",
        "//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÃÃÃ', 'abcdefghijklmnopqrstuvwxyzÃ¤Ã¶Ã¼'), 'starter')]",
        "//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÃÃÃ', 'abcdefghijklmnopqrstuvwxyzÃ¤Ã¶Ã¼'), 'squad')]",
        "//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÃÃÃ', 'abcdefghijklmnopqrstuvwxyzÃ¤Ã¶Ã¼'), 'teilnehmer')]",
    ]
    for xpath in link_xpaths:
        try:
            starter_link = driver.find_element(By.XPATH, xpath)
            href = starter_link.get_attribute("href")
            if href:
                driver.get(href)
                time.sleep(2)
                return href
        except Exception:
            continue
    return driver.current_url

def generated_candidate_urls(match_url):
    match_id = get_match_id(match_url)
    urls = [match_url]
    if match_id:
        base = f"https://ipscmatch.de/index.pl?match={quote(match_id)}"
        urls.extend([
            f"{base}&squads",
            f"{base}&list=starter",
            f"{base}&list=main_match",
            f"{base}&complist",
        ])
    # Reihenfolge erhalten, Duplikate entfernen
    seen = set()
    out = []
    for url in urls:
        if url and url not in seen:
            seen.add(url)
            out.append(url)
    return out

def extract_all_user_starts_from_current_page(driver, app_users):
    """Erst Tabellen sauber auslesen, danach nur als Fallback body.text scannen."""
    found_by_user_id = {}
    entries = extract_structured_entries_from_dom(driver)

    for user in app_users:
        found = extract_user_start_from_entries(entries, user['real_name'])
        if found:
            found_by_user_id[user['id']] = found

    remaining = [u for u in app_users if u['id'] not in found_by_user_id]
    if remaining:
        try:
            page_text = driver.find_element(By.TAG_NAME, "body").text
            lines = page_text.split('\n')
        except Exception:
            lines = []

        for user in remaining:
            found = extract_user_start_from_lines(lines, user['real_name'])
            if found:
                found_by_user_id[user['id']] = found

    return found_by_user_id

def scrape_ipscmatch_and_sync():
    app_users = get_app_users()
    if not app_users:
        log("Keine User gefunden. Breche ab.")
        return

    log("Starte Chrome-Browser...")
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.page_load_strategy = 'eager'

    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(25)

        base_url = "https://ipscmatch.de/"
        try:
            driver.get(base_url)
            time.sleep(2)
        except Exception:
            pass

        log("Suche nach Matches...")
        match_links = []
        elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='match=']")
        for el in elements:
            url = el.get_attribute('href')
            name = el.text.strip()
            if url and name and url not in [m['url'] for m in match_links]:
                match_links.append({'name': name, 'url': url})

        for match in match_links:
            log(f"\n--- Durchsuche: {match['name']} ---")

            try:
                driver.get(match['url'])
                time.sleep(2)
            except Exception:
                log("Timeout bei Hauptseite, probiere weiter...")

            real_match_date, real_location = extract_date_and_location(driver)

            # Erst den offiziellen Link suchen, danach zusÃ¤tzlich generierte IPSCMatch-Standardseiten testen.
            candidate_urls = []
            try:
                starter_url = find_starter_page(driver)
                candidate_urls.append(starter_url)
            except Exception:
                pass
            candidate_urls.extend(generated_candidate_urls(match['url']))

            seen_urls = set()
            found_by_user_id = {}
            last_url = match['url']

            for url in candidate_urls:
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                last_url = url
                try:
                    driver.get(url)
                    time.sleep(1.5)
                except Exception:
                    continue

                page_found = extract_all_user_starts_from_current_page(driver, app_users)
                found_by_user_id.update({k: v for k, v in page_found.items() if k not in found_by_user_id})

                # Wenn alle User fuer dieses Match gefunden wurden, nicht weiter Seiten pruefen.
                if len(found_by_user_id) == len(app_users):
                    break

            for user in app_users:
                found = found_by_user_id.get(user['id'])
                if not found:
                    continue

                analysis_url = build_analysis_url(match['url'], found.get('ipsc_division'))
                match_data = {
                    "match_name": match['name'],
                    "match_date": real_match_date,
                    "location": real_location,
                    "status": found['status'],
                    "squad": found['squad'],
                    "match_url": match['url'],
                    "ipsc_division": found.get('ipsc_division'),
                    "analysis_url": analysis_url,
                    "starter_url": last_url,
                }
                update_or_create_match(user['id'], user['real_name'], match_data)

    except Exception as e:
        log(f"KRITISCHER FEHLER: {e}")
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
