import os
import sys
import time
import re
import unicodedata
from urllib.parse import urlparse, parse_qs, quote, urljoin

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
from supabase import create_client, Client

# ==========================================
# 1. SUPABASE KONFIGURATION
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://huprxirlthkisjngwash.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
if not SUPABASE_KEY:
    print("KRITISCH: SUPABASE_KEY fehlt.", flush=True)
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_URL = "https://ipscmatch.de/"

COUNTRY_CODES = {
    "GER", "DEU", "SUI", "CHE", "BEL", "NED", "POL", "AUT", "FRA", "ITA", "ESP", "POR",
    "LUX", "CZE", "SVK", "SLO", "SVN", "SRB", "NOR", "SWE", "DEN", "FIN", "USA", "BRA",
    "HUN", "CRO", "HRV", "GBR", "UK", "IRL", "LIE", "MON", "AND", "PHI", "PHL", "ROU",
    "GRE", "GRC", "BUL", "UKR", "EST", "LAT", "LTU", "TUR", "ISR", "RSA", "AUS", "NZL"
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


def log(msg):
    print(msg, flush=True)


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def normalize_text(value):
    value = str(value or "").lower()
    value = value.replace("Ã¤", "ae").replace("Ã¶", "oe").replace("Ã¼", "ue").replace("Ã", "ss")
    value = "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def part_variants(part):
    raw = str(part or "").lower()
    variants = set()
    replacements = [
        {"Ã¤": "ae", "Ã¶": "oe", "Ã¼": "ue", "Ã": "ss"},
        {"Ã¤": "a", "Ã¶": "o", "Ã¼": "u", "Ã": "ss"},
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
    if not parts:
        return False
    return all(any(v and v in norm for v in part_variants(p)) for p in parts)


def normalize_division(text):
    text = clean_text(text)
    for rx, div in DIVISION_PATTERNS:
        if rx.search(text):
            return div
    return None


def get_match_id(url):
    try:
        qs = parse_qs(urlparse(url).query)
        if qs.get("match"):
            return qs["match"][0]
    except Exception:
        pass
    m = re.search(r"[?&]match=([^&]+)", url or "")
    return m.group(1) if m else None


def base_match_url(url):
    mid = get_match_id(url)
    if not mid:
        return url
    return f"https://ipscmatch.de/index.pl?match={quote(mid)}"


def analysis_url(match_url, division):
    return f"{base_match_url(match_url)}&complist&grepdiv={quote(division)}"


def extract_squad_from_text(text):
    text = clean_text(text)
    m = re.search(r"(?:Sq\.?|Squad|Gruppe)\s*(\d+)", text, re.I)
    if not m:
        if re.search(r"warteliste", text, re.I):
            return "SQ99", "Warteliste"
        return "TBD", "Approved"
    num = m.group(1)
    if num == "99" or re.search(r"warteliste", text, re.I):
        return "SQ99", "Warteliste"
    return f"Squad {num}", "Approved"


def extract_date_and_location(driver):
    match_date = "2026-01-01"
    location = "Unbekannt"
    try:
        body_text = driver.find_element(By.TAG_NAME, "body").text
        date_matches = re.findall(r"(\d{2}\.\d{2}\.\d{4})", body_text)
        if date_matches:
            parts = date_matches[0].split(".")
            match_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        else:
            date_matches_iso = re.findall(r"(\d{4}-\d{2}-\d{2})", body_text)
            if date_matches_iso:
                match_date = date_matches_iso[0]

        loc_match = re.search(r"(?:Ort|Location|Austragungsort):\s*([^\n\r]+)", body_text, re.I)
        if loc_match:
            location = loc_match.group(1).strip()
    except Exception as e:
        log(f"WARN: Datum/Ort Extraktion fehlgeschlagen: {e}")

    return match_date, location


def get_app_users():
    log("Lade User aus der profiles-Tabelle...")
    try:
        response = supabase.table("profiles").select("id, real_name").execute()
        users = [u for u in response.data if u.get("real_name")]
        log(f"{len(users)} User mit real_name gefunden.")
        return users
    except Exception as e:
        log(f"Fehler beim Laden der User: {e}")
        return []


def safe_update_user_match(row_id, payload):
    """Update mit neuen Spalten. Falls DB-Spalten noch fehlen, Fallback ohne neue Felder."""
    try:
        supabase.table("user_matches").update(payload).eq("id", row_id).execute()
        return
    except Exception as e:
        msg = str(e)
        if "ipsc_division" not in msg and "analysis_url" not in msg:
            raise
        fallback = dict(payload)
        fallback.pop("ipsc_division", None)
        fallback.pop("analysis_url", None)
        supabase.table("user_matches").update(fallback).eq("id", row_id).execute()


def safe_insert_user_match(payload):
    try:
        supabase.table("user_matches").insert(payload).execute()
        return
    except Exception as e:
        msg = str(e)
        if "ipsc_division" not in msg and "analysis_url" not in msg:
            raise
        fallback = dict(payload)
        fallback.pop("ipsc_division", None)
        fallback.pop("analysis_url", None)
        supabase.table("user_matches").insert(fallback).execute()


def update_or_create_match(user_id, real_name, match_data):
    match_name = match_data["match_name"]

    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()

    payload = {
        "match_date": match_data["match_date"],
        "match_location": match_data["location"],
        "status": match_data["status"],
        "squad": match_data["squad"],
        "auto_imported": True,
        "match_url": match_data["match_url"],
        "ipsc_division": match_data.get("division"),
        "analysis_url": match_data.get("analysis_url"),
    }

    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        changed = (
            db_match.get("status") != match_data["status"] or
            db_match.get("squad") != match_data["squad"] or
            db_match.get("match_date") != match_data["match_date"] or
            db_match.get("ipsc_division") != match_data.get("division") or
            db_match.get("analysis_url") != match_data.get("analysis_url")
        )
        if changed:
            log(
                f"ð UPDATE: '{real_name}' bei '{match_name}' -> "
                f"Status: {match_data['status']} | Squad: {match_data['squad']} | "
                f"Division: {match_data.get('division') or '-'}"
            )
            safe_update_user_match(db_match["id"], payload)
    else:
        log(
            f"â¨ NEU: '{real_name}' -> '{match_name}' "
            f"(Squad: {match_data['squad']} | Status: {match_data['status']} | "
            f"Division: {match_data.get('division') or '-'})"
        )
        insert_payload = {
            "user_id": user_id,
            "match_name": match_name,
            **payload,
        }
        safe_insert_user_match(insert_payload)


def robust_get(driver, url, wait_seconds=1.5):
    """LÃ¤dt per Selenium. Bei Timeout wird das Laden gestoppt und der bereits gerenderte DOM trotzdem genutzt."""
    try:
        driver.get(url)
        time.sleep(wait_seconds)
        return True
    except TimeoutException as e:
        log(f"WARN: Timeout beim Laden, nutze vorhandenen DOM weiter: {url}")
        try:
            driver.execute_script("window.stop();")
        except Exception:
            pass
        time.sleep(0.5)
        return True
    except WebDriverException as e:
        log(f"WARN: Selenium konnte URL nicht laden: {url} | {e}")
        return False
    except Exception as e:
        log(f"WARN: URL konnte nicht geladen werden: {url} | {e}")
        return False


def extract_match_links_from_current_page(driver):
    links = []
    seen = set()
    try:
        elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='match=']")
        for el in elements:
            url = el.get_attribute("href") or ""
            name = clean_text(el.text)
            if not url:
                continue
            mid = get_match_id(url)
            if not mid:
                continue
            clean_url = base_match_url(url)
            key = mid
            if key in seen:
                continue
            seen.add(key)
            links.append({"name": name or mid, "url": clean_url})
    except Exception as e:
        log(f"WARN: Matchlinks konnten nicht gelesen werden: {e}")
    return links


def discover_candidate_urls(driver, match_url):
    base = base_match_url(match_url)
    urls = [
        base,
        f"{base}&squads",
        f"{base}&list=starter",
        f"{base}&list=main_match",
        f"{base}&complist",
    ]
    try:
        for a in driver.find_elements(By.CSS_SELECTOR, "a[href]"):
            href = a.get_attribute("href") or ""
            txt = clean_text(a.text)
            combined = f"{txt} {href}".lower()
            if any(k in combined for k in ["squad", "starter", "teilnehmer", "shooter", "list", "complist", "main_match"]):
                if "match=" in href:
                    urls.append(href.replace("index.php", "index.pl"))
    except Exception:
        pass

    seen = set()
    out = []
    for u in urls:
        u = (u or "").replace("index.php", "index.pl")
        if u and u not in seen:
            seen.add(u)
            out.append(u)
    return out


def extract_from_segment(segment, real_name, squad="TBD", status="Approved"):
    if not name_parts_match(segment, real_name):
        return None

    tokens = clean_text(segment).split()
    if not tokens:
        return None

    # Suche Tokenfenster, in dem der Name beginnt. Danach erst Land + Division lesen.
    start_idx = 0
    for i in range(len(tokens)):
        window = " ".join(tokens[i:i + 6])
        if name_parts_match(window, real_name):
            start_idx = i
            break

    tail_tokens = tokens[start_idx:]
    country_idx = None
    for i, t in enumerate(tail_tokens):
        tc = re.sub(r"[^A-Za-z]", "", t).upper()
        if tc in COUNTRY_CODES:
            country_idx = i
            break

    if country_idx is None:
        div = normalize_division(" ".join(tail_tokens))
        raw = " ".join(tail_tokens[:12])
    else:
        after_country = " ".join(tail_tokens[country_idx + 1:country_idx + 8])
        div = normalize_division(after_country)
        raw = " ".join(tail_tokens[:country_idx + 8])

    if not div:
        return None

    return {
        "squad": squad,
        "status": status,
        "division": div,
        "raw": raw,
    }


def scan_tables(driver, real_name):
    results = []
    try:
        tables = driver.find_elements(By.CSS_SELECTOR, "table")
    except Exception:
        return results

    for table in tables:
        try:
            table_text = clean_text(table.text)
            squad, status = extract_squad_from_text(table_text)
            rows = table.find_elements(By.CSS_SELECTOR, "tr")
        except Exception:
            continue

        for tr in rows:
            try:
                cells = [clean_text(td.text) for td in tr.find_elements(By.CSS_SELECTOR, "td, th")]
            except Exception:
                continue
            cells = [c for c in cells if c]
            if not cells:
                continue

            row = clean_text(" ".join(cells))
            if re.search(r"\b(Name|Vorname|Region|Division|Category|Kategorie)\b", row, re.I):
                continue

            # Struktur: ... Name | Region | Division | Category
            for i, c in enumerate(cells):
                country = re.sub(r"[^A-Za-z]", "", c).upper()
                if country in COUNTRY_CODES and i >= 1:
                    name_cell = re.sub(r"^[âââÃxX\s#\d.\-]+", "", cells[i - 1]).strip()
                    if name_parts_match(name_cell, real_name):
                        div = normalize_division(" ".join(cells[i + 1:i + 4]))
                        if div:
                            results.append({"squad": squad, "status": status, "division": div, "raw": row})

            # Fallback fÃ¼r zusammengeklebte Tabellenzeilen.
            hit = extract_from_segment(row, real_name, squad, status)
            if hit:
                results.append(hit)

    return dedupe_hits(results)


def scan_body_text(driver, real_name):
    try:
        text = driver.find_element(By.TAG_NAME, "body").text
    except Exception:
        return []

    text = text.replace("\xa0", " ")
    # In Squad-BlÃ¶cke schneiden; wichtig fÃ¼r Screenshot-Struktur mit vielen Squads auf einer Seite.
    parts = re.split(r"(?=(?:Sq\.?|Squad|Gruppe)\s*\d+)", text, flags=re.I)
    blocks = [p for p in parts if clean_text(p)] or [text]

    results = []
    for block in blocks:
        block_clean = clean_text(block)
        if not name_parts_match(block_clean, real_name):
            continue
        squad, status = extract_squad_from_text(block_clean)
        hit = extract_from_segment(block_clean, real_name, squad, status)
        if hit:
            results.append(hit)

    # ZusÃ¤tzlich zeilenweise mit Squad-GedÃ¤chtnis wie im Backup.
    current_squad = "TBD"
    current_status = "Approved"
    for line in text.split("\n"):
        line_clean = clean_text(line)
        if not line_clean:
            continue
        sq, st = extract_squad_from_text(line_clean)
        if sq != "TBD" or "warteliste" in normalize_text(line_clean):
            current_squad, current_status = sq, st
        if name_parts_match(line_clean, real_name):
            hit = extract_from_segment(line_clean, real_name, current_squad, current_status)
            if hit:
                results.append(hit)

    return dedupe_hits(results)


def dedupe_hits(hits):
    unique = []
    seen = set()
    for h in hits:
        key = (h.get("squad"), h.get("status"), h.get("division"), clean_text(h.get("raw", ""))[:120])
        if key in seen:
            continue
        seen.add(key)
        unique.append(h)
    return unique


def find_users_on_current_page(driver, users, already_found):
    page_hits = {}
    remaining = [u for u in users if u["id"] not in already_found]
    for user in remaining:
        name = user["real_name"]
        hits = []
        hits.extend(scan_tables(driver, name))
        hits.extend(scan_body_text(driver, name))
        hits = dedupe_hits(hits)
        if hits:
            page_hits[user["id"]] = hits[0]
    return page_hits


def scrape_ipscmatch_and_sync():
    app_users = get_app_users()
    if not app_users:
        log("Keine User gefunden. Breche ab.")
        return 0

    log("Starte Chrome-Browser...")
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125 Safari/537.36")
    chrome_options.page_load_strategy = "eager"

    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(45)

        log("Lade IPSCMatch-Startseite...")
        robust_get(driver, BASE_URL, wait_seconds=2)

        log("Suche nach Matches...")
        match_links = extract_match_links_from_current_page(driver)
        if not match_links:
            log("KRITISCH: Keine Match-Links gefunden. IPSCMatch war vermutlich nicht erreichbar oder hat leer geladen.")
            return 1

        log(f"{len(match_links)} Matches gefunden.")

        for match in match_links:
            log(f"\n--- Durchsuche: {match['name']} ---")
            if not robust_get(driver, match["url"], wait_seconds=1.5):
                continue

            real_match_date, real_location = extract_date_and_location(driver)
            candidate_urls = discover_candidate_urls(driver, match["url"])

            found_users = set()
            for url in candidate_urls:
                if len(found_users) >= len(app_users):
                    break
                if not robust_get(driver, url, wait_seconds=1.0):
                    continue

                hits = find_users_on_current_page(driver, app_users, found_users)
                for user_id, hit in hits.items():
                    user = next((u for u in app_users if u["id"] == user_id), None)
                    if not user:
                        continue

                    found_users.add(user_id)
                    div = hit.get("division")
                    final_analysis_url = analysis_url(match["url"], div) if div else None

                    log(
                        f"ð¯ TREFFER: '{user['real_name']}' -> {hit.get('squad')} ({hit.get('status')}) | "
                        f"Division: {div} | Segment: {hit.get('raw')}"
                    )

                    match_data = {
                        "match_name": match["name"],
                        "match_date": real_match_date,
                        "location": real_location,
                        "status": hit.get("status") or "Approved",
                        "squad": hit.get("squad") or "TBD",
                        "match_url": match["url"],
                        "division": div,
                        "analysis_url": final_analysis_url,
                    }
                    update_or_create_match(user_id, user["real_name"], match_data)

        return 0

    except Exception as e:
        log(f"KRITISCHER FEHLER: {e}")
        return 1
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass


if __name__ == "__main__":
    sys.exit(scrape_ipscmatch_and_sync())
