import requests

api_url = "https://ipscmatch.de/?matchapi"
headers = {
    "User-Agent": "Doppel-AA-IPSC-Bot / info@ipscboerse.com",
    "Accept": "application/json"
}

try:
    print("Rufe rohe API-Daten ab...")
    response = requests.get(api_url, headers=headers, timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n--- ERGEBNIS: Die API hat insgesamt {len(data)} Einträge geliefert! ---\n")
        
        # Wir drucken die IDs und Namen ALLER Matches aus, die der Server uns schickt
        for match_id, info in data.items():
            name = info.get("Name", "Kein Name")
            startreg = info.get("Startreg", "Kein Meldestart")
            status = info.get("Status", "Kein Status")
            print(f"ID: {match_id} | Name: {name} | Startreg: {startreg} | Status: {status}")
            
    else:
        print(f"Fehler! Server antwortet mit Status: {response.status_code}")

except Exception as e:
    print(f"Fehler beim Abruf: {e}")
