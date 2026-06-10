import pandas as pd
import re
import time
import io
import os
import math

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from supabase import create_client, Client

# ==========================================
# 1. SUPABASE KONFIGURATION
# ==========================================
SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Nur Handgun-Divisionen aus der Tab-Leiste auf ipscelo.com
DIVISIONS = [
    "Production",
    "Production Optics",
    "Open",
    "Optics",
    "Standard",
    "Classic",
    "Revolver",
]

# Fallback, falls ein Tab-Klick nicht klappt.
# Diese IDs werden nur als Notfall-Variante genutzt.
DIVISION_URL_IDS = {
    "Production": 4,
    "Production Optics": 5,
    "Open": 3,
    "Optics": 39,
    "Standard": 2,
    "Classic": 6,
    "Revolver": 7,
}

ROWS_PER_PAGE_TARGET = 1000
MAX_PAGES_PER_DIVISION = 20
PAGE_LOAD_WAIT_SECONDS = 10


def log(msg):
    print(msg, flush=True)


def safe_int(val):
    try:
        return int(float(val))
    except Exception:
        return 0


def safe_float(val):
    try:
        return float(val)
    except Exception:
        return 0.0


def clean_columns(df):
    df = df.copy()
    df.columns = [re.sub(r'[^a-zA-Z0-9]', '', str(col)).strip() for col in df.columns]
    return df


def get_biggest_table(driver):
    html_content = driver.page_source
    dfs = pd.read_html(io.StringIO(html_content))
    if not dfs:
        return None
    return clean_columns(max(dfs, key=len))


def wait_for_table(driver, timeout=25):
    WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.TAG_NAME, "table")))
    time.sleep(2)


def get_showing_info(driver):
    """Liest die sichtbare Tabellenanzeige nahe der grossen Tabelle.

    Wichtig: Auf ipscelo.com koennen mehrere "Showing ..." Texte im DOM liegen.
    Deshalb nehmen wir nicht einfach den ersten Treffer im body, sondern den Text
    direkt unter der groessten sichtbaren Tabelle.
    """
    try:
        script = """
        function isVisible(el) {
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return style.display !== 'none' &&
                 style.visibility !== 'hidden' &&
                 r.width > 0 &&
                 r.height > 0 &&
                 r.bottom > 0 &&
                 r.top < window.innerHeight;
        }

        const tables = Array.from(document.querySelectorAll('table'))
          .filter(isVisible)
          .map(t => ({el: t, rect: t.getBoundingClientRect(), rows: t.querySelectorAll('tr').length}))
          .sort((a, b) => b.rows - a.rows);

        if (!tables.length) return '';

        const table = tables[0];
        const bottom = table.rect.bottom;
        const left = table.rect.left - 80;
        const right = table.rect.right + 80;

        const pieces = [];
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          if (!isVisible(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.top >= bottom - 20 && r.top <= bottom + 260 && r.right >= left && r.left <= right) {
            const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
            if (txt && txt.includes('Showing')) pieces.push(txt);
          }
        }
        return pieces.join(' | ');
        """
        near_table_text = driver.execute_script(script) or ""
        m = re.search(r"Showing\s+(\d+)\s+(?:to|-)\s+(\d+)\s+of\s+(\d+)\s+rows", near_table_text, re.I)
        if m:
            return (safe_int(m.group(1)), safe_int(m.group(2)), safe_int(m.group(3)))
    except Exception:
        pass

    # Fallback: alter Weg ueber body-Text.
    try:
        text = driver.find_element(By.TAG_NAME, "body").text
        matches = re.findall(r"Showing\s+(\d+)\s+(?:to|-)\s+(\d+)\s+of\s+(\d+)\s+rows", text, re.I)
        if matches:
            # Nimm den Treffer mit dem groessten Total, damit versteckte/kleine Tabellen
            # nicht versehentlich die Haupttabelle ueberschreiben.
            best = max(matches, key=lambda x: safe_int(x[2]))
            return (safe_int(best[0]), safe_int(best[1]), safe_int(best[2]))
    except Exception:
        pass

    return (0, 0, 0)


