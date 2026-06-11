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
# 1. SUPABASE KONFIGURATION (Scharfgeschaltet via Umgebungsvariable)
# ==========================================
SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

DIVISIONS = [
    "Production",
    "Production Optics",
    "Open",
    "Optics",
    "Standard",
    "Classic",
    "Revolver",
]

# Die direkten IDs der Webseite
DIVISION_URL_IDS = {
    "Production": 4, "Production Optics": 5, "Open": 1,
    "Optics": 39, "Standard": 2, "Classic": 3, "Revolver": 6,
}

ROWS_PER_PAGE_TARGET = 1000
MAX_PAGES_PER_DIVISION = 20

def log(msg):
    print(msg, flush=True)

def safe_int(val):
    try:
        if isinstance(val, str):
            val = val.replace(',', '')
        return int(float(val))
    except Exception:
        return 0

def safe_float(val):
    try:
        if isinstance(val, str):
            val = val.replace(',', '')
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
    try:
        WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.TAG_NAME, "table")))
        time.sleep(2)
        return True
    except:
        return False

def get_showing_info(driver):
    try:
        script = """
        function isVisible(el) {
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
        }
        const pieces = [];
        for (const el of Array.from(document.querySelectorAll('div, span'))) {
          if (!isVisible(el)) continue;
          const txt = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
          if (txt && txt.includes('Showing') && txt.includes('rows')) pieces.push(txt);
        }
        return pieces.join(' | ');
        """
        near_table_text = driver.execute_script(script) or ""
        near_table_text = near_table_text.replace(',', '')
        m = re.search(r"Showing\s+(\d+)\s+(?:to|-)\s+(\d+)\s+of\s+(\d+)\s+rows", near_table_text, re.I)
        if m:
            return (safe_int(m.group(1)), safe_int(m.group(2)), safe_int(m.group(3)))
    except Exception:
        pass
    try:
        text = driver.find_element(By.TAG_NAME, "body").text
        text = text.replace(',', '')
        matches = re.findall(r"Showing\s+(\d+)\s+(?:to|-)\s+(\d+)\s+of\s+(\d+)\s+rows", text, re.I)
        if matches:
            best = max(matches, key=lambda x: safe_int(x[2]))
            return (safe_int(best[0]), safe_int(best[1]), safe_int(best[2]))
    except Exception:
        pass
    return (0, 0, 0)

def wait_for_page_change(driver, old_start, timeout=20):
    """Wartet aktiv darauf, dass sich der 'Showing X to Y' Text aendert."""
    for _ in range(timeout * 2): # Halbe-Sekunden-Takte
        time.sleep(0.5)
        new_start, new_end, _ = get_showing_info(driver)
        if new_start != old_start and new_start > 0:
            return new_start, new_end
    return None, None

def set_rows_per_page_1000(driver):
    try:
        script = """
        const tables = Array.from(document.querySelectorAll('table')).filter(t => t.offsetParent !== null).sort((a, b) => b.querySelectorAll('tr').length - a.querySelectorAll('tr').length);
        if (!tables.length) return false;
        const tableBottom = tables[0].getBoundingClientRect().bottom;
        function isVisible(el) { return el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0; }
        const els = Array.from(document.querySelectorAll('button, select, div, span'));
        for (const el of els) {
          const txt = (el.innerText || el.textContent || '').trim();
          const r = el.getBoundingClientRect();
          if (isVisible(el) && r.top >= tableBottom - 20 && r.top < tableBottom + 180 && (txt === '1000' || txt.includes('rows per page'))) {
            el.scrollIntoView({block: 'center'}); el.click(); return true;
          }
        }
        return false;
        """
        driver.execute_script(script)
        time.sleep(1)
        script2 = """
        const els = Array.from(document.querySelectorAll('button, div, span, li, option'));
        for (const el of els) {
          const txt = (el.innerText || el.textContent || '').trim();
          if (txt === '1000') { el.click(); return true; }
        }
        return false;
        """
        driver.execute_script(script2)
        
        # Warte nach dem Umstellen auf 1000 aktiv auf das Laden
        old_start, _, _ = get_showing_info(driver)
        wait_for_page_change(driver, old_start, timeout=10)
        wait_for_table(driver)
    except Exception:
        pass

