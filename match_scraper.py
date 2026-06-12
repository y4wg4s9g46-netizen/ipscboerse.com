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
    if not text: return ""
    text = text.lower()
    text = text.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    return "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').strip()

def update_or_create_match(user_id, real_name, match_data):
    match_name = match_data['match_name']
    
    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()
        
    data_payload = {
        "user_id": user_id,
        "match_name": match_name,
        "match_date": match_data['match_date'],
        "match_location": match_data['location'],
        "status": match_data['status'],
        "squad": match_data['squad'],
        "division": match_data['division'], # Neu hinzugefügt
        "auto_imported": True,
        "match_url": match_data['match_url']
    }

    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        log(f"🔄 UPDATE: '{real_name}' bei '{match_name}' -> {match_data['squad']} | {match_data['division']}")
        supabase.table("user_matches").update(data_payload).eq("id", db_match['id']).execute()
    else:
        log(f"✨ NEU: '{real_name}' -> '{match_name}' ({match_data['squad']} | {match_data['division']})")
        supabase.table("user_matches").insert(data_payload).execute()

def scrape_ipscmatch_and_sync():
    app_users = supabase.table("profiles").select("id, real_name").execute().data
    
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    try:
        driver.get("https://ipscmatch.de/")
        time.sleep(2)
        match_links = [{'name': el.text.strip(), 'url': el.get_attribute('href')} 
                       for el in driver.find_elements(By.CSS_SELECTOR, "a[href*='match=']")]

        for match in match_links:
            driver.get(match['url'])
            # Versuche zur Starterliste zu navigieren
            try:
                starter_link = driver.find_element(By.XPATH, "//a[contains(@href, 'list=')]")
                driver.get(starter_link.get_attribute("href"))
            except: pass
            
            lines = driver.find_element(By.TAG_NAME, "body").text.split('\n')
            
            current_squad = "TBD"
            for line in lines:
                norm_line = normalize_text(line)
                
                # Squad-Erkennung
                squad_match = re.search(r'(?:squad|sq\.?|gruppe)\s*(\d+)', norm_line)
                if squad_match:
                    current_squad = f"Squad {squad_match.group(1)}"
                
                # User-Abgleich
                for user in app_users:
                    search_parts = normalize_text(user['real_name']).split()
                    if all(part in norm_line for part in search_parts):
                        # Division-Extraktion: Suche nach dem Teil nach 'ger'
                        division = "Unknown"
                        if "ger" in norm_line:
                            # Teilt hinter 'ger' und nimmt den ersten Block
                            parts = norm_line.split("ger")[-1].strip().split()
                            if parts: division = parts[0]
                        
                        update_or_create_match(user['id'], user['real_name'], {
                            "match_name": match['name'],
                            "match_date": "2026-01-01", # Hier ggf. deine Extraktionslogik beibehalten
                            "location": "Unbekannt",
                            "status": "Approved",
                            "squad": current_squad,
                            "division": division,
                            "match_url": match['url']
                        })
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