def get_visible_table_row_count(driver):
    df = get_biggest_table(driver)
    if df is None:
        return 0
    return len(df)


def wait_until_showing_range(driver, expected_start, expected_end, total_rows, timeout=45):
    """Wartet, bis unten die erwartete Range steht und genug Tabellenzeilen geladen sind."""
    deadline = time.time() + timeout
    expected_count = max(1, expected_end - expected_start + 1) if expected_end and expected_start else 0

    while time.time() < deadline:
        try:
            wait_for_table(driver, timeout=5)
            start, end, total = get_showing_info(driver)
            row_count = get_visible_table_row_count(driver)

            total_ok = (not total_rows) or (total == total_rows) or (total >= total_rows)
            range_ok = start == expected_start and end == expected_end
            rows_ok = (not expected_count) or row_count >= min(expected_count, ROWS_PER_PAGE_TARGET) * 0.95

            if total_ok and range_ok and rows_ok:
                return True
        except Exception:
            pass
        time.sleep(2)

    return False

def get_total_rows_from_page(driver):
    return get_showing_info(driver)[2]


def table_signature(driver):
    df = get_biggest_table(driver)
    if df is None or len(df) == 0:
        return ""
    head = df.head(3).to_csv(index=False)
    tail = df.tail(3).to_csv(index=False)
    return head + "\n" + tail


def click_division_tab(driver, division):
    """Klickt einen sichtbaren Division-Tab. Scrollt vorher nach oben, damit Tabs sichtbar sind."""
    try:
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)

        script = """
        const target = arguments[0];

        function isVisible(el) {
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return style.display !== 'none' &&
                 style.visibility !== 'hidden' &&
                 r.width > 0 &&
                 r.height > 0 &&
                 r.bottom > 0 &&
                 r.top < window.innerHeight;
        }

        const selectors = [
          'button', 'a', '[role="tab"]', '.nav-link', 'li', 'span', 'div'
        ];

        const candidates = [];
        for (const sel of selectors) {
          for (const el of document.querySelectorAll(sel)) {
            const txt = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
            if (txt !== target) continue;
            if (!isVisible(el)) continue;

            const r = el.getBoundingClientRect();

            // Nicht in Profil-/Modal-Bereichen oder Footer greifen.
            const inModal = !!el.closest('.modal');
            if (inModal) continue;

            candidates.push({el, top: r.top, left: r.left});
          }
        }

        if (!candidates.length) return false;

        // Der echte Tab sitzt weit oben oberhalb der Tabelle.
        candidates.sort((a, b) => a.top - b.top || a.left - b.left);
        const targetEl = candidates[0].el;
        targetEl.scrollIntoView({block: 'center'});
        targetEl.click();
        return true;
        """
        if bool(driver.execute_script(script, division)):
            return True

        # Fallback: XPath exakt nach Text
        elements = driver.find_elements(By.XPATH, f"//*[normalize-space(text())='{division}']")
        for el in elements:
            try:
                if el.is_displayed():
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
                    driver.execute_script("arguments[0].click();", el)
                    return True
            except Exception:
                continue

    except Exception as e:
        log(f"WARN: Division-Tab-Klick fuer {division} fehlgeschlagen: {e}")

    return False


def open_division_by_url(driver, division):
    """Notfall-Fallback, falls die Tabs nicht klickbar sind."""
    division_id = DIVISION_URL_IDS.get(division)
    if not division_id:
        return False

    try:
        if division == "Production":
            driver.get("https://ipscelo.com/")
        else:
            driver.get(f"https://ipscelo.com/index.html?divisionid={division_id}")
        wait_for_table(driver, timeout=25)
        time.sleep(35)
        return True
    except Exception as e:
        log(f"WARN: URL-Fallback fuer {division} fehlgeschlagen: {e}")
        return False