def click_table_pagination(driver, target_page):
    script = """
    const target = String(arguments[0]);
    
    // 1. Suche gezielt in Pagination-Elementen (verhindert Klicks auf Ränge in der Tabelle)
    const paginations = document.querySelectorAll('[class*="pagin"] a, [class*="pagin"] button, .page-link, .paginate_button');
    if (paginations.length > 0) {
        for (const el of paginations) {
            if ((el.innerText || el.textContent || '').trim() === target) {
                if (el.classList.contains('disabled') || el.classList.contains('active')) continue;
                el.scrollIntoView({block: 'center'});
                el.click();
                return true;
            }
        }
    }
    
    // 2. Fallback: Suche alle klickbaren Elemente, die in der unteren Bildschirmhälfte sind
    const clickables = Array.from(document.querySelectorAll('button, a'));
    const tables = document.querySelectorAll('table');
    const tableBottom = tables.length ? tables[0].getBoundingClientRect().bottom : window.innerHeight / 2;
    
    for (const el of clickables) {
      const txt = (el.innerText || el.textContent || '').trim();
      const r = el.getBoundingClientRect();
      const disabled = el.disabled || el.classList.contains('disabled') || el.classList.contains('active');
      if (!disabled && r.width > 0 && txt === target && r.top >= tableBottom - 100) {
        el.scrollIntoView({block: 'center'}); 
        el.click(); 
        return true;
      }
    }
    return false;
    """
    return bool(driver.execute_script(script, target_page))

def dataframe_to_entries(df, division, seen_ranks, total_rows=0):
    if df is None or len(df) < 10: return []
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
        if rank in seen_ranks or rank == 0: continue
        if total_rows and (rank > total_rows): continue

        lastname = str(row.get(lastname_col, 'Unknown')).strip()
        if lastname == 'nan' or lastname == 'Unknown' or 'loading' in lastname.lower(): continue

        firstname = str(row.get(firstname_col, '')).strip()
        full_name = f"{lastname}, {firstname}" if firstname and firstname != 'nan' else lastname

        region_name = str(row.get(region_col, '')).strip()
        if region_name == 'nan': region_name = 'Unknown'

        cat = str(row.get(category_col, '')).strip()
        if cat == 'nan': cat = ''

        rc_class = str(row.get(rc_col, '')).strip()
        if rc_class == 'nan': rc_class = ''

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
        seen_ranks.add(rank)
    return entries

