import os
import requests
import time
import urllib.parse
import re
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup

base_url = "https://www.ipscmatch.de/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9",
    "Connection": "keep-alive"
}

session = requests.Session()
retries = Retry(total=5, backoff_factor=3, status_forcelist=[403, 429, 500, 502, 503, 504], raise_on_status=False)
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))

try:
    print("🔍 Verbinde mit IPSC-Server und lese stabile 8-Spalten-Tabelle aus...")
    response = session.get(base_url, headers=headers, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Server-Fehler beim Laden der Homepage: {response.status_code}")
        exit(0)
        
    soup = BeautifulSoup(response.text, 'html.parser')
    matches_to_insert = []

    print("\n--- 🛰️ STARTE LIVE-ANALYSE NACH ANKÜNDIGUNGEN ---")

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        
        if len(tds) >= 8:
            auslastung_text = tds[7].text.strip().replace('\xa0', ' ')
            status_text = tds[6].text.strip().lower()
            
            if "cancelled" in status_text or "geschlossen" in status_text or "closed" in status_text:
                continue
                
            is_upcoming = False
            oeffnungs_datum = auslastung_text
            
            if '%' in auslastung_text:
                if any(jahr in auslastung_text for jahr in ["2026", "2027"]):
                    is_upcoming = True
            else:
                is_upcoming = True

            if is_upcoming:
                if not oeffnungs_datum or oeffnungs_datum.lower().startswith("stage-") or oeffnungs_datum == "":
                    continue

                disziplin = tds[0].text.strip()
                level = tds[1].text.strip()
                
                # Region auslesen (Flaggen-Erkennung)
                region = tds[2].text.strip()
                if not region:
                    img = tds[2].find('img')
                    if img:
                        region = img.get('title', img.get('alt', '')).strip().upper()
                        if not region and img.get('src'):
                            src_match = re.search(r'([a-zA-Z]{3,4})\.(?:png|jpg|gif)', img.get('src'))
                            if src_match:
                                region = src_match.group(1).upper()
                if not region: 
                    region = "N/A"
                
                match_link = tds[3].find('a')
                if match_link:
                    best_name = match_link.text.strip().replace('\xa0', ' ')
                    detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                    
                    # 📍 NEU: Ort aus Spalte 4 extrahieren!
                    ort = tds[4].text.strip().replace('\xa0', ' ')
                    if not ort:
                        ort = "Unbekannter Ort"
                    
                    datum_raw = tds[5].text.strip()
                    datum_match = re.search(r'\d{2}\.\d{2}\.(?:\s*-\s*\d{2}\.\d{2}\.)?\s*\d{2,4}', datum_raw)
                    datum = datum_match.group(0).strip() if datum_match else (datum_raw if datum_raw else "N/A")

                    print(f"📌 ANKÜNDIGUNG: {best_name[:30]:<30} | 📍 Ort: {ort[:15]:<15} | 📅 Öffnet: {oeffnungs_datum:<20} | 🏆 {level:<5}")

                    matches_to_insert.append({
                        "match_name": best_name,
                        "datum": datum,
                        "auslastung": "Ankündigung",
                        "anmeldung_oeffnet": oeffnungs_datum,
                        "region": region,
                        "level": level,
                        "disziplin": disziplin,
                        "ort": ort, # 🌟 Schreibt den Ort jetzt in die Spalte 'ort'
                        "url": detail_url
                    })

    print("----------------------------------------")
    print(f"🏁 Webseite erfolgreich gescannt! {len(matches_to_insert)} bereinigte Ankündigungen gefunden.\n")

    time.sleep(3)

    if matches_to_insert:
        from supabase import create_client, Client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            print("❌ Fehler: Supabase Credentials fehlen in den GitHub Secrets!")
            exit(1)

        supabase: Client = create_client(supabase_url, supabase_key)

        print(f"Lösche alte Einträge aus Supabase...")
        supabase.from_("upcoming_matches").delete().neq("match_name", "---").execute()
        
        print(f"Schreibe {len(matches_to_insert)} Matches in Supabase...")
        supabase.from_("upcoming_matches").insert(matches_to_insert).execute()
        print("🎉 Sensationell! Alle Ankündigungen inklusive Ort sind live in deiner Datenbank!")
    else:
        print("Keine kommenden Ankündigungen auf der Homepage gefunden.")

except Exception as e:
    print(f"❌ Fehler: {e}")
