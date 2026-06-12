import os
import re
import unicodedata
from urllib.parse import urlparse, parse_qs, quote, urljoin

import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# ==========================================
# SUPABASE KONFIGURATION
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://huprxirlthkisjngwash.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_URL = "https://ipscmatch.de/"

DIVISIONS = [
    "Production Optics",
    "Optics",
    "Production",
    "Standard",
    "Open",
    "Classic",
    "Revolver",
    "PCC",
]

REGION_CODES = [
    "GER", "DEU", "SUI", "CHE", "AUT", "BEL", "NED", "FRA", "LUX",
    "ESP", "ITA", "POL", "CZE", "SVK", "SLO", "SVN", "USA", "POR",
    "BRA", "NOR", "SWE", "DEN", "FIN", "GBR", "IRL", "HUN", "ROU",
    "BUL", "CRO", "SRB", "UKR", "EST", "LAT", "LTU"
]

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
})


def log(msg):
    print(msg, flush=True)


def strip_accents(value):
    value = str(value or "")
    return "".join(
        c for c in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(c)
    )


def normalize_text(value):
    value = str(value or "")
    value = value.replace("\xa0", " ")
    value = value.replace("✓", " ")
    value = value.replace("✔", " ")
    value = value.replace("✗", " ")
    value = value.replace("×", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_for_match(value):
    value = normalize_text(value).lower()
    value = value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    value = strip_accents(value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def make_name_variants(name):
    raw = normalize_text(name)
    parts = raw.split()
    variants = set()

    variants.add(raw)
    variants.add(raw.replace("ö", "oe").replace("ä", "ae").replace("ü", "ue").replace("ß", "ss"))
    variants.add(raw.replace("oe", "ö").replace("ae", "ä").replace("ue", "ü"))

    # Schöps/Schoeps/Schops-Fallback
    variants.add(strip_accents(raw))
    variants.add(
        strip_accents(
            raw.replace("ö", "oe").replace("ä", "ae").replace("ü", "ue").replace("ß", "ss")
        )
    )

    if len(parts) >= 2:
        first = parts[0]
        last = " ".join(parts[1:])
        variants.add(f"{last} {first}")
        variants.add(f"{last}, {first}")

        last_ascii = strip_accents(
            last.replace("ö", "oe").replace("ä", "ae").replace("ü", "ue").replace("ß", "ss")
        )
        first_ascii = strip_accents(first)
        variants.add(f"{first_ascii} {last_ascii}")
        variants.add(f"{last_ascii} {first_ascii}")

    return sorted({normalize_for_match(v) for v in variants if normalize_text(v)})


def extract_match_id(url):
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    match_id = qs.get("match", [None])[0]
    if not match_id:
        m = re.search(r"match=([A-Za-z0-9_]+)", url or "")
        match_id = m.group(1) if m else None
    return match_id


def build_base_match_url(match_id):
    return f"https://ipscmatch.de/index.pl?match={quote(match_id)}"


def build_analysis_url(match_id, division):
    if not match_id or not division:
        return None
    return f"https://ipscmatch.de/index.pl?match={quote(match_id)}&complist&grepdiv={quote(division)}"


def fetch_html(url):
    response = SESSION.get(url, timeout=30)
    response.raise_for_status()
    return response.text


def extract_date_and_location(html):
    match_date = "2026-01-01"
    location = "Unbekannt"
    text = BeautifulSoup(html or "", "html.parser").get_text("\n", strip=True)

    m = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", text)
    if m:
        match_date = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    else:
        m = re.search(r"(\d{4}-\d{2}-\d{2})", text)
        if m:
            match_date = m.group(1)

    loc = re.search(r"(?:Ort|Location|Austragungsort):\s*([^\n\r]+)", text, re.I)
    if loc:
        location = loc.group(1).strip()

    return match_date, location


def get_page_lines(html):
    soup = BeautifulSoup(html, "html.parser")
    lines = []

    # 1. Tabellenzeilen bevorzugen
    for tr in soup.select("tr"):
        txt = normalize_text(tr.get_text(" ", strip=True))
        if txt:
            lines.append(txt)

    # 2. Gesamttext zusätzlich in mögliche Starterzeilen zerlegen
    body_text = normalize_text(soup.get_text(" ", strip=True))
    split = re.sub(r"\s+(?=\d{1,4}\s+[A-Za-zÄÖÜäöüß#])", "\n", body_text)
    for line in split.splitlines():
        line = normalize_text(line)
        if line:
            lines.append(line)

    # Dedupe
    seen = set()
    unique = []
    for line in lines:
        key = normalize_for_match(line)
        if key not in seen:
            seen.add(key)
            unique.append(line)

    return unique


def line_contains_name(line, target_name):
    norm_line = normalize_for_match(line)
    variants = make_name_variants(target_name)

    if any(v and v in norm_line for v in variants):
        return True

    # Token-Fallback: Vorname + Nachname irgendwo in der Zeile
    parts = normalize_for_match(target_name).split()
    if len(parts) >= 2:
        return all(p in norm_line for p in parts)

    return False


def extract_division_after_name_and_region(line, target_name, forced_division=None):
    if forced_division:
        return forced_division

    norm_line = normalize_text(line)
    tokens = norm_line.split()
    norm_tokens = [normalize_for_match(t) for t in tokens]

    name_parts = normalize_for_match(target_name).split()
    if not name_parts:
        return None

    # Position des Namens ungefähr finden. Wichtig bei zusammengeklebten Zeilen:
    # Division wird ab dem Landeskürzel NACH dem gesuchten Namen gelesen.
    name_start = 0
    joined_norm = " ".join(norm_tokens)
    joined_name = " ".join(name_parts)

    char_pos = joined_norm.find(joined_name)
    if char_pos >= 0:
        prefix = joined_norm[:char_pos]
        name_start = len(prefix.split())
    else:
        # Falls Schöps/Schoeps-Variante nicht exakt matcht, Varianten probieren.
        for variant in make_name_variants(target_name):
            pos = joined_norm.find(variant)
            if pos >= 0:
                prefix = joined_norm[:pos]
                name_start = len(prefix.split())
                break

    region_idx = -1
    for i in range(name_start, len(tokens)):
        clean = re.sub(r"[^A-Za-z]", "", tokens[i]).upper()
        if clean in REGION_CODES:
            region_idx = i
            break

    if region_idx == -1:
        return None

    after_region = " ".join(tokens[region_idx + 1:])
    after_norm = normalize_for_match(after_region)

    # Reihenfolge wichtig: Production Optics vor Optics
    if "production optics" in after_norm or "prod optics" in after_norm or "prod opt" in after_norm:
        return "Production Optics"
    if re.search(r"\boptics?\b", after_norm):
        return "Optics"
    if re.search(r"\bproduction\b", after_norm):
        return "Production"
    if re.search(r"\bstandard\b", after_norm):
        return "Standard"
    if re.search(r"\bopen\b", after_norm):
        return "Open"
    if re.search(r"\bclassic\b", after_norm):
        return "Classic"
    if re.search(r"\brevolver\b", after_norm):
        return "Revolver"
    if re.search(r"\bpcc\b", after_norm):
        return "PCC"

    return None


def extract_squad_from_context(lines, hit_index):
    for i in range(hit_index, -1, -1):
        line = lines[i]
        m = re.search(r"\bSq\.?\s*(\d+)\b", line, re.I)
        if m:
            num = m.group(1)
            return "SQ99" if num == "99" else f"Squad {num}"

        m = re.search(r"\bSquad\s*(\d+)\b", line, re.I)
        if m:
            num = m.group(1)
            return "SQ99" if num == "99" else f"Squad {num}"

    return "TBD"


def extract_status_from_context(lines, hit_index, squad):
    window = " ".join(lines[max(0, hit_index - 5): hit_index + 1])
    if squad == "SQ99" or re.search(r"warteliste|wait\s*list|waiting", window, re.I):
        return "Warteliste"
    return "Approved"


def search_name_in_html(html, target_name, forced_division=None):
    lines = get_page_lines(html)

    for idx, line in enumerate(lines):
        if not line_contains_name(line, target_name):
            continue

        division = extract_division_after_name_and_region(line, target_name, forced_division=forced_division)
        if not division:
            continue

        squad = extract_squad_from_context(lines, idx)
        status = extract_status_from_context(lines, idx, squad)

        return {
            "name": target_name,
            "squad": squad,
            "status": status,
            "ipsc_division": division,
            "raw_line": line,
        }

    return None


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


def get_match_links():
    log("Lade IPSCMatch-Startseite...")
    html = fetch_html(BASE_URL)
    soup = BeautifulSoup(html, "html.parser")
    links = []
    seen_match_ids = set()

    for a in soup.select("a[href*='match=']"):
        href = a.get("href") or ""
        url = urljoin(BASE_URL, href)
        match_id = extract_match_id(url)
        if not match_id or match_id in seen_match_ids:
            continue
        seen_match_ids.add(match_id)

        name = normalize_text(a.get_text(" ", strip=True)) or match_id
        links.append({
            "name": name,
            "url": build_base_match_url(match_id),
            "match_id": match_id,
        })

    log(f"{len(links)} Match-Links gefunden.")
    return links


def candidate_urls_for_match(match_id):
    base = build_base_match_url(match_id)
    urls = [
        base,                       # WICHTIG: zuerst Hauptseite. PSC Fastsummer wird dort gefunden.
        f"{base}&squads",
        f"{base}&squads=1",
        f"{base}&list=starter",
        f"{base}&list=main_match",
        f"{base}&complist",
    ]

    for div in DIVISIONS:
        urls.append(build_analysis_url(match_id, div))

    seen = set()
    out = []
    for url in urls:
        if url and url not in seen:
            seen.add(url)
            out.append(url)
    return out


def forced_division_from_url(url):
    m = re.search(r"grepdiv=([^&]+)", url or "")
    if not m:
        return None
    raw = requests.utils.unquote(m.group(1))
    return raw if raw in DIVISIONS else None


def safe_db_write(kind, table_query, payload, fallback_payload=None):
    try:
        return table_query(payload).execute()
    except Exception as e:
        if fallback_payload is None:
            raise
        log(f"WARN: {kind} mit neuen Spalten fehlgeschlagen ({e}). Fallback ohne ipsc_division/analysis_url...")
        return table_query(fallback_payload).execute()


def update_or_create_match(user_id, real_name, match_data):
    match_name = match_data["match_name"]

    base_payload = {
        "match_date": match_data["match_date"],
        "match_location": match_data["location"],
        "status": match_data["status"],
        "squad": match_data["squad"],
        "auto_imported": True,
        "match_url": match_data["match_url"],
    }
    enhanced_payload = {
        **base_payload,
        "ipsc_division": match_data.get("ipsc_division"),
        "analysis_url": match_data.get("analysis_url"),
    }

    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()

    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        relevant_fields = ["status", "squad", "match_date", "ipsc_division", "analysis_url", "match_url"]
        changed = any(str(db_match.get(k)) != str(match_data.get(k)) for k in relevant_fields)

        if changed:
            log(
                f"🔄 UPDATE: '{real_name}' bei '{match_name}' -> "
                f"Status: {match_data['status']} | Squad: {match_data['squad']} | "
                f"Division: {match_data.get('ipsc_division') or '-'}"
            )
            safe_db_write(
                "Update",
                lambda payload: supabase.table("user_matches").update(payload).eq("id", db_match["id"]),
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
            f"✨ NEU: '{real_name}' -> '{match_name}' "
            f"(Squad: {match_data['squad']} | Status: {match_data['status']} | "
            f"Division: {match_data.get('ipsc_division') or '-'})"
        )
        safe_db_write(
            "Insert",
            lambda payload: supabase.table("user_matches").insert(payload),
            insert_payload,
            fallback_insert_payload,
        )


def scrape_ipscmatch_and_sync():
    app_users = get_app_users()
    if not app_users:
        log("Keine User gefunden. Breche ab.")
        return

    match_links = get_match_links()
    if not match_links:
        log("Keine Matches gefunden. Breche ab.")
        return

    for match in match_links:
        match_id = match["match_id"]
        canonical_match_url = build_base_match_url(match_id)
        log(f"\n--- Durchsuche: {match['name']} ---")

        try:
            main_html = fetch_html(canonical_match_url)
            match_date, location = extract_date_and_location(main_html)
        except Exception as e:
            log(f"WARN: Hauptseite konnte nicht geladen werden: {e}")
            match_date, location = "2026-01-01", "Unbekannt"

        urls = candidate_urls_for_match(match_id)

        # WICHTIG: pro Match können mehrere User gefunden werden.
        # Wir brechen nur die URL-Schleife für den EINEN User ab, sobald er gefunden wurde.
        for user in app_users:
            real_name = user.get("real_name") or ""
            found = None
            found_url = None

            for url in urls:
                try:
                    html = main_html if url == canonical_match_url and 'main_html' in locals() else fetch_html(url)
                    log(f"   Prüfe für {real_name}: {url} | HTML Länge: {len(html)}")
                    result = search_name_in_html(html, real_name, forced_division=forced_division_from_url(url))
                    if result:
                        found = result
                        found_url = url
                        break
                except Exception as e:
                    log(f"   WARN bei {url}: {e}")
                    continue

            if not found:
                continue

            analysis_url = build_analysis_url(match_id, found.get("ipsc_division"))
            log(
                f"🎯 TREFFER: '{real_name}' -> {found['squad']} ({found['status']}) | "
                f"Division: {found.get('ipsc_division') or '-'} | Raw: {found.get('raw_line')}"
            )
            log(f"   Analyse: {analysis_url}")

            match_data = {
                "match_name": match["name"],
                "match_date": match_date,
                "location": location,
                "status": found["status"],
                "squad": found["squad"],
                "match_url": canonical_match_url,
                "ipsc_division": found.get("ipsc_division"),
                "analysis_url": analysis_url,
                "starter_url": found_url,
            }
            update_or_create_match(user["id"], real_name, match_data)


if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
