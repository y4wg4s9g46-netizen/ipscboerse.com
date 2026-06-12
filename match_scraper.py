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


def log(msg):
    print(msg, flush=True)


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def normalize_text(text):
    """Umlaut-/Sonderzeichen-toleranter Vergleich wie im funktionierenden Colab-Test."""
    text = str(text or "").lower()
    text = text.replace("Ã¤", "ae").replace("Ã¶", "oe").replace("Ã¼", "ue").replace("Ã", "ss")
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def part_variants(part):
    raw = str(part or "").lower()
    variants = set()
    replacements = [
        {"Ã¤": "ae", "Ã¶": "oe", "Ã¼": "ue", "Ã": "ss"},
        {"Ã¤": "a",  "Ã¶": "o",  "Ã¼": "u",  "Ã": "ss"},
    ]
    for repl in replacements:
        v = raw
        for a, b in repl.items():
            v = v.replace(a, b)
        variants.add(normalize_text(v))
    variants.add(normalize_text(raw))
    return {v for v in variants if v}


def name_parts_match(text, real_name):
    """Findet z.B. Fabian SchÃ¶ps auch als Fabian Schoeps oder Fabian Schops."""
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


def make_analysis_url(match_url, division):
    if not division:
        return None
    return f"{base_match_url(match_url)}&complist&grepdiv={quote(division)}"


def extract_squad_from_text(text, previous_squad="TBD", previous_status="Approved"):
    text = clean_text(text)
    m = re.search(r"(?:Sq\.?|Squad|Gruppe)\s*(\d+)", text, re.I)
    if m:
        num = m.group(1)
        if num == "99" or re.search(r"warteliste", text, re.I):
            return "SQ99", "Warteliste"
        return f"Squad {num}", "Approved"
    if re.search(r"warteliste", text, re.I):
        return "SQ99", "Warteliste"
    return previous_squad, previous_status


def extract_from_segment(segment, real_name, squad="TBD", status="Approved"):
    """
    Kernlogik aus Colab, aber ohne BeautifulSoup-AbhÃ¤ngigkeit.
    Wichtig: Erst Zielnamen finden, dann erst das nÃ¤chste LandeskÃ¼rzel NACH diesem Namen nehmen.
    So wird bei zusammengeklebten Zeilen nicht die Division vom vorherigen SchÃ¼tzen gelesen.
    """
    if not name_parts_match(segment, real_name):
        return None

    tokens = clean_text(segment).split()
    if not tokens:
        return None

    start_idx = 0
    for i in range(len(tokens)):
        window = " ".join(tokens[i:i + 6])
        if name_parts_match(window, real_name):
            start_idx = i
            break

    tail_tokens = tokens[start_idx:]

    country_idx = None
    for i, token in enumerate(tail_tokens):
        token_clean = re.sub(r"[^A-Za-z]", "", token).upper()
        if token_clean in COUNTRY_CODES:
            country_idx = i
            break

    if country_idx is None:
        div = normalize_division(" ".join(tail_tokens[:10]))
        raw = " ".join(tail_tokens[:10])
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


def safe_update_user_match(row_id, update_data):
    """Falls ipsc_division/analysis_url noch nicht in Supabase existieren, fÃ¤llt er sauber zurÃ¼ck."""
    try:
        supabase.table("user_matches").update(update_data).eq("id", row_id).execute()
    except Exception as e:
        msg = str(e)
        if "ipsc_division" in msg or "analysis_url" in msg or "PGRST" in msg:
            fallback = {k: v for k, v in update_data.items() if k not in ("ipsc_division", "analysis_url")}
            supabase.table("user_matches").update(fallback).eq("id", row_id).execute()
        else:
            raise


def safe_insert_user_match(insert_data):
    try:
        supabase.table("user_matches").insert(insert_data).execute()
    except Exception as e:
        msg = str(e)
        if "ipsc_division" in msg or "analysis_url" in msg or "PGRST" in msg:
            fallback = {k: v for k, v in insert_data.items() if k not in ("ipsc_division", "analysis_url")}
            supabase.table("user_matches").insert(fallback).execute()
        else:
            raise


