import pandas as pd
import re
import time
import io
import os

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

# Alle Handgun-Divisionen auf ipscelo.com
DIVISIONS = [
    "Production",
    "Production Optics",
    "Open",
    "Optics",
    "Standard",
    "Classic",
    "Revolver",
]


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
    time.sleep(3)


def click_visible_text(driver, text):
    """Klickt den sichtbaren Tab/Button mit exakt diesem Text."""
    xpath = f"//*[self::button or self::a or self::span][normalize-space(.)='{text}']"
    elements = driver.find_elements(By.XPATH, xpath)
    for el in elements:
        try:
            if el.is_displayed():
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
                time.sleep(0.3)
                driver.execute_script("arguments[0].click();", el)
                return True
        except Exception:
            continue
    return False


def select_division(driver, division):
    print(f"\n🔄 Wechsle zu Division: {division}")
    if not click_visible_text(driver, division):
        print(f"⚠️ Konnte Division-Tab nicht direkt klicken: {division}. Versuche weiter mit aktueller Seite.")
    time.sleep(6)
    wait_for_table(driver)


def set_rows_per_page_1000(driver):
    """Stellt wenn möglich 1000 rows per page ein. Wenn schon 1000 aktiv ist, passiert nichts."""
    try:
        page_text = driver.find_element(By.TAG_NAME, "body").text
        if "1000" in page_text and "rows per page" in page_text:
            return

        # Dropdown/Select öffnen und 1000 auswählen, falls vorhanden
        candidates = driver.find_elements(By.XPATH, "//*[self::button or self::select or self::div][contains(normalize-space(.), 'rows per page') or contains(normalize-space(.), '100') or contains(normalize-space(.), '1000')]")
        for el in candidates:
            try:
                if el.is_displayed():
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
                    driver.execute_script("arguments[0].click();", el)
                    time.sleep(0.5)
                    break
            except Exception:
                pass

        if click_visible_text(driver, "1000"):
            time.sleep(5)
            wait_for_table(driver)
    except Exception as e:
        print(f"⚠️ Rows-per-page konnte nicht gesetzt werden, scraper läuft weiter: {e}")


def click_next_page(driver):
    """Klickt auf die nächste Seite. Gibt False zurück, wenn keine nächste Seite verfügbar ist."""
    script = """
    const candidates = Array.from(document.querySelectorAll('button, a'));
    const nexts = candidates.filter(el => {
      const txt = (el.innerText || el.textContent || '').trim();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      return txt === '›' || txt === '>' || txt.toLowerCase() === 'next' || aria.includes('next') || title.includes('next');
    });
    for (const el of nexts) {
      const disabled = el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
      const style = window.getComputedStyle(el);
      const visible = style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
      if (!disabled && visible) {
        el.scrollIntoView({block: 'center'});
        el.click();
        return true;
      }
    }
    return false;
    """
    try:
        clicked = driver.execute_script(script)
        if clicked:
            time.sleep(5)
            wait_for_table(driver)
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

        # Zeilen überspringen, falls noch Lade-Reste drin sind
        if lastname == 'nan' or lastname == 'Unknown' or 'loading' in lastname.lower():
            continue

        # Vornamen anhängen falls vorhanden, um den vollen Namen zu speichern
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

        # Datensatz für Supabase aufbauen
        entry = {
            "rank": safe_int(row.get(rank_col, 0)),
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


def upload_entries(entries, division):
    if len(entries) < 10:
        print(f"❌ Fehler: Zu wenig Daten für {division}. Abbruch zum Schutz der DB.")
        return

    print(f"🧹 Lösche alte {division}-Einträge aus Supabase...")
    supabase.table("elo_rankings").delete().eq("division", division).execute()
    time.sleep(1)

    print(f"📤 Lade {len(entries)} {division}-Einträge hoch...")
    upload_data = []
    for index, entry in enumerate(entries):
        print(f"[{index + 1}/{len(entries)}] 👤 Scrape: {entry['lastname']} | Land: {entry['region']} | ELO: {entry['elo_rating']} | Division: {division}")
        upload_data.append(entry)

        # In 20er-Blöcken hochladen (schont die Supabase-API)
        if len(upload_data) >= 20:
            supabase.table("elo_rankings").insert(upload_data).execute()
            upload_data = []
            time.sleep(1)

    # Den verbleibenden Rest hochladen
    if upload_data:
        supabase.table("elo_rankings").insert(upload_data).execute()

    print(f"✅ {division} erfolgreich aktualisiert.")


def scrape_division(driver, division):
    select_division(driver, division)
    set_rows_per_page_1000(driver)

    all_entries = []
    seen_rows = set()

    for page_no in range(1, 101):
        df = get_biggest_table(driver)
        if df is None or len(df) < 10:
            print(f"❌ Keine brauchbare Tabelle für {division} auf Seite {page_no} gefunden.")
            break

        print(f"📊 {division}: Seite {page_no} mit {len(df)} Zeilen gefunden.")
        page_entries = dataframe_to_entries(df, division)

        new_count = 0
        for entry in page_entries:
            # Rank + Name + Division reicht hier als Duplikat-Schutz über Seiten hinweg
            key = (entry.get("division"), entry.get("rank"), entry.get("lastname"))
            if key not in seen_rows:
                seen_rows.add(key)
                all_entries.append(entry)
                new_count += 1

        print(f"➕ {division}: {new_count} neue Einträge von Seite {page_no} übernommen.")

        if not click_next_page(driver):
            break

    upload_entries(all_entries, division)


def scrape_and_upload_elo():
    url = "https://ipscelo.com/?divisionid=39"
    print("🚀 Starte unsichtbaren Chrome-Browser für GitHub Actions...\n")

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
        print("⏳ Webseite aufgerufen. Warte auf Tabelle...")

        try:
            wait_for_table(driver, timeout=25)
            print("✅ Tabellen-Gerüst im HTML gefunden.")
            print("😴 Warte 35 Sekunden, bis die API alle Daten nachgeladen hat...")
            time.sleep(35)
        except Exception:
            print("❌ Timeout: Tabelle wurde nicht geladen.")
            driver.quit()
            return

        print("\n--- STARTE DATENVERARBEITUNG & UPLOAD FÜR ALLE DIVISIONEN ---\n")

        for division in DIVISIONS:
            scrape_division(driver, division)

        print("\n🎉 Update erfolgreich! Alle Divisionen und alle Seiten sind live in Supabase.")

    except Exception as e:
        print(f"❌ Ein kritischer Fehler ist aufgetreten: {e}")
    finally:
        try:
            if driver:
                driver.quit()
        except Exception:
            pass


if __name__ == "__main__":
    scrape_and_upload_elo()
