import os
import time
import re
import unicodedata
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

def log(msg):
    print(msg, flush=True)

def normalize_text(text):
    """Normalisiert Umlaute und Text für einen sicheren Vergleich."""
    if not text:
        return ""
    text = text.lower()
    text = text.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    text = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    return text.strip()

def extract_date_and_location(driver):
    """Versucht das echte Datum und den Ort aus der Match-Seite zu fischen."""
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
    """Holt alle User aus der Datenbank, die einen real_name hinterlegt haben."""
    log("Lade User aus der profiles-Tabelle...")
    try:
        response = supabase.table("profiles").select("id, real_name").execute()
        users = [u for u in response.data if u.get('real_name')]
        log(f"{len(users)} User mit real_name gefunden.")
        return users
    except Exception as e:
        log(f"Fehler beim Laden der User: {e}")
        return []

def update_or_create_match(user_id, real_name, match_data):
    match_name = match_data['match_name']
    
    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()
        
    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        if (db_match.get('status') != match_data['status'] or 
            db_match.get('squad') != match_data['squad'] or 
            db_match.get('match_date') != match_data['match_date']):
            
            log(f"🔄 UPDATE: '{real_name}' bei '{match_name}' -> Status: {match_data['status']} | Squad: {match_data['squad']} | Datum: {match_data['match_date']}")
            supabase.table("user_matches").update({
                "match_date": match_data['match_date'],
                "match_location": match_data['location'],
                "status": match_data['status'],
                "squad": match_data['squad'],
                "auto_imported": True, 
                "match_url": match_data['match_url']
            }).eq("id", db_match['id']).execute()
    else:
        log(f"✨ NEU HINZUGEFÜGT: Schütze '{real_name}' wurde zum Match '{match_name}' eingetragen (Squad: {match_data['squad']} | Status: {match_data['status']}).")
        supabase.table("user_matches").insert({
            "user_id": user_id,
            "match_name": match_name,
            "match_date": match_data['match_date'],
            "match_location": match_data['location'],
            "status": match_data['status'],
            "squad": match_data['squad'],
            "auto_imported": True,
            "match_url": match_data['match_url']
        }).execute()

def scrape_ipscmatch_and_sync():
    app_users = get_app_users()
    if not app_users:
        log("Keine User mit real_name gefunden. Breche ab.")
        return

    log("Starte Chrome-Browser...")
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # 🚀 SPEED-UP: Lade nur HTML, warte nicht auf Bilder/externe Tracker
    chrome_options.page_load_strategy = 'eager'

    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # 🚀 TIMEOUT: Gib jeder Seite maximal 25 Sekunden Zeit
        driver.set_page_load_timeout(25)
        
        base_url = "https://ipscmatch.de/"
        try:
            driver.get(base_url)
            time.sleep(2)
        except Exception as e:
            log(f"Timeout beim Laden der Hauptseite ignoriert. HTML sollte da sein.")
            
        log("Suche nach anstehenden Matches...")
        
        match_links = []
        elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='match=']")
        for el in elements:
            url = el.get_attribute('href')
            name = el.text.strip()
            if url and name and url not in [m['url'] for m in match_links]:
                match_links.append({'name': name, 'url': url})
                
        log(f"{len(match_links)} Matches auf der Startseite gefunden.")

        for match in match_links:
            log(f"\n--- Durchsuche Match: {match['name']} ---")
            
            try:
                driver.get(match['url'])
                time.sleep(2) 
            except Exception:
                log(f"WARN: Timeout beim Laden von Match {match['name']} - Versuche trotzdem zu lesen...")

            real_match_date, real_location = extract_date_and_location(driver)
            
            try:
                starter_link = driver.find_element(By.XPATH, "//a[contains(@href, 'list=starter') or contains(@href, 'list=main_match') or contains(@href, 'list=overall')]")
                starter_url = starter_link.get_attribute("href")
                log(f"Folge Link zur Starterliste...")
                driver.get(starter_url)
                time.sleep(2)
            except Exception:
                log(f"Keine öffentliche Starterliste für dieses Match gefunden. Überspringe.")
                continue
            
            rows = driver.find_elements(By.XPATH, "//tr | //p | //div")
            
            for row in rows:
                row_text = row.text.strip()
                if not row_text:
                    continue
                    
                normalized_row = normalize_text(row_text)
                
                for user in app_users:
                    real_name = user['real_name']
                    normalized_name = normalize_text(real_name)
                    
                    if normalized_name in normalized_row:
                        log(f"🎯 TREFFER: '{real_name}' auf der Liste gefunden!")
                        
                        squad = "TBD"
                        status = "Approved"
                        
                        squad_match = re.search(r'(?:squad|sq|gruppe)\s*:?\s*(\d+)', normalized_row)
                        end_match = re.search(r'\b(\d{1,2})$', normalized_row)
                        
                        if squad_match:
                            squad_num = squad_match.group(1)
                            squad = f"Squad {squad_num}"
                            if squad_num == "99":
                                status = "Warteliste"
                                squad = "SQ99"
                        elif end_match:
                            squad_num = end_match.group(1)
                            squad = f"Squad {squad_num}"
                            if squad_num == "99":
                                status = "Warteliste"
                                squad = "SQ99"
                        elif "99" in row_text:
                            status = "Warteliste"
                            squad = "SQ99"
                        
                        match_data = {
                            "match_name": match['name'],
                            "match_date": real_match_date,
                            "location": real_location,
                            "status": status,
                            "squad": squad,
                            "match_url": match['url']
                        }
                        
                        update_or_create_match(user['id'], real_name, match_data)
                        break 

    except Exception as e:
        log(f"KRITISCHER FEHLER beim Scraping: {e}")
    finally:
        if driver:
            driver.quit()
            log("Browser geschlossen. Synchronisation beendet.")

if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
