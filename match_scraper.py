import os
import time
import re
import unicodedata
from urllib.parse import urlparse, parse_qs, quote, urljoin

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

BASE_URL = "https://ipscmatch.de/"

COUNTRY_CODES = {
    "GER", "DEU", "SUI", "CHE", "BEL", "NED", "POL", "AUT", "FRA", "ITA", "ESP", "POR",
    "LUX", "CZE", "SVK", "SLO", "SVN", "SRB", "NOR", "SWE", "DEN", "FIN", "USA", "BRA",
    "HUN", "CRO", "HRV", "GBR", "UK", "IRL", "LIE", "MON", "AND", "POL"
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


def normalize_text(text):
    """Normalisiert Umlaute und Text fÃ¼r einen robusten Abgleich."""
    if not text:
        return ""
    text = str(text).lower()
    text = text.replace("Ã¤", "ae").replace("Ã¶", "oe").replace("Ã¼", "ue").replace("Ã", "ss")
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


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
    """Findet Fabian SchÃ¶ps auch als Fabian Schoeps oder Fabian Schops."""
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
    match_id = get_match_id(url)
    if not match_id:
        return url
    return f"https://ipscmatch.de/index.pl?match={quote(match_id)}"


def analysis_url(match_url, division):
    if not division:
        return match_url
    return f"{base_match_url(match_url)}&complist&grepdiv={quote(division)}"


def extract_squad_from_text(text):
    text = clean_text(text)
    m = re.search(r"(?:Sq\.?|Squad|Gruppe)\s*(\d+)", text, re.I)
    if not m:
        return "TBD", "Approved"
    num = m.group(1)
    if num == "99" or re.search(r"warteliste", text, re.I):
        return "SQ99", "Warteliste"
    return f"Squad {num}", "Approved"


def extract_from_segment(segment, real_name, squad="TBD", status="Approved"):
    """Colab-Logik: Im Treffersegment nach Name -> nÃ¤chstes Land -> Division suchen."""
    if not name_parts_match(segment, real_name):
        return None

    tokens = clean_text(segment).split()
    if not tokens:
        return None

    # Name-Start im Originalsegment suchen; damit nehmen wir nicht die Division eines vorherigen SchÃ¼tzen.
    start_idx = 0
    for i in range(len(tokens)):
        window = " ".join(tokens[i:i + 6])
        if name_parts_match(window, real_name):
            start_idx = i
            break

    tail_tokens = tokens[start_idx:]
    country_idx = None
    for i, token in enumerate(tail_tokens):
        country = re.sub(r"[^A-Za-z]", "", token).upper()
        if country in COUNTRY_CODES:
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


def safe_get(driver, url, wait_seconds=1.5):
    """Selenium-Laden wie im Backup, aber mit window.stop() bei Timeout."""
    try:
        driver.get(url)
        time.sleep(wait_seconds)
        return True
    except Exception as exc:
        log(f"WARN: Timeout/Fehler beim Laden von {url}: {exc}")
        try:
            driver.execute_script("window.stop();")
            time.sleep(0.5)
            return True
        except Exception:
            return False


def get_body_text(driver):
    try:
        return driver.find_element(By.TAG_NAME, "body").text
    except Exception:
        return ""


def scan_tables_selenium(driver, real_name):
    """Liest echte Tabellenzeilen. Das lÃ¶st FÃ¤lle wie Fabian Schoeps in Squad 12."""
    results = []
    try:
        tables = driver.find_elements(By.CSS_SELECTOR, "table")
    except Exception:
        tables = []

    for table in tables:
        try:
            table_text = clean_text(table.text)
        except Exception:
            table_text = ""
        squad, status = extract_squad_from_text(table_text)

        try:
            rows = table.find_elements(By.CSS_SELECTOR, "tr")
        except Exception:
            rows = []

        for row_el in rows:
            try:
                cells = [clean_text(c.text) for c in row_el.find_elements(By.CSS_SELECTOR, "td, th")]
            except Exception:
                cells = []
            cells = [c for c in cells if c]
            if not cells:
                continue

            row = clean_text(" ".join(cells))
            if re.search(r"\b(Name|Vorname|Region|Division|Category|Nr\.?|PlÃ¤tze)\b", row, re.I):
                continue

            # 1) Tabellenstruktur: Nr | Name | Region | Division | Category
            for i, cell in enumerate(cells):
                country = re.sub(r"[^A-Za-z]", "", cell).upper()
                if country in COUNTRY_CODES and i >= 1:
                    name_cell = re.sub(r"^[âââÃxX\s#\d.\-]+", "", cells[i - 1]).strip()
                    if name_parts_match(name_cell, real_name):
                        div = normalize_division(" ".join(cells[i + 1:i + 4]))
                        if div:
                            results.append({
                                "squad": squad,
                                "status": status,
                                "division": div,
                                "raw": row,
                            })

            # 2) Fallback fÃ¼r zusammengeklebte Zeilen
            hit = extract_from_segment(row, real_name, squad, status)
            if hit:
                results.append(hit)

    return results


def scan_text_blocks(text, real_name):
    """Fallback fÃ¼r IPSCMatch-Seiten ohne saubere Tabellenstruktur."""
    text = str(text or "")
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
    return results


def dedupe_hits(hits):
    unique = []
    seen = set()
    for hit in hits:
        key = (hit.get("squad"), hit.get("status"), hit.get("division"), hit.get("raw", "")[:120])
        if key in seen:
            continue
        seen.add(key)
        unique.append(hit)
    return unique


def find_user_on_current_page(driver, real_name):
    hits = []
    hits.extend(scan_tables_selenium(driver, real_name))
    hits.extend(scan_text_blocks(get_body_text(driver), real_name))
    hits = dedupe_hits(hits)
    return hits[0] if hits else None


def candidate_urls_for_match(driver, match_url):
    """Backup-kompatibel: Selenium bleibt Quelle; wir probieren nur die bekannten IPSCMatch-Listen."""
    base = base_match_url(match_url)
    urls = [
        match_url,
        base,
        f"{base}&squads",
        f"{base}&list=starter",
        f"{base}&list=main_match",
        f"{base}&complist",
    ]

    # Link-Discovery aus der gerade geladenen Seite, ohne bs4/requests.
    try:
        links = driver.find_elements(By.CSS_SELECTOR, "a[href]")
        for link in links:
            href = link.get_attribute("href") or ""
            text = clean_text(link.text).lower()
            combined = f"{text} {href}".lower()
            if any(k in combined for k in ["squad", "starter", "teilnehmer", "shooter", "list", "complist", "main_match"]):
                urls.append(urljoin(base, href))
    except Exception:
        pass

    out = []
    seen = set()
    for url in urls:
        if not url:
            continue
        url = url.replace("index.php", "index.pl")
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out


def extract_date_and_location(driver):
    match_date = "2026-01-01"
    location = "Unbekannt"
    try:
        body_text = get_body_text(driver)
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


def build_db_payload(match_data, include_analysis_fields=True):
    payload = {
        "match_date": match_data["match_date"],
        "match_location": match_data["location"],
        "status": match_data["status"],
        "squad": match_data["squad"],
        "auto_imported": True,
        "match_url": match_data["match_url"],
    }
    if include_analysis_fields:
        payload["ipsc_division"] = match_data.get("division")
        payload["analysis_url"] = match_data.get("analysis_url")
    return payload


def execute_with_optional_analysis_fields(operation, table_query, payload):
    """Falls ipsc_division/analysis_url noch nicht in Supabase existieren, lÃ¤uft das Backup trotzdem weiter."""
    try:
        if operation == "update":
            return table_query.update(payload).execute()
        if operation == "insert":
            return table_query.insert(payload).execute()
    except Exception as exc:
        if "ipsc_division" not in str(exc) and "analysis_url" not in str(exc) and "column" not in str(exc).lower():
            raise
        log("WARN: Spalten ipsc_division/analysis_url fehlen offenbar. Speichere ohne diese Felder.")
        fallback = {k: v for k, v in payload.items() if k not in ("ipsc_division", "analysis_url")}
        if operation == "update":
            return table_query.update(fallback).execute()
        if operation == "insert":
            return table_query.insert(fallback).execute()


def update_or_create_match(user_id, real_name, match_data):
    match_name = match_data["match_name"]

    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()

    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        needs_update = (
            db_match.get("status") != match_data["status"] or
            db_match.get("squad") != match_data["squad"] or
            db_match.get("match_date") != match_data["match_date"] or
            db_match.get("ipsc_division") != match_data.get("division") or
            db_match.get("analysis_url") != match_data.get("analysis_url")
        )

        if needs_update:
            log(
                f"ð UPDATE: '{real_name}' bei '{match_name}' -> "
                f"Status: {match_data['status']} | Squad: {match_data['squad']} | "
                f"Division: {match_data.get('division') or '-'}"
            )
            payload = build_db_payload(match_data, include_analysis_fields=True)
            query = supabase.table("user_matches").eq("id", db_match["id"])
            execute_with_optional_analysis_fields("update", query, payload)
    else:
        log(
            f"â¨ NEU HINZUGEFÃGT: '{real_name}' wurde zum Match '{match_name}' eingetragen "
            f"(Squad: {match_data['squad']} | Status: {match_data['status']} | "
            f"Division: {match_data.get('division') or '-'})."
        )
        payload = {
            "user_id": user_id,
            "match_name": match_name,
            **build_db_payload(match_data, include_analysis_fields=True),
        }
        execute_with_optional_analysis_fields("insert", supabase.table("user_matches"), payload)


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
    chrome_options.page_load_strategy = "eager"

    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(25)

        safe_get(driver, BASE_URL, wait_seconds=2)

        log("Suche nach Matches...")
        match_links = []
        elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='match=']")
        for el in elements:
            url = el.get_attribute("href")
            name = clean_text(el.text)
            if url and name and url not in [m["url"] for m in match_links]:
                match_links.append({"name": name, "url": url})

        if not match_links:
            raise RuntimeError("Keine Match-Links gefunden. IPSCMatch-Startseite wurde vermutlich nicht korrekt geladen.")

        for match in match_links:
            log(f"\n--- Durchsuche: {match['name']} ---")

            safe_get(driver, match["url"], wait_seconds=1.5)
            real_match_date, real_location = extract_date_and_location(driver)
            urls_to_try = candidate_urls_for_match(driver, match["url"])

            found_users_in_match = set()

            for url in urls_to_try:
                if len(found_users_in_match) == len(app_users):
                    break

                safe_get(driver, url, wait_seconds=1.2)

                for user in app_users:
                    user_id = user["id"]
                    real_name = user["real_name"]

                    if user_id in found_users_in_match:
                        continue

                    hit = find_user_on_current_page(driver, real_name)
                    if not hit:
                        continue

                    found_users_in_match.add(user_id)
                    division = hit.get("division")
                    final_analysis_url = analysis_url(match["url"], division) if division else match["url"]

                    log(
                        f"ð¯ TREFFER: '{real_name}' -> {hit.get('squad')} ({hit.get('status')}) | "
                        f"Division: {division} | Segment: {hit.get('raw')}"
                    )

                    match_data = {
                        "match_name": match["name"],
                        "match_date": real_match_date,
                        "location": real_location,
                        "status": hit.get("status") or "Approved",
                        "squad": hit.get("squad") or "TBD",
                        "division": division,
                        "analysis_url": final_analysis_url,
                        "match_url": match["url"],
                    }
                    update_or_create_match(user_id, real_name, match_data)

    except Exception as e:
        log(f"KRITISCHER FEHLER: {e}")
        raise
    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