# ==========================================
# 🛠️ ECHTER DB-UPLOAD (CHUNK INSERTS)
# ==========================================
def upload_entries(entries, division, total_rows=0):
    if len(entries) < 10:
        log(f"ERROR: Zu wenig Daten fuer {division}. Abbruch zum Schutz der DB.")
        return False

    if total_rows and len(entries) < max(10, int(total_rows * 0.80)):
        log(f"ERROR: Nur {len(entries)} von erwarteten {total_rows} Daten fuer {division}. Kein Upload.")
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
    stats = {"division": division, "expected": 0, "imported": 0, "missing": 0, "status": "FEHLER"}

    division_id = DIVISION_URL_IDS.get(division)
    if not division_id:
        log(f"Fehler: Keine URL-ID fuer {division} gefunden.")
        return False, stats

    url = f"https://ipscelo.com/index.html?divisionid={division_id}"
    log(f"Lade Webseite direkt ueber feste URL neu: {url}")
    driver.get(url)
    
    if not wait_for_table(driver, timeout=30):
        log("Tabelle wurde nicht geladen.")
        return False, stats
        
    log("Warte kurz auf Datenbank-Antwort von ipscelo...")
    time.sleep(5) 

    set_rows_per_page_1000(driver)

    start, end, total_rows = get_showing_info(driver)
    expected_pages = math.ceil(total_rows / ROWS_PER_PAGE_TARGET) if total_rows else MAX_PAGES_PER_DIVISION
    expected_pages = min(max(expected_pages, 1), MAX_PAGES_PER_DIVISION)
    log(f"{division}: erwartete Seiten: {expected_pages} (Total rows: {total_rows or 'unbekannt'})")

    all_entries = []
    seen_ranks = set()

    for page_no in range(1, expected_pages + 1):
        df = None
        for attempt in range(4):
            temp_df = get_biggest_table(driver)
            if temp_df is not None and len(temp_df) > 0:
                lastname_col = 'Lastname' if 'Lastname' in temp_df.columns else (temp_df.columns[3] if len(temp_df.columns) > 3 else '')
                if lastname_col and temp_df[lastname_col].astype(str).str.contains('loading', case=False, na=False).any():
                    time.sleep(2)
                    continue 
                df = temp_df
                break 
            time.sleep(2)

        if df is None or len(df) == 0:
            log(f"ERROR: Tabelle endgueltig nicht gefunden auf Seite {page_no}.")
            break

        page_entries = dataframe_to_entries(df, division, seen_ranks=seen_ranks, total_rows=total_rows)
        all_entries.extend(page_entries)
        log(f"{division}: {len(page_entries)} neue Eintraege von Seite {page_no} uebernommen. (Gesamt: {len(all_entries)})")

        if page_no >= expected_pages: 
            break

        old_start = start
        log(f"Klicke auf Seite {page_no + 1} und warte auf AJAX-Update...")
        
        if not click_table_pagination(driver, page_no + 1):
            log(f"STOP: {division}: Konnte Pagination-Button fuer Seite {page_no + 1} nicht finden oder klicken.")
            break

        new_start, new_end = wait_for_page_change(driver, old_start, timeout=20)
        
        if not new_start:
            log(f"STOP: Timeout beim Warten auf Seite {page_no + 1}. Hintergrund-Laden hat nicht reagiert.")
            break
        else:
            start = new_start 
            time.sleep(1.5) 

    stats["expected"] = total_rows if total_rows else 0
    stats["imported"] = len(all_entries)
    if total_rows: stats["missing"] = total_rows - len(all_entries)

    success = upload_entries(all_entries, division, total_rows=total_rows)
    if success: stats["status"] = "OK"
    return success, stats

def scrape_and_upload_elo():
    log("Starte unsichtbaren Chrome-Browser...")
    chrome_options = Options()
    # Nutze das neue Headless-System, welches stabiler auf Servern laeuft
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080") 
    
    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        success_count = 0
        all_stats = [] 

        for division in DIVISIONS:
            success, stats = scrape_division(driver, division) 
            if success: success_count += 1
            all_stats.append(stats)

        log("\n" + "="*65)
        log("🏆 ABSCHLUSS-BERICHT: ALLE DIVISIONEN IM UEBERBLICK")
        log("="*65)
        log(f"{'Division':<18} | {'Status':<6} | {'Erwartet':<10} | {'Importiert':<10} | {'Differenz'}")
        log("-" * 65)
        for s in all_stats:
            diff = s['missing']
            diff_str = "❌ FEHLER" if s['status'] == "FEHLER" else (f"⚠️ -{diff}" if diff > 0 else (f"ℹ️ +{abs(diff)}" if diff < 0 else "✅ 0"))
            log(f"{s['division']:<18} | {s['status']:<6} | {s['expected']:<10} | {s['imported']:<10} | {diff_str}")
        log("="*65)

    except Exception as e:
        log(f"ERROR: {e}")
    finally:
        if driver: driver.quit()

if __name__ == "__main__":
    scrape_and_upload_elo()
