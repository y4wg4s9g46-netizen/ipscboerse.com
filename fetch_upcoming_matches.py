import os
import requests
from bs4 import BeautifulSoup
import re
import urllib.parse
from supabase import create_client, Client

# 🔐 Supabase-Verbindung aus den GitHub-Secrets auslesen
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("Fehler: Supabase Credentials fehlen in den Umgebungsvariablen!")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

base_url = "https://www.ipscmatch.de/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

try:
    print("Lade Daten von ipscmatch.de...")
    response = requests.get(base_url, headers=headers, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    matches_to_insert = []

    for row in soup.find_all('tr'):
        tds = row.find_all('td')
        
        # Die Tabelle auf der Website hat 8 Spalten
        if len(tds) >= 8:
            status_text = tds[6].text.strip().lower()
            auslastung_text = tds[7].text.strip()
            
            # 🎯 1. FILTER: Wir filtern STRENG nur auf Ankündigungen
            ist_ankuedigung = "ankündigung" in status_text or "ankundigung" in status_text
            
            if not ist_ankuedigung:
                continue
                
            # 2. FILTER: Wenn storniert oder geschlossen -> überspringen
            if "cancelled" in status_text or "geschlossen" in status_text or "closed" in status_text:
                continue
                
            disziplin = tds[0].text.strip()
            level = tds[1].text.strip()
            
            # --- REGION KUGELSICHER AUSLESEN (Aus deiner Vorlage) ---
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
                
                # 🎯 GENIALER TRICK: Das Eröffnungsdatum steht bei Ankündigungen 
                # direkt in der Spalte "Auslastung" der Haupttabelle!
                oeffnungs_datum = auslastung_text.strip()
                if not oeffnungs_datum or oeffnungs_datum.lower() == "ankündigung":
                    oeffnungs_datum = "Siehe Detailseite"
                
                # Datum aus der Spalte auslesen und bereinigen (Aus deiner Vorlage)
                datum_raw = tds[5].text.strip()
                datum_match = re.search(r'\d{2}\.\d{2}\.(?:\s*-\s*\d{2}\.\d{2}\.)?\s*\d{2,4}', datum_raw)
                datum = datum_match.group(0).strip() if datum_match else (datum_raw if datum_raw else "N/A")

                # Datenstruktur exakt passend für deine Supabase-Tabelle vorbereiten
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

    # Wenn wir Matches gefunden haben, synchronisieren wir sie mit Supabase
    if matches_to_insert:
        print("Lösche alte Einträge aus 'upcoming_matches'...")
        # Löscht die alten Einträge, damit die Tabelle tagesaktuell bleibt
        supabase.from_("upcoming_matches").delete().neq("name", "---").execute()
        
        print(f"Schreibe {len(matches_to_insert)} neue Einträge in Supabase...")
        # Schießt alle neuen Matches per Bulk-Insert in die DB
        supabase.from_("upcoming_matches").insert(matches_to_insert).execute()
        print("Erfolgreich mit Supabase synchronisiert!")
    else:
        print("Keine neuen Ankündigungen auf IPSC-Match gefunden.")

except Exception as e:
    print(f"Fehler: {e}")
