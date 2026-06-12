import os
import time
import re
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
    """
    Prüft, ob das Match für den User schon existiert.
    Wenn ja: Update (z.B. neuer Status/Squad). Wenn nein: Neu anlegen.
    """
    match_name = match_data['match_name']
    
    # 1. Prüfen, ob der User dieses Match schon hat
    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()
        
    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        # Nur updaten, wenn sich Status oder Squad geändert haben
        if db_match.get('status') != match_data['status'] or db_match.get('squad') != match_data['squad']:
            log(f"🔄 UPDATE: Schütze '{real_name}' beim Match '{match_name}' aktualisiert (Neuer Status: {match_data['status']} | Squad: {match_data['squad']})")
            supabase.table("user_matches").update({
                "status": match_data['status'],
                "squad": match_data['squad'],
                "auto_imported": True, 
                "match_url": match_data['match_url']
            }).eq("id", db_match['id']).execute()
    else:
        # Match existiert noch nicht -> Neu anlegen
        log(f"✨ NEU HINZUGEFÜGT: Schütze '{real_name}' wurde zum Match '{match_name}' eingetragen.")
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
    chrome_options.add_argument("--window-size=1920,1080")

    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        base_url = "https://ipscmatch.de/"
        driver.get(base_url)
        time.sleep(3)
        
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
            log(f"Durchsuche Match: {match['name']}...")
            driver.get(match['url'])
            time.sleep(2) 
            
            page_text = driver.find_element(By.TAG_NAME, "body").text
            
            for user in app_users:
                real_name = user['real_name']
                
                if real_name.lower() in page_text.lower():
                    # TREFFER LOG
                    log(f"🎯 TREFFER auf der Webseite: '{real_name}' steht auf der Liste für '{match['name']}'. Starte Datenbank-Abgleich...")
                    
                    squad = "TBD" 
                    status = "Pending/Approved" 
                    match_date = "2026-08-01" 
                    location = "Deutschland"
                    
                    match_data = {
                        "match_name": match['name'],
                        "match_date": match_date,
                        "location": location,
                        "status": status,
                        "squad": squad,
                        "match_url": match['url']
                    }
                    
                    # Übergabe von real_name an die DB-Funktion für saubere Logs
                    update_or_create_match(user['id'], real_name, match_data)

    except Exception as e:
        log(f"KRITISCHER FEHLER beim Scraping: {e}")
    finally:
        if driver:
            driver.quit()
            log("Browser geschlossen. Synchronisation beendet.")

if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
