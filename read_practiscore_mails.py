import os
import imaplib
import email
from email.policy import default
import re
from supabase import create_client, Client

# --- 1. SETUP & UMGEBUNGSVARIABLEN ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
IMAP_SERVER = os.environ.get("IMAP_SERVER", "imap.ionos.de")
EMAIL_USER = os.environ.get("EMAIL_USER")
EMAIL_PASS = os.environ.get("EMAIL_PASS")

def clean_string(s):
    return re.sub(r'[^a-zA-Z0-9]', '', s.lower())

def get_users_from_db(supabase):
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        return response.data
    except Exception as e:
        print(f"❌ Fehler beim Laden der Profile aus Supabase: {e}")
        return []

def extrahiere_treffer_flexibel(block):
    """
    Kugelsicherer Parser: Trennt die Metadaten ab und liest die nackten Zahlen.
    """
    hits = {"a": 0, "c": 0, "d": 0, "m": 0}
    
    # Geheimwaffe: Wir nehmen nur den Text NACH der ZWEITEN Tabelle im Block.
    # Dadurch ignorieren wir Squad-Nummern (wie 47) oder Stage-Zahlen komplett!
    parts = block.split("The following table:")
    hit_table = parts[-1] if len(parts) > 1 else block
    
    # Alle Quotes, Kommas und Pipes durch Leerzeichen ersetzen
    clean_table = re.sub(r'["|,]', ' ', hit_table)
    
    # Fall 1: Stark verrutschte Tabellen, wo Buchstaben direkt an den Zahlen kleben (z.B. Stage 19: "8A", "2D")
    if re.search(r'\b\d+A\b', clean_table, re.IGNORECASE):
        for hit_type in ['a', 'c', 'd', 'm']:
            m = re.search(fr'\b(\d+){hit_type.upper()}\b', clean_table, re.IGNORECASE)
            if m: hits[hit_type] = int(m.group(1))
        
        # Falls Miss separat steht
        if hits["m"] == 0:
            m_miss = re.search(r'\bMiss\s*(\d+)', clean_table, re.IGNORECASE)
            if m_miss: hits["m"] = int(m_miss.group(1))
        return hits

    # Fall 2: Der Standard-PractiScore-Export
    # Wir entfernen zuerst alle Kommazahlen (Hit Factor und Time), da diese sonst als Hits gezählt würden
    table_no_floats = re.sub(r'\b\d+\.\d+\b', '', clean_table)
    
    # Extrahieren aller verbleibenden reinen Ganzzahlen in der Reihenfolge ihres Auftretens
    zahlen = [int(x) for x in re.findall(r'\b\d+\b', table_no_floats)]
    
    if not zahlen:
        return hits

    # Standardmäßige Zuweisung nach IPSC-Regeln (A, C, D sind immer die ersten 3 Werte)
    if len(zahlen) >= 1: hits["a"] = zahlen[0]
    if len(zahlen) >= 2: hits["c"] = zahlen[1]
    if len(zahlen) >= 3: hits["d"] = zahlen[2]
    
    # Misses sind standardmäßig die 4. Zahl in der Reihe
    if len(zahlen) >= 4: 
        hits["m"] = zahlen[3]
        
    # Spezifische Korrektur: Wenn die Tabelle "N/S Miss" als Kopf hat, 
    # rutscht der Miss-Wert in der reinen Zahlenreihe meist eine Position nach hinten.
    if re.search(r'\bN/S\s*Miss\b', hit_table, re.IGNORECASE) and len(zahlen) >= 5:
        hits["m"] = zahlen[4]
    
    return hits

