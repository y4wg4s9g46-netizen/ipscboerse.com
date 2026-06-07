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
    Kugelsicherer Parser: Schneidet den E-Mail-Kopf und das Datum rigoros weg 
    und liest nur den echten Tabellen-Inhalt.
    """
    hits = {"a": 0, "c": 0, "d": 0, "m": 0}
    
    # 1. Den echten Ergebnis-Bereich isolieren! 
    # Wir suchen gezielt nur den Text ZWISCHEN "Time" oder "Factor" und "Score confirmed".
    # Das ignoriert den kompletten Müll am Anfang der Mail (Datum, Level-4, Squad-Nummer etc.)
    match = re.search(r'(?:Time|Factor)["\s,]*\n([\s\S]+?)(?:Warnings|Score confirmed)', block, re.IGNORECASE)
    
    if match:
        hit_table = match.group(1)
    else:
        # Fallback, falls die Regex nicht greift: Splitten und das Ende absichern
        parts = re.split(r'The following table:', block, flags=re.IGNORECASE)
        hit_table = parts[-1] if len(parts) > 1 else block[-200:]
        
    # 2. Ganz wichtig: Das Bestätigungs-Datum (z.B. 03/05/2026) am Ende wegschneiden!
    hit_table = re.split(r'Score confirmed', hit_table, flags=re.IGNORECASE)[0]

    # 3. Bereinigen: Kommas, Quotes, Pipes etc. weg
    clean_table = re.sub(r'["|,]', ' ', hit_table)
    
    # 4. Entferne alle Kommazahlen (Hit Factor und Zeit, z.B. 4.7712 oder 20.54)
    table_no_floats = re.sub(r'\b\d+\.\d+\b', '', clean_table)
    
    # 5. Hole alle restlichen Ganzzahlen in der exakten Reihenfolge ihres Auftretens
    zahlen = [int(x) for x in re.findall(r'\b\d+\b', table_no_floats)]
    
    if not zahlen:
        return hits

    # 6. Spezial-Korrektur für völlig verrutschte Tabellen (wie Stage 14: "23, 0, 0, 8, 1")
    # Wenn sich Nullen (z.B. für N/S) vordrängeln, werfen wir sie ans Ende, 
    # damit A, C und D auf den vorderen Plätzen bleiben.
    if len(zahlen) >= 5 and zahlen[1] == 0 and zahlen[2] == 0 and zahlen[3] > 0:
         echte_treffer = [z for z in zahlen if z != 0]
         zahlen = echte_treffer + [0, 0, 0, 0] # Mit Nullen auffüllen für den Rest
         
    # Standard-Zuweisung nach IPSC (A, C, D, Miss)
    if len(zahlen) >= 1: hits["a"] = zahlen[0]
    if len(zahlen) >= 2: hits["c"] = zahlen[1]
    if len(zahlen) >= 3: hits["d"] = zahlen[2]
    if len(zahlen) >= 4: hits["m"] = zahlen[3]
    
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
