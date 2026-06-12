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
    """Token-Normalisierung fuer Namen/Laender in zusammengeklebten IPSCMatch-Zeilen."""
    return normalize_text(re.sub(r"[^A-Za-zÃÃÃÃ¤Ã¶Ã¼Ã0-9\-]", "", str(token or "")))

def find_name_token_span(tokens, real_name):
    """
    Gibt (start, ende_exklusiv) der Namens-Tokens zurueck.
    Wichtig: Selenium klebt bei IPSCMatch manchmal zwei Schuetzen in eine Textzeile.
    Deshalb darf die Division nicht hinter dem ersten GER der Zeile gelesen werden,
    sondern hinter dem GER, das NACH dem gesuchten Namen kommt.
    """
    name_parts = [p for p in normalize_text(real_name).split() if p]
    norm_tokens = [normalize_token(t) for t in tokens]

    if not name_parts:
        return None

    for start in range(len(norm_tokens)):
        if not norm_tokens[start]:
            continue

        pos = start
        matched = 0

        while pos < len(norm_tokens) and matched < len(name_parts):
            token = norm_tokens[pos]
            part = name_parts[matched]

            if token == part or part in token or token in part:
                matched += 1
                pos += 1
            elif matched > 0 and token in {"", "-", "â"}:
                pos += 1
            else:
                break

        if matched == len(name_parts):
            return start, pos

    return None

def extract_division_after_name(line, real_name):
    """Liest die Division hinter dem Laenderkuerzel, das nach dem gesuchten Namen steht."""
    tokens = line.split()
    span = find_name_token_span(tokens, real_name)
    if not span:
        return None

    _, name_end = span

    # Nur NACH dem gesuchten Namen suchen. Damit wird bei
    # "Daniel ... GER Optics ... Thomas Krieter GER Open" nicht Daniels Optics genommen.
    region_index = -1
    for i in range(name_end, len(tokens)):
        token_clean = re.sub(r'[^A-Za-z]', '', tokens[i]).upper()
        if token_clean in COUNTRY_CODES:
            region_index = i
            break

    if region_index >= 0 and region_index + 1 < len(tokens):
        after_region = " ".join(tokens[region_index + 1: region_index + 8])
        division = normalize_division(after_region)
        if division:
            return division

    # Extra-Fallback: kleines Fenster AB dem Namen, nicht die ganze Zeile.
    window = " ".join(tokens[name_end:name_end + 10])
    return normalize_division(window)

def extract_user_start_from_lines(lines, real_name):
    """
    Findet Name, aktuelle Squad und Division aus der IPSCMatch-Textansicht.
    Robust gegen zusammengeklebte Zeilen mit mehreren Schuetzen nebeneinander.
    """
    search_parts = normalize_text(real_name).split()
    if not search_parts:
        return None

    current_squad = "TBD"
    status = "Approved"

    for raw_line in lines:
        line = clean_text(raw_line)
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

        if not all(part in norm_line for part in search_parts):
            continue

        division = extract_division_after_name(line, real_name)

        log(f"ð¯ TREFFER: '{real_name}' -> {current_squad} ({status}) | Division: {division or 'UNERKANNT'} | Zeile: {line}")
        return {
            "status": status,
            "squad": current_squad,
            "ipsc_division": division,
            "raw_line": line,
        }

    return None

def find_starter_page(driver):
    """Navigiert mÃ¶glichst sicher zu einer Seite, auf der Squads/Starter sichtbar sind."""
    link_xpaths = [
        "//a[contains(@href, 'list=starter')]",
        "//a[contains(@href, 'list=main_match')]",
        "//a[contains(@href, 'list=overall')]",
        "//a[contains(@href, 'squads')]",
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
            starter_url = find_starter_page(driver)

            page_text = driver.find_element(By.TAG_NAME, "body").text
            lines = page_text.split('\n')

            for user in app_users:
                real_name = user['real_name']
                found = extract_user_start_from_lines(lines, real_name)

                if found:
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
                        "starter_url": starter_url,
                    }
                    update_or_create_match(user['id'], real_name, match_data)

    except Exception as e:
        log(f"KRITISCHER FEHLER: {e}")
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