def main():
    print("Starte E-Mail Bot...")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Fehler: Supabase Credentials fehlen!")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Erfolgreich mit Supabase verbunden.")

    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("inbox")
        print("Erfolgreich im E-Mail-Postfach eingeloggt.")
    except Exception as e:
        print(f"❌ Fehler beim IMAP-Login: {e}")
        return

    status, messages = mail.search(None, 'UNSEEN')
    mail_ids = messages[0].split()
    print(f"{len(mail_ids)} ungelesene E-Mails im Postfach gefunden.")

    if not mail_ids:
        mail.logout()
        print("Bot erfolgreich beendet.")
        return

    users = get_users_from_db(supabase)

    for mail_id in mail_ids:
        res, msg_data = mail.fetch(mail_id, "(BODY.PEEK[])")
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1], policy=default)
                
                subject = msg["Subject"] or ""
                if isinstance(subject, bytes):
                    subject = subject.decode('utf-8', errors='ignore')
                
                print(f"\nLese E-Mail: {subject}")

                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == 'text/plain':
                            body += part.get_payload(decode=True).decode('utf-8', errors='ignore') + "\n"
                else:
                    body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

                if not ("Stage" in body or "Verify" in subject):
                    print("   -> Keine IPSC-Ergebnismail. Wird ignoriert.")
                    continue

                # --- KUGELSICHERER PARSER-SPLIT ---
                raw_blocks = body.split("Anfang der weitergeleiteten Nachricht:")
                
                verarbeitete_stages_ids = set()
                is_any_block_processed = False

                for block in raw_blocks:
                    if "Euromaster" in block or "Dienstleistung" in block:
                        continue

                    stage_match = re.search(r'Stage:\s*(?:Stage\s+)?(\d+)|Stage\s+(\d+)\s*-', block, re.IGNORECASE)
                    if not stage_match:
                        continue
                    
                    stage_num_str = stage_match.group(1) or stage_match.group(2)
                    stage_nummer = int(stage_num_str)
                    stage_name_extracted = f"Stage {stage_nummer}"

                    if stage_nummer in verarbeitete_stages_ids:
                        continue

                    name_match = re.search(r'\b\d+\s+([^,\n]+),\s*([^\n\r]+)', block)
                    if not name_match:
                        continue
                        
                    last_name = name_match.group(1).strip()
                    first_name = name_match.group(2).strip()
                    full_name_extracted = f"{first_name} {last_name}"

                    matched_user_id = None
                    for u in users:
                        db_name_clean = clean_string(u['real_name'])
                        extracted_name_clean = clean_string(full_name_extracted)
                        if db_name_clean == extracted_name_clean or (clean_string(last_name) in db_name_clean and clean_string(first_name) in db_name_clean):
                            matched_user_id = u['id']
                            break
                            
                    if not matched_user_id:
                        continue

                    # Treffer extrahieren über die neue, clevere Funktion
                    hits = extrahiere_treffer_flexibel(block)

                    if sum(hits.values()) == 0:
                        continue

                    try:
                        all_match_stages = supabase.table("user_match_analytics").select("id, stage_name").eq("user_id", matched_user_id).execute()
                        
                        entry_id = None
                        target_num = str(stage_nummer)
                        
                        for db_stage in all_match_stages.data:
                            db_stage_num = re.search(r'Stage\s+(\d+)\b', db_stage['stage_name'], re.IGNORECASE)
                            if not db_stage_num and re.search(r'\b\d+\b', db_stage['stage_name']):
                                db_stage_num = re.search(r'\b(\d+)\b', db_stage['stage_name'])
                                
                            if db_stage_num and db_stage_num.group(1) == target_num:
                                if "overall" not in db_stage['stage_name'].lower():
                                    entry_id = db_stage['id']
                                    stage_name_extracted = db_stage['stage_name']
                                    break

                        if entry_id:
                            supabase.table("user_match_analytics").update({
                                "alphas": hits["a"],
                                "charlies": hits["c"],
                                "deltas": hits["d"],
                                "misses": hits["m"]
                            }).eq("id", entry_id).execute()
                            
                            print(f"   ✅ Block verarbeitet für {full_name_extracted} ({stage_name_extracted}): A:{hits['a']} C:{hits['c']} D:{hits['d']} M:{hits['m']}")
                            verarbeitete_stages_ids.add(stage_nummer)
                            is_any_block_processed = True
                            
                    except Exception as e:
                        print(f"   ❌ DB Update Fehler in Block: {e}")

                if len(verarbeitete_stages_ids) > 0:
                    print(f"   -> {len(verarbeitete_stages_ids)} echte Stages in dieser E-Mail erfolgreich verarbeitet!")

                if is_any_block_processed:
                    mail.store(mail_id, '+FLAGS', '\\Deleted')
                    print("   🗑️ Sammel-E-Mail wurde erfolgreich verarbeitet und gelöscht.")

    mail.expunge()
    mail.logout()
    print("\nBot erfolgreich beendet.")

if __name__ == "__main__":
    main()