def set_rows_per_page_1000(driver):
    """Stellt, falls moeglich, 1000 rows per page ein."""
    try:
        body_text = driver.find_element(By.TAG_NAME, "body").text
        if "1000" in body_text and "rows per page" in body_text:
            return

        script = """
        const tables = Array.from(document.querySelectorAll('table'))
          .filter(t => t.offsetParent !== null)
          .map(t => ({el: t, rect: t.getBoundingClientRect(), rows: t.querySelectorAll('tr').length}))
          .sort((a, b) => b.rows - a.rows);
        if (!tables.length) return false;
        const tableBottom = tables[0].rect.bottom;

        function isVisible(el) {
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        }

        const els = Array.from(document.querySelectorAll('button, select, div, span'));
        for (const el of els) {
          const txt = (el.innerText || el.textContent || '').trim();
          const r = el.getBoundingClientRect();
          if (isVisible(el) && r.top >= tableBottom - 20 && r.top < tableBottom + 180 && (txt === '1000' || txt.includes('rows per page'))) {
            el.scrollIntoView({block: 'center'});
            el.click();
            return true;
          }
        }
        return false;
        """
        driver.execute_script(script)
        time.sleep(1)

        script2 = """
        function isVisible(el) {
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        }
        const els = Array.from(document.querySelectorAll('button, div, span, li, option'));
        for (const el of els) {
          const txt = (el.innerText || el.textContent || '').trim();
          if (isVisible(el) && txt === '1000') {
            el.click();
            return true;
          }
        }
        return false;
        """
        driver.execute_script(script2)
        time.sleep(4)
        wait_for_table(driver)
    except Exception as e:
        log(f"WARN: Rows-per-page konnte nicht gesetzt werden, Scraper laeuft weiter: {e}")


def click_table_pagination(driver, target_page, total_rows):
    """Klickt die echte Tabellen-Pagination und wartet auf die exakte Ziel-Range."""
    expected_start = ((target_page - 1) * ROWS_PER_PAGE_TARGET) + 1
    expected_end = min(target_page * ROWS_PER_PAGE_TARGET, total_rows) if total_rows else 0

    script = """
    const target = String(arguments[0]);

    const tables = Array.from(document.querySelectorAll('table'))
      .filter(t => t.offsetParent !== null)
      .map(t => ({el: t, rect: t.getBoundingClientRect(), rows: t.querySelectorAll('tr').length}))
      .sort((a, b) => b.rows - a.rows);
    if (!tables.length) return false;
    const tableBottom = tables[0].rect.bottom;

    function isVisible(el) {
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    }

    const clickables = Array.from(document.querySelectorAll('button, a'));

    // 1) Wenn die Ziel-Seitennummer sichtbar ist, diese klicken.
    for (const el of clickables) {
      const txt = (el.innerText || el.textContent || '').trim();
      const r = el.getBoundingClientRect();
      const disabled = el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
      if (!disabled && isVisible(el) && txt === target && r.top >= tableBottom - 60 && r.top < tableBottom + 260) {
        el.scrollIntoView({block: 'center'});
        el.click();
        return true;
      }
    }

    // 2) Sonst den echten Tabellen-Weiter-Button rechts unter der Tabelle klicken.
    const nextCandidates = [];
    for (const el of clickables) {
      const txt = (el.innerText || el.textContent || '').trim();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const r = el.getBoundingClientRect();
      const disabled = el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
      const isNext = txt === 'Ã¢ÂÂº' || txt === '>' || txt === 'Next' || aria.includes('next') || title.includes('next');
      if (!disabled && isVisible(el) && isNext && r.top >= tableBottom - 60 && r.top < tableBottom + 260) {
        nextCandidates.push({el, left: r.left});
      }
    }
    if (nextCandidates.length) {
      nextCandidates.sort((a, b) => b.left - a.left);
      nextCandidates[0].el.scrollIntoView({block: 'center'});
      nextCandidates[0].el.click();
      return true;
    }
    return false;
    """
    clicked = bool(driver.execute_script(script, target_page))
    if not clicked:
        return False

    # ipscelo laedt nach dem Seitenwechsel sichtbar verzoegert.
    time.sleep(PAGE_LOAD_WAIT_SECONDS)

    if total_rows and expected_end:
        return wait_until_showing_range(driver, expected_start, expected_end, total_rows, timeout=45)

    # Fallback ohne Total: kurze Wartezeit reicht dann.
    try:
        wait_for_table(driver, timeout=10)
        return True
    except Exception:
        return False


