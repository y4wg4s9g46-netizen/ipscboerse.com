import os
import time
import re
import unicodedata
import smtplib
from email.message import EmailMessage
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from supabase import create_client, Client

# ==========================================
# 1. SUPABASE & E-MAIL KONFIGURATION
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://huprxirlthkisjngwash.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# E-Mail Settings (Kommen aus den GitHub Secrets)
SMTP_SERVER = os.environ.get("SMTP_SERVER")
SMTP_PORT = os.environ.get("SMTP_PORT", "587")
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
EMAIL_RECEIVER = os.environ.get("EMAIL_RECEIVER")

def log(msg):
    print(msg, flush=True)

def normalize_text(text):
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

        lines = body_text.split('\n')
        for i, line in enumerate(lines):
            if re.match(r'^(Ort|Location|Austragungsort)', line, re.I):
                if ':' in line:
                    potential_loc = line.split(':', 1)[1].strip()
                    if potential_loc:
                        location = potential_loc
                        break
                if i + 1 < len(lines):
                    next_line = lines[i+1].strip()
                    if next_line and not re.match(r'^(Datum|Match|Level|Stages|Veranstalter|Region|Registration)', next_line, re.I):
                        location = next_line
                        break
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

def send_summary_email(summary_data):
    """Versendet eine E-Mail, wenn es Neuerungen gab."""
    if not summary_data['updates'] and not summary_data['new']:
        log("Keine Änderungen vorhanden -> Es wird keine E-Mail versendet.")
        return

    if not all([SMTP_SERVER, SMTP_USER, SMTP_PASSWORD, EMAIL_RECEIVER]):
        log("WARNUNG: E-Mail-Zugangsdaten fehlen in den Umgebungsvariablen. Kann keine E-Mail senden.")
        return

    log("Bereite E-Mail-Versand vor...")
    body = "Hallo,\n\nder IPSC Scraper ist durchgelaufen und hat folgende Änderungen in Supabase gespeichert:\n\n"
    
    if summary_data['new']:
        body += "=== NEUE EINTRÄGE ===\n"
        for item in summary_data['new']:
            body += f"✨ {item}\n"
        body += "\n"
        
    if summary_data['updates']:
        body += "=== UPDATES (Status/Squad Änderung) ===\n"
        for item in summary_data['updates']:
            body += f"🔄 {item}\n"
        body += "\n"
        
    body += "Sportliche Grüße,\nDein IPSC Bot 🤖"

    msg = EmailMessage()
    msg.set_content(body)
    msg['Subject'] = f"🎯 IPSC Match Update ({len(summary_data['new'])} Neu / {len(summary_data['updates'])} Updates)"
    msg['From'] = SMTP_USER
    msg['To'] = EMAIL_RECEIVER

    try:
        server = smtplib.SMTP(SMTP_SERVER, int(SMTP_PORT))
        server.starttls() # Verschlüsselung aktivieren
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        log(f"✅ E-Mail erfolgreich an {EMAIL_RECEIVER} gesendet!")
    except Exception as e:
        log(f"❌ Fehler beim Senden der E-Mail: {e}")

def update_or_create_match(user_id, real_name, match_data, summary_data):
    match_name = match_data['match_name']
    
    existing = supabase.table("user_matches").select("*") \
        .eq("user_id", user_id) \
        .eq("match_name", match_name).execute()
        
    if existing.data and len(existing.data) > 0:
        db_match = existing.data[0]
        if (db_match.get('status') != match_data['status'] or 
            db_match.get('squad') != match_data['squad'] or 
            db_match.get('match_date') != match_data['match_date'] or
            db_match.get('match_location') != match_data['location'] or
            db_match.get('ipsc_division') != match_data['ipsc_division']):
            
            msg = f"'{real_name}' bei '{match_name}' -> Status: {match_data['status']} | Squad: {match_data['squad']} | Ort: {match_data['location']} | Div: {match_data['ipsc_division']}"
            log(f"🔄 UPDATE: {msg}")
            summary_data['updates'].append(msg) # Für die E-Mail speichern
            
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
        msg = f"'{real_name}' -> '{match_name}' (Squad: {match_data['squad']} | Ort: {match_data['location']} | Div: {match_data['ipsc_division']})"
        log(f"✨ NEU HINZUGEFÜGT: {msg}")
        summary_data['new'].append(msg) # Für die E-Mail speichern
        
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

    # Hier speichern wir uns alles für die Zusammenfassung/E-Mail
    summary_data = {'new': [], 'updates': []}

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

                    if all(part in norm_line for part in search_parts):
                        pattern = r'\s+'.join(map(re.escape, search_parts))
                        match_name = re.search(pattern, norm_line)
                        
                        if match_name:
                            chunk_after_name = norm_line[match_name.end():].strip()
                            chunk_words = chunk_after_name.split()
                            
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
                                
                                if i >= 3:
                                    break

                        log(f"🎯 TREFFER: '{real_name}' -> {current_squad} ({status}) | Ort: {real_location} | Div: {division}")
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
                    # Hier übergeben wir nun auch 'summary_data' an die Funktion
                    update_or_create_match(user['id'], real_name, match_data, summary_data)

    except Exception as e:
        log(f"KRITISCHER FEHLER: {e}")
    finally:
        if driver:
            driver.quit()
        
        # GANZ AM ENDE: Zusammenfassung anzeigen & Mail verschicken
        log("\n==========================================")
        log("📊 ZUSAMMENFASSUNG DES SCRAPER-DURCHLAUFS")
        log("==========================================")
        log(f"Neue Einträge gefunden: {len(summary_data['new'])}")
        log(f"Aktualisierte Einträge: {len(summary_data['updates'])}")
        log("==========================================\n")
        
        # Versende Mail (nur wenn neue/geänderte Daten vorhanden sind)
        send_summary_email(summary_data)

if __name__ == "__main__":
    scrape_ipscmatch_and_sync()