def update_or_create_match(user_id, real_name, match_data):
    match_name = match_data["match_name"]

    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()

    base_payload = {
        "match_date": match_data["match_date"],
        "match_location": match_data["location"],
        "status": match_data["status"],
        "squad": match_data["squad"],
        "auto_imported": True,
        "match_url": match_data["match_url"],
        "ipsc_division": match_data.get("ipsc_division"),
        "analysis_url": match_data.get("analysis_url"),
    }

    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        changed = (
            db_match.get("status") != match_data["status"] or
            db_match.get("squad") != match_data["squad"] or
            db_match.get("match_date") != match_data["match_date"] or
            db_match.get("match_url") != match_data["match_url"] or
            db_match.get("ipsc_division") != match_data.get("ipsc_division") or
            db_match.get("analysis_url") != match_data.get("analysis_url")
        )
        if changed:
            log(
                f"ð UPDATE: '{real_name}' bei '{match_name}' -> "
                f"Status: {match_data['status']} | Squad: {match_data['squad']} | "
                f"Division: {match_data.get('ipsc_division') or '-'}"
            )
            safe_update_user_match(db_match["id"], base_payload)
    else:
        log(
            f"â¨ NEU HINZUGEFÃGT: '{real_name}' wurde zum Match '{match_name}' eingetragen "
            f"(Squad: {match_data['squad']} | Status: {match_data['status']} | "
            f"Division: {match_data.get('ipsc_division') or '-'})."
        )
        insert_payload = {
            "user_id": user_id,
            "match_name": match_name,
            **base_payload,
        }
        safe_insert_user_match(insert_payload)


def discover_match_links(driver):
    log("Lade IPSCMatch-Startseite...")
    driver.get(BASE_URL)
    time.sleep(2)

    log("Suche nach Matches...")
    match_links = []
    seen = set()
    elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='match=']")
    for el in elements:
        url = el.get_attribute("href")
        name = clean_text(el.text)
        if not url:
            continue
        mid = get_match_id(url)
        if not mid or mid in seen:
            continue
        seen.add(mid)
        match_links.append({"name": name or mid, "url": url.replace("index.php", "index.pl")})

    log(f"{len(match_links)} Matches gefunden.")
    return match_links


def candidate_urls_for_current_match(driver, match_url):
    base = base_match_url(match_url)
    urls = [
        base,
        f"{base}&squads",
        f"{base}&list=starter",
        f"{base}&list=main_match",
        f"{base}&complist",
    ]

    try:
        links = driver.find_elements(By.CSS_SELECTOR, "a[href]")
        for a in links:
            href = a.get_attribute("href") or ""
            txt = clean_text(a.text)
            combined = f"{txt} {href}".lower()
            if any(k in combined for k in ["squad", "starter", "teilnehmer", "shooter", "list", "complist", "main_match"]):
                try:
                    urls.append(urljoin(match_url, href).replace("index.php", "index.pl"))
                except Exception:
                    pass
    except Exception:
        pass

    seen = set()
    out = []
    for u in urls:
        if not u or u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def scan_tables_on_page(driver, remaining_users):
    hits = {}
    try:
        tables = driver.find_elements(By.TAG_NAME, "table")
    except Exception:
        return hits

    for table in tables:
        try:
            table_text = clean_text(table.text)
        except Exception:
            continue
        table_squad, table_status = extract_squad_from_text(table_text)

        try:
            rows = table.find_elements(By.TAG_NAME, "tr")
        except Exception:
            rows = []

        for row_el in rows:
            try:
                cells = [clean_text(c.text) for c in row_el.find_elements(By.CSS_SELECTOR, "td,th")]
                cells = [c for c in cells if c]
                row_text = clean_text(" ".join(cells)) if cells else clean_text(row_el.text)
            except Exception:
                continue

            if not row_text or re.search(r"\b(Name|Vorname|Region|Division|Category)\b", row_text, re.I):
                continue

            row_squad, row_status = extract_squad_from_text(row_text, table_squad, table_status)

            for user in remaining_users:
                uid = user["id"]
                if uid in hits:
                    continue

                real_name = user["real_name"]

                # Strukturierte Tabellen: Name direkt vor Land, Division direkt nach Land.
                found_structured = False
                for i, c in enumerate(cells):
                    country = re.sub(r"[^A-Za-z]", "", c).upper()
                    if country in COUNTRY_CODES and i >= 1:
                        name_cell = re.sub(r"^[âââÃxX\s#\d.\-]+", "", cells[i - 1]).strip()
                        if name_parts_match(name_cell, real_name):
                            div = normalize_division(" ".join(cells[i + 1:i + 4]))
                            if div:
                                hits[uid] = {
                                    "squad": row_squad,
                                    "status": row_status,
                                    "division": div,
                                    "raw": row_text,
                                }
                                found_structured = True
                                break
                if found_structured:
                    continue

                hit = extract_from_segment(row_text, real_name, row_squad, row_status)
                if hit:
                    hits[uid] = hit

    return hits