def dataframe_to_entries(df, division, total_rows=0, expected_start=0, expected_end=0):
    if df is None or len(df) < 10:
        return []

    rank_col = 'Rank' if 'Rank' in df.columns else df.columns[1]
    region_col = 'Region' if 'Region' in df.columns else df.columns[2]
    lastname_col = 'Lastname' if 'Lastname' in df.columns else df.columns[3]
    firstname_col = 'Firstname' if 'Firstname' in df.columns else df.columns[4]
    category_col = 'Category' if 'Category' in df.columns else df.columns[5]
    matches_col = 'Matches' if 'Matches' in df.columns else df.columns[6]
    elo_col = 'EloRating' if 'EloRating' in df.columns else df.columns[7]
    rc_col = 'RC' if 'RC' in df.columns else df.columns[8]

    entries = []
    for _, row in df.iterrows():
        rank = safe_int(row.get(rank_col, 0))

        # Wichtig: letzte Seite sauber begrenzen.
        # Beispiel Production: total_rows=5649, Seite 6 darf nur Rank 5001-5649 enthalten.
        if total_rows and (rank < 1 or rank > total_rows):
            continue
        if expected_start and rank < expected_start:
            continue
        if expected_end and rank > expected_end:
            continue

        lastname = str(row.get(lastname_col, 'Unknown')).strip()
        firstname = str(row.get(firstname_col, '')).strip()

        if lastname == 'nan' or lastname == 'Unknown' or 'loading' in lastname.lower():
            continue

        full_name = f"{lastname}, {firstname}" if firstname and firstname != 'nan' else lastname

        region_name = str(row.get(region_col, '')).strip()
        if region_name == 'nan':
            region_name = 'Unknown'

        cat = str(row.get(category_col, '')).strip()
        if cat == 'nan':
            cat = ''

        rc_class = str(row.get(rc_col, '')).strip()
        if rc_class == 'nan':
            rc_class = ''

        entry = {
            "rank": rank,
            "region": region_name,
            "lastname": full_name,
            "category": cat,
            "matches": safe_int(row.get(matches_col, 0)),
            "elo_rating": safe_float(row.get(elo_col, 0)),
            "class_style": rc_class,
            "division": division
        }
        entries.append(entry)

    return entries


def upload_entries(entries, division, total_rows=0):
    if len(entries) < 10:
        log(f"ERROR: Zu wenig Daten fuer {division}. Abbruch zum Schutz der DB.")
        return False

    # Schutz: Wenn eine Division viele Rows haben sollte, aber viel zu wenig gesammelt wurde,
    # nicht die bestehenden Daten loeschen.
    if total_rows and len(entries) < max(10, int(total_rows * 0.80)):
        log(f"ERROR: Nur {len(entries)} von erwarteten {total_rows} Daten fuer {division}. Kein Upload, damit die DB nicht kaputtgeht.")
        return False

    log(f"Loesche alte {division}-Eintraege aus Supabase...")
    supabase.table("elo_rankings").delete().eq("division", division).execute()
    time.sleep(1)

    log(f"Lade {len(entries)} {division}-Eintraege hoch...")
    upload_data = []
    for index, entry in enumerate(entries):
        log(f"[{index + 1}/{len(entries)}] Scrape: {entry['lastname']} | Land: {entry['region']} | ELO: {entry['elo_rating']} | Division: {division}")
        upload_data.append(entry)

        if len(upload_data) >= 20:
            supabase.table("elo_rankings").insert(upload_data).execute()
            upload_data = []
            time.sleep(1)

    if upload_data:
        supabase.table("elo_rankings").insert(upload_data).execute()

    log(f"{division} erfolgreich aktualisiert.")
    return True


