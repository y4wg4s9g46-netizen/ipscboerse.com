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

ROWS_PER_PAGE_TARGET = 1000
MAX_PAGES_PER_DIVISION = 10
PAGE_LOAD_WAIT_SECONDS = 10


def log(msg):
    print(msg, flush=True)


def safe_int(val):
    try: return int(float(val))
    except: return 0


def safe_float(val):
    try: return float(val)
    except: return 0.0


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


def table_signature(driver):
    df = get_biggest_table(driver)
    if df is None or len(df) == 0:
        return ""
    # Signatur aus ersten und letzten Zeilen, damit wir erkennen, ob die Seite wirklich gewechselt hat
    head = df.head(3).to_csv(index=False)
    tail = df.tail(3).to_csv(index=False)
    return head + "\n" + tail


def get_total_rows_from_page(driver):
    text = driver.find_element(By.TAG_NAME, "body").text
    # Beispiel: Showing 1 to 1000 of 5649 rows
    m = re.search(r"Showing\s+\d+\s+to\s+\d+\s+of\s+(\d+)\s+rows", text, re.I)
    if m:
        return safe_int(m.group(1))
    return 0


def click_division_tab(driver, division):
    """Klickt nur sichtbare Division-Tabs im Bereich oberhalb der Rating-Tabelle."""
    script = """
    const target = arguments[0];
    const tables = Array.from(document.querySelectorAll('table'))
      .filter(t => t.offsetParent !== null)
      .map(t => ({el: t, rect: t.getBoundingClientRect(), rows: t.querySelectorAll('tr').length}))
      .sort((a, b) => b.rows - a.rows);
    const tableTop = tables.length ? tables[0].rect.top : window.innerHeight;

    const candidates = Array.from(document.querySelectorAll('button, a, [role="tab"], li'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || '').trim();
      if (txt !== target) continue;
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      // Division-Tabs liegen sichtbar oberhalb der Tabelle, nicht unten im Profil-Modal/Footer.
      if (visible && r.top > 0 && r.top < tableTop + 20) {
        el.scrollIntoView({block: 'center'});
        el.click();
        return true;
      }
    }
    return false;
    """
    return bool(driver.execute_script(script, division))