def scan_body_text_on_page(driver, remaining_users):
    hits = {}
    try:
        body_text = driver.find_element(By.TAG_NAME, "body").text
    except Exception:
        return hits

    current_squad = "TBD"
    current_status = "Approved"

    # Body-Zeilen behalten die Squad-Reihenfolge aus der IPSCMatch-Seite.
    for raw_line in body_text.split("\n"):
        line = clean_text(raw_line)
        if not line:
            continue

        current_squad, current_status = extract_squad_from_text(line, current_squad, current_status)

        for user in remaining_users:
            uid = user["id"]
            if uid in hits:
                continue
            hit = extract_from_segment(line, user["real_name"], current_squad, current_status)
            if hit:
                hits[uid] = hit

    return hits


def scan_current_page(driver, remaining_users):
    hits = {}

    table_hits = scan_tables_on_page(driver, remaining_users)
    hits.update(table_hits)

    still_missing = [u for u in remaining_users if u["id"] not in hits]
    if still_missing:
        text_hits = scan_body_text_on_page(driver, still_missing)
        hits.update(text_hits)

    return hits


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
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.page_load_strategy = "eager"

    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(30)

        try:
            match_links = discover_match_links(driver)
        except Exception as e:
            log(f"KRITISCH: IPSCMatch-Startseite konnte nicht geladen werden: {e}")
            return

        for match in match_links:
            log(f"\n--- Durchsuche: {match['name']} ---")
            found_users_in_match = set()  # wichtig: pro Match + pro User nur einmal, aber mehrere User pro Match bleiben mÃ¶glich
            real_match_date = "2026-01-01"
            real_location = "Unbekannt"

            try:
                driver.get(match["url"])
                time.sleep(1.5)
                real_match_date, real_location = extract_date_and_location(driver)
                candidate_urls = candidate_urls_for_current_match(driver, match["url"])
            except Exception as e:
                log(f"WARN: Match-Hauptseite nicht ladbar: {e}")
                candidate_urls = [base_match_url(match["url"]), f"{base_match_url(match['url'])}&squads", f"{base_match_url(match['url'])}&complist"]

            for url in candidate_urls:
                remaining_users = [u for u in app_users if u["id"] not in found_users_in_match]
                if not remaining_users:
                    break

                try:
                    driver.get(url)
                    time.sleep(1.2)
                except Exception as e:
                    log(f"WARN: Kandidaten-Link nicht ladbar: {url} | {e}")
                    continue

                hits = scan_current_page(driver, remaining_users)
                if not hits:
                    continue

                for user in remaining_users:
                    uid = user["id"]
                    if uid not in hits:
                        continue

                    hit = hits[uid]
                    found_users_in_match.add(uid)
                    division = hit.get("division")
                    analysis_link = make_analysis_url(match["url"], division)

                    log(
                        f"ð¯ TREFFER: '{user['real_name']}' -> {hit.get('squad')} ({hit.get('status')}) | "
                        f"Division: {division}"
                    )
                    log(f"   RAW: {hit.get('raw', '')}")
                    if analysis_link:
                        log(f"   Analyse-Link: {analysis_link}")

                    match_data = {
                        "match_name": match["name"],
                        "match_date": real_match_date,
                        "location": real_location,
                        "status": hit.get("status", "Approved"),
                        "squad": hit.get("squad", "TBD"),
                        "match_url": match["url"],
                        "ipsc_division": division,
                        "analysis_url": analysis_link,
                    }
                    update_or_create_match(uid, user["real_name"], match_data)

    except Exception as e:
        log(f"KRITISCHER FEHLER: {e}")
    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    scrape_ipscmatch_and_sync()