def scrape_division(driver, division):
    log("\n==============================")
    log(f"Starte Division: {division}")
    log("==============================")

    clicked = click_division_tab(driver, division)
    if not clicked:
        log(f"WARN: Konnte Division-Tab nicht klicken: {division}. Versuche URL-Fallback.")
        if not open_division_by_url(driver, division):
            log(f"WARN: Ueberspringe Division: {division}.")
            return False

    time.sleep(PAGE_LOAD_WAIT_SECONDS)
    wait_for_table(driver)
    set_rows_per_page_1000(driver)

    start, end, total_rows = get_showing_info(driver)
    expected_pages = math.ceil(total_rows / ROWS_PER_PAGE_TARGET) if total_rows else MAX_PAGES_PER_DIVISION
    expected_pages = min(max(expected_pages, 1), MAX_PAGES_PER_DIVISION)
    log(f"{division}: erwartete Seiten: {expected_pages} (Total rows: {total_rows or 'unbekannt'})")

    all_entries = []
    seen_rows = set()

    for page_no in range(1, expected_pages + 1):
        start, end, current_total = get_showing_info(driver)
        # Total rows darf waehrend einer Division nicht kleiner werden.
        # Sonst koennen falsche/alte "Showing"-Texte die Pagination zu frueh stoppen.
        if current_total and current_total > total_rows:
            total_rows = current_total

        expected_start = ((page_no - 1) * ROWS_PER_PAGE_TARGET) + 1
        expected_end = min(page_no * ROWS_PER_PAGE_TARGET, total_rows) if total_rows else 0

        df = get_biggest_table(driver)
        if df is None or len(df) < 10:
            log(f"ERROR: Keine brauchbare Tabelle fuer {division} auf Seite {page_no} gefunden.")
            break

        log(f"{division}: Seite {page_no} mit {len(df)} Tabellenzeilen gefunden. Anzeige: {start}-{end} von {total_rows or 'unbekannt'}.")

        page_entries = dataframe_to_entries(
            df,
            division,
            total_rows=total_rows,
            expected_start=expected_start if total_rows else 0,
            expected_end=expected_end if total_rows else 0,
        )

        new_count = 0
        for entry in page_entries:
            key = (entry.get("division"), entry.get("rank"), entry.get("lastname"))
            if key not in seen_rows:
                seen_rows.add(key)
                all_entries.append(entry)
                new_count += 1

        log(f"{division}: {new_count} neue Eintraege von Seite {page_no} uebernommen.")

        # Nicht wegen 0 neuen Eintraegen abbrechen: bei langsamem Nachladen kann sonst
        # eine Division zu frueh enden. Gegen Endlosschleifen schuetzt der exakte
        # "Showing X to Y of Z"-Check in click_table_pagination.
        if page_no >= expected_pages:
            break

        if not click_table_pagination(driver, page_no + 1, total_rows):
            log(f"STOP: {division}: Konnte nicht zuverlaessig auf Seite {page_no + 1} wechseln. Stoppe Division statt Endlosschleife.")
            break

    if total_rows:
        log(f"{division}: gesammelt {len(all_entries)} von erwarteten {total_rows} Eintraegen.")

    return upload_entries(all_entries, division, total_rows=total_rows)


def scrape_and_upload_elo():
    url = "https://ipscelo.com/"
    log("Starte unsichtbaren Chrome-Browser fuer GitHub Actions...")

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.get(url)
        log("Webseite aufgerufen. Warte auf Tabelle...")

        try:
            wait_for_table(driver, timeout=25)
            log("Tabellen-Geruest im HTML gefunden.")
            log("Warte 35 Sekunden, bis die API alle Daten nachgeladen hat...")
            time.sleep(35)
        except Exception:
            log("ERROR: Timeout: Tabelle wurde nicht geladen.")
            driver.quit()
            return

        log("\n--- STARTE DATENVERARBEITUNG UND UPLOAD FUER ALLE DIVISIONEN ---\n")

        success_count = 0
        for division in DIVISIONS:
            if scrape_division(driver, division):
                success_count += 1

        log(f"\nUpdate fertig. Erfolgreiche Divisionen: {success_count}/{len(DIVISIONS)}.")

    except Exception as e:
        log(f"ERROR: Ein kritischer Fehler ist aufgetreten: {e}")
    finally:
        try:
            if driver:
                driver.quit()
        except Exception:
            pass


if __name__ == "__main__":
    scrape_and_upload_elo()
