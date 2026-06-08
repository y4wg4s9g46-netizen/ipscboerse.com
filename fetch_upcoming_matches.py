import os
import requests
from bs4 import BeautifulSoup
import re
import urllib.parse
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from supabase import create_client, Client

# 🔐 Supabase-Verbindung aus den GitHub-Secrets auslesen
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("Fehler: Supabase Credentials fehlen in den Umgebungsvariablen!")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

base_url = "https://www.ipscmatch.de/"

# 🛡️ Extrem realistischer Browser-Header (User-Agent)
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "max-age=0",
    "Connection": "keep-alive"
}

# 🔄 Automatisches System für Verbindungs-Wiederholungen (Retries) einrichten
session = requests.Session()
retries = Retry(
    total=5,                  # Versuche es bis zu 5-mal
    backoff_factor=2,         # Warte zwischen den Versuchen (2s, 4s, 8s...)
    status_forcelist=[403, 429, 500, 502, 503, 504],
    raise_on_status=False
)
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))

try:
    print("Lade Daten von ipscmatch.de...")
    # Wir nutzen jetzt die abgesicherte Session statt requests.get()
    response = session.get(base_url, headers=headers, timeout=15)
    
    soup = BeautifulSoup(response.text, 'html.parser')
    matches_to_insert = []

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        
        if len(tds) >= 8:
            status_text = tds[6].text.strip().lower()
            auslastung_text = tds[7].text.strip()
            
            # Filter auf zukünftige Matches
            ist_zukuenftig = "öffnet" in status_text or "offnet" in status_text or "%" not in auslastung_text
            
            if not ist_zukuenftig:
                continue
                
            if "cancelled" in status_text or "geschlossen" in status_text or "closed" in status_text:
                continue
                
            disziplin = tds[0].text.strip()
            level = tds[1].text.strip()
            
            # --- REGION KUGELSICHER AUSLESEN ---
            region = tds[2].text.strip()
            if not region:
                img = tds[2].find('img')
                if img:
                    region = img.get('title', img.get('alt', '')).strip().upper()
                    if not region and img.get('src'):
                        src_match = re.search(r'([a-zA-Z]{3})\.(?:png|jpg|gif)', img.get('src'))
                        if src_match:
                            region = src_match.group(1).upper()
            if not region:
                region = "N/A"
            
            match_link = tds[3].find('a')
            if match_link:
                best_name = match_link.text.strip()
                detail_url = urllib.parse.urljoin(base_url, match_link.get('href', ''))
                
                oeffnungs_datum = auslastung_text.strip()
                if not oeffnungs_datum:
                    oeffnungs_datum = "Siehe Detailseite"
                
                datum_raw = tds[5].text.strip()
                datum_match = re.search(r'\d{2}\.\d{2}\.(?:\s*-\s*\d{2}\.\d{2}\.)?\s*\d{2,4}', datum_raw)
                datum = datum_match.group(0).strip() if datum_match else (datum_raw if datum_raw else "N/A")

                matches_to_insert.append({
                    "name": best_name,
                    "datum": datum,
                    "auslastung": "Ankündigung",
                    "anmeldung_oeffnet": oeffnungs_datum,
                    "region": region,
                    "level": level,
                    "disziplin": disziplin,
                    "url": detail_url
                })

    if matches_to_insert:
        print("Lösche alte Einträge aus 'upcoming_matches'...")
        supabase.from_("upcoming_matches").delete().neq("name", "---").execute()
        
        print(f"Schreibe {len(matches_to_insert)} neue Einträge in Supabase...")
        supabase.from_("upcoming_matches").insert(matches_to_insert).execute()
        print("Erfolgreich mit Supabase synchronisiert!")
    else:
        print("Keine neuen Ankündigungen auf IPSC-Match gefunden.")

except Exception as e:
    print(f"Schwerwiegender Verbindungsfehler: {e}")