def set_rows_per_page_1000(driver):
    """Stellt, falls mÃ¶glich, 1000 rows per page ein. Wenn es schon aktiv ist, bleibt alles unverÃ¤ndert."""
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
        const table = tables[0];
        const tableBottom = table.rect.bottom;
        const els = Array.from(document.querySelectorAll('button, select, div, span'));
        for (const el of els) {
          const txt = (el.innerText || el.textContent || '').trim();
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const visible = style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
          if (visible && r.top >= tableBottom - 20 && r.top < tableBottom + 160 && (txt === '1000' || txt.includes('rows per page'))) {
            el.scrollIntoView({block: 'center'});
            el.click();
            return true;
          }
        }
        return false;
        """
        driver.execute_script(script)
        time.sleep(1)

        # Falls nach dem Ãffnen ein 1000-MenÃ¼punkt sichtbar ist, diesen anklicken.
        script2 = """
        const els = Array.from(document.querySelectorAll('button, div, span, li, option'));
        for (const el of els) {
          const txt = (el.innerText || el.textContent || '').trim();
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const visible = style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
          if (visible && txt === '1000') {
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
        log(f"â ï¸ Rows-per-page konnte nicht gesetzt werden, scraper lÃ¤uft weiter: {e}")


def click_table_pagination(driver, target_page):
    """Klickt die Pagination direkt unter der Rating-Tabelle. Keine Carousel-Next-Buttons."""
    old_sig = table_signature(driver)
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

    // 1) Wenn die gewÃ¼nschte Seitennummer sichtbar ist, diese klicken.
    const clickables = Array.from(document.querySelectorAll('button, a'));
    for (const el of clickables) {
      const txt = (el.innerText || el.textContent || '').trim();
      const r = el.getBoundingClientRect();
      const disabled = el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
      if (!disabled && isVisible(el) && txt === target && r.top >= tableBottom - 30 && r.top < tableBottom + 180) {
        el.scrollIntoView({block: 'center'});
        el.click();
        return true;
      }
    }

    // 2) Sonst den echten Tabellen-Weiter-Button rechts unter der Tabelle klicken.
    const nextTexts = new Set(['âº', '>', 'Next', 'next']);
    const nextCandidates = [];
    for (const el of clickables) {
      const txt = (el.innerText || el.textContent || '').trim();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const r = el.getBoundingClientRect();
      const disabled = el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
      const isNext = nextTexts.has(txt) || aria.includes('next') || title.includes('next');
      if (!disabled && isVisible(el) && isNext && r.top >= tableBottom - 30 && r.top < tableBottom + 180) {
        nextCandidates.push({el, left: r.left});
      }
    }
    if (nextCandidates.length) {
      nextCandidates.sort((a, b) => b.left - a.left); // rechter Button ist Tabellen-Next
      nextCandidates[0].el.scrollIntoView({block: 'center'});
      nextCandidates[0].el.click();
      return true;
    }
    return false;
    """
    clicked = bool(driver.execute_script(script, target_page))
    if not clicked:
        return False

    # ipscelo lÃ¤dt die Tabellenwerte nach dem Seitenwechsel verzÃ¶gert.
    # Deshalb bewusst 10 Sekunden warten und erst dann prÃ¼fen, ob wirklich neue Werte da sind.
    time.sleep(PAGE_LOAD_WAIT_SECONDS)
    try:
        wait_for_table(driver, timeout=10)
        new_sig = table_signature(driver)
        if new_sig and new_sig != old_sig:
            return True
    except Exception:
        pass
    return False


def dataframe_to_entries(df, division):
    if df is None or len(df) < 10:
        return []

    # Exakte Zuordnung der Spalten basierend auf deiner Analyse
    rank_col = 'Rank' if 'Rank' in df.columns else df.columns[1]
    region_col = 'Region' if 'Region' in df.columns else df.columns[2]
    lastname_col = 'Lastname' if 'Lastname' in df.columns else df.columns[3]
    firstname_col = 'Firstname' if 'Firstname' in df.columns else df.columns[4]
    category_col = 'Category' if 'Category' in df.columns else df.columns[5]
    matches_col = 'Matches' if 'Matches' in df.columns else df.columns[6]
    elo_col = 'EloRating' if 'EloRating' in df.columns else df.columns[7]
    rc_col = 'RC' if 'RC' in df.columns else df.columns[8]

    entries = []
    for index, row in df.iterrows():
        lastname = str(row.get(lastname_col, 'Unknown')).strip()
        firstname = str(row.get(firstname_col, '')).strip()

        # Zeilen Ã¼berspringen, falls noch Lade-Reste drin sind
        if lastname == 'nan' or lastname == 'Unknown' or 'loading' in lastname.lower():
            continue

        # Vornamen anhÃ¤ngen falls vorhanden, um den vollen Namen zu speichern
        full_name = f"{lastname}, {firstname}" if firstname and firstname != 'nan' else lastname

        # Region auslesen (z.B. "France")
        region_name = str(row.get(region_col, '')).strip()
        if region_name == 'nan': region_name = 'Unknown'

        # Kategorie (Junior, Lady, etc.) bereinigen
        cat = str(row.get(category_col, '')).strip()
        if cat == 'nan': cat = ''

        # RC-Wert bereinigen
        rc_class = str(row.get(rc_col, '')).strip()
        if rc_class == 'nan': rc_class = ''

        # Datensatz fÃ¼r Supabase aufbauen
        entry = {
            "rank": safe_int(row.get(rank_col, 0)),
            "region": region_name,        # Speichert jetzt z.B. "France", "Germany"
            "lastname": full_name,         # Speichert "Grauffel, Eric"
            "category": cat,
            "matches": safe_int(row.get(matches_col, 0)),
            "elo_rating": safe_float(row.get(elo_col, 0)),
            "class_style": rc_class,
            "division": division
        }
        entries.append(entry)
    return entries


def upload_entries(entries, division):
    if len(entries) < 10:
        log(f"â Fehler: Zu wenig Daten fÃ¼r {division}. Abbruch zum Schutz der DB.")
        return

    log(f"ð§¹ LÃ¶sche alte {division}-EintrÃ¤ge aus Supabase...")
    supabase.table("elo_rankings").delete().eq("division", division).execute()
    time.sleep(1)

    log(f"ð¤ Lade {len(entries)} {division}-EintrÃ¤ge hoch...")
    upload_data = []
    for index, entry in enumerate(entries):
        log(f"[{index + 1}/{len(entries)}] ð¤ Scrape: {entry['lastname']} | Land: {entry['region']} | ELO: {entry['elo_rating']} | Division: {division}")
        upload_data.append(entry)

        # In 20er-BlÃ¶cken hochladen (schont die Supabase-API)
        if len(upload_data) >= 20:
            supabase.table("elo_rankings").insert(upload_data).execute()
            upload_data = []
            time.sleep(1)

    # Den verbleibenden Rest hochladen
    if upload_data:
        supabase.table("elo_rankings").insert(upload_data).execute()

    log(f"â {division} erfolgreich aktualisiert.")


def scrape_division(driver, division):
    log(f"\n==============================")
    log(f"ð Starte Division: {division}")
    log(f"==============================")

    if not click_division_tab(driver, division):
        log(f"â ï¸ Konnte Division-Tab nicht klicken: {division}. Ãberspringe diese Division.")
        return

    time.sleep(PAGE_LOAD_WAIT_SECONDS)
    wait_for_table(driver)
    set_rows_per_page_1000(driver)

    total_rows = get_total_rows_from_page(driver)
    expected_pages = math.ceil(total_rows / ROWS_PER_PAGE_TARGET) if total_rows else MAX_PAGES_PER_DIVISION
    expected_pages = min(max(expected_pages, 1), MAX_PAGES_PER_DIVISION)
    log(f"ð {division}: erwartete Seiten: {expected_pages} (Total rows: {total_rows or 'unbekannt'})")

    all_entries = []
    seen_rows = set()

    for page_no in range(1, expected_pages + 1):
        df = get_biggest_table(driver)
        if df is None or len(df) < 10:
            log(f"â Keine brauchbare Tabelle fÃ¼r {division} auf Seite {page_no} gefunden.")
            break

        log(f"ð {division}: Seite {page_no} mit {len(df)} Zeilen gefunden.")
        page_entries = dataframe_to_entries(df, division)

        new_count = 0
        for entry in page_entries:
            # Rank + Name + Division reicht hier als Duplikat-Schutz Ã¼ber Seiten hinweg
            key = (entry.get("division"), entry.get("rank"), entry.get("lastname"))
            if key not in seen_rows:
                seen_rows.add(key)
                all_entries.append(entry)
                new_count += 1

        log(f"â {division}: {new_count} neue EintrÃ¤ge von Seite {page_no} Ã¼bernommen.")

        # Sicherheitsbremse: Wenn nach einem Seitenwechsel keine neuen EintrÃ¤ge kommen,
        # lesen wir vermutlich dieselbe Seite erneut. Dann stoppen wir diese Division.
        if page_no > 1 and new_count == 0:
            log(f"â {division}: Seite {page_no} brachte 0 neue EintrÃ¤ge. Stoppe Division gegen Endlosschleife.")
            break

        if page_no >= expected_pages:
            break

        if not click_table_pagination(driver, page_no + 1):
            log(f"â {division}: Konnte nicht zuverlÃ¤ssig auf Seite {page_no + 1} wechseln. Stoppe Division statt Endlosschleife.")
            break

    upload_entries(all_entries, division)


def scrape_and_upload_elo():
    url = "https://ipscelo.com/?divisionid=39"
    log("ð Starte unsichtbaren Chrome-Browser fÃ¼r GitHub Actions...\n")

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
        log("â³ Webseite aufgerufen. Warte auf Tabelle...")

        try:
            wait_for_table(driver, timeout=25)
            log("â Tabellen-GerÃ¼st im HTML gefunden.")
            log("ð´ Warte 35 Sekunden, bis die API alle Daten nachgeladen hat...")
            time.sleep(35)
        except Exception:
            log("â Timeout: Tabelle wurde nicht geladen.")
            driver.quit()
            return

        log("\n--- STARTE DATENVERARBEITUNG & UPLOAD FÃR ALLE DIVISIONEN ---\n")

        for division in DIVISIONS:
            scrape_division(driver, division)

        log("\nð Update erfolgreich! Alle Divisionen und alle Seiten sind live in Supabase.")

    except Exception as e:
        log(f"â Ein kritischer Fehler ist aufgetreten: {e}")
    finally:
        try:
            if driver:
                driver.quit()
        except Exception:
            pass


if __name__ == "__main__":
    scrape_and_upload_elo()
