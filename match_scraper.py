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
    """Normalisiert Umlaute und Text für einen bombensicheren Abgleich."""
    if not text:
        return ""
    text = text.lower()
    text = text.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    text = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    return text.strip()

def extract_date_and_location(driver):
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
            db_match.get('match_date') != match_data['match_date'] or
            db_match.get('ipsc_division') != match_data['ipsc_division']):
            
            log(f"🔄 UPDATE: '{real_name}' bei '{match_name}' -> Status: {match_data['status']} | Squad: {match_data['squad']} | Div: {match_data['ipsc_division']}")
            supabase.table("user_matches").update({
                "match_date": match_data['match_date'],
                "match_location": match_data['location'],
                "status": match_data['status'],
                "squad": match_data['squad'],
                "ipsc_division": match_data['ipsc_division'],
                "auto_imported": True, 
                "match_url": match_data['match_url']
            }).eq("id", db_match['id']).execute()
    else:
        log(f"✨ NEU HINZUGEFÜGT: '{real_name}' -> '{match_name}' (Squad: {match_data['squad']} | Div: {match_data['ipsc_division']}).")
        supabase.table("user_matches").insert({
            "user_id": user_id,
            "match_name": match_name,
            "match_date": match_data['match_date'],
            "match_location": match_data['location'],
            "status": match_data['status'],
            "squad": match_data['squad'],
            "ipsc_division": match_data['ipsc_division'],
            "auto_imported": True,
            "match_url": match_data['match_url']
        }).execute()

def scrape_ipscmatch_and_sync():
    app_users = get_app_users()
    if not app_users:
        return

    log("Starte Chrome-Browser...")
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.page_load_strategy = 'eager'

    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(25)
        
        try:
            driver.get("https://ipscmatch.de/")
            time.sleep(2)
        except Exception:
            pass
            
        log("Suche nach Matches...")
        match_links = []
        elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='match=']")
        for el in elements:
            url = el.get_attribute('href')
            name = el.text.strip()
            if url and name and url not in [m['url'] for m in match_links]:
                match_links.append({'name': name, 'url': url})

        for match in match_links:
            log(f"\n--- Durchsuche: {match['name']} ---")
            try:
                driver.get(match['url'])
                time.sleep(2) 
            except Exception:
                log("Timeout bei Hauptseite, probiere weiter...")

            real_match_date, real_location = extract_date_and_location(driver)
            
            try:
                starter_link = driver.find_element(By.XPATH, "//a[contains(@href, 'list=starter') or contains(@href, 'list=main_match') or contains(@href, 'list=overall')]")
                driver.get(starter_link.get_attribute("href"))
                time.sleep(2)
            except Exception:
                pass
            
            page_text = driver.find_element(By.TAG_NAME, "body").text
            lines = page_text.split('\n')
            
            for user in app_users:
                real_name = user['real_name']
                search_parts = normalize_text(real_name).split()
                
                current_squad = "TBD"
                status = "Approved"
                found = False
                division = "Unknown" 
                
                for line in lines:
                    norm_line = normalize_text(line)
                    
                    # 1. SQUAD-GEDÄCHTNIS
                    squad_match = re.search(r'(?:squad|sq\.?|gruppe)\s*(\d+)', norm_line)
                    if squad_match:
                        squad_num = squad_match.group(1)
                        if squad_num == "99":
                            current_squad = "SQ99"
                            status = "Warteliste"
                        else:
                            current_squad = f"Squad {squad_num}"
                            status = "Approved"
                    elif "warteliste" in norm_line:
                        current_squad = "SQ99"
                        status = "Warteliste"

                    # 2. NAMENS-CHECK & ZIELGENAUE DIVISION-EXTRAKTION
                    if all(part in norm_line for part in search_parts):
                        
                        # Wir suchen exakt den Namen in der Zeile, um den Rest abzutrennen
                        pattern = r'\s+'.join(map(re.escape, search_parts))
                        match_name = re.search(pattern, norm_line)
                        
                        if match_name:
                            # Schneide alles VOR und INKLUSIVE dem Namen weg.
                            # So bleibt nur der Text übrig, der direkt HINTER dem Schützen steht.
                            chunk_after_name = norm_line[match_name.end():].strip()
                            chunk_words = chunk_after_name.split()
                            
                            # Wir prüfen nur die ersten 4 Wörter NACH dem Namen. 
                            # Das verhindert, dass wir die zweite Tabellenspalte lesen!
                            for i in range(len(chunk_words)):
                                w1 = chunk_words[i]
                                w2 = chunk_words[i+1] if i+1 < len(chunk_words) else ""
                                combined = f"{w1} {w2}".strip()
                                
                                if combined in ["prod. optics", "production optics", "prod optics"]:
                                    division = "Production Optics"
                                    break
                                elif combined == "optics light":
                                    division = "Optics Light"
                                    break
                                elif w1 == "optics":
                                    division = "Optics"
                                    break
                                elif w1 in ["production", "prod.", "prod"]:
                                    division = "Production"
                                    break
                                elif w1 == "standard":
                                    division = "Standard"
                                    break
                                elif w1 == "open":
                                    division = "Open"
                                    break
                                elif w1 == "classic":
                                    division = "Classic"
                                    break
                                elif w1 == "revolver":
                                    division = "Revolver"
                                    break
                                elif w1 == "pcc":
                                    division = "PCC"
                                    break
                                
                                # Nach dem 4. Wort abbrechen -> Schützt vor der Nachbar-Spalte
                                if i >= 3:
                                    break

                        log(f"🎯 TREFFER: '{real_name}' -> {current_squad} ({status}) | Div: {division}")
                        found = True
                        break 
                
                if found:
                    match_data = {
                        "match_name": match['name'],
                        "match_date": real_match_date,
                        "location": real_location,
                        "status": status,
                        "squad": current_squad,
                        "ipsc_division": division, 
                        "match_url": match['url']
                    }
                    update_or_create_match(user['id'], real_name, match_data)

    except Exception as e:
        log(f"KRITISCHER FEHLER: {e}")
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
