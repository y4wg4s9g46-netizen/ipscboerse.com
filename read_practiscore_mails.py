import os
import imaplib
import email
from email.policy import default
from email.header import decode_header
import re
from supabase import create_client, Client

# --- 1. SETUP & UMGEBUNGSVARIABLEN ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
IMAP_SERVER = os.environ.get("IMAP_SERVER", "imap.ionos.de") # Standardmäßig IONOS
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

def main():
    print("Starte E-Mail Bot...")

    # 2. Verbindung zu Supabase herstellen
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Fehler: Supabase Credentials fehlen!")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Erfolgreich mit Supabase verbunden.")

    # 3. Verbindung zum E-Mail-Postfach herstellen
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("inbox")
        print("Erfolgreich im E-Mail-Postfach eingeloggt.")
    except Exception as e:
        print(f"❌ Fehler beim IMAP-Login: {e}")
        return

    # 4. Nach ungelesenen E-Mails suchen
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

                # Mail-Text (Body) extrahieren
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == 'text/plain':
                            body += part.get_payload(decode=True).decode('utf-8', errors='ignore') + "\n"
                else:
                    body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

                # Prüfen, ob überhaupt IPSC-Inhalte drin sind
                if not ("A C D" in body or "Stage" in body or "Verify" in subject):
                    print("   -> Keine IPSC-Ergebnismail. Wird ignoriert.")
                    continue

                # --- NEUER SAMMEL-MAIL-PARSER (Schleife durch den gesamten Text) ---
                # Wir splitten den Text überall dort, wo eine neue Stage-Meldung anfängt
                stage_blocks = re.split(r'(?=Stage\s+\d+)', body, flags=re.IGNORECASE)
                
                print(f"   -> {len(stage_blocks) - 1} potenzielle Stage-Blöcke in dieser E-Mail gefunden!")
                is_any_block_processed = False

                for block in stage_blocks:
                    if "A C D" not in block:
                        continue # Überspringe Blöcke ohne Trefferdaten

                    # 1. Stage-Nummer ermitteln
                    stage_match = re.search(r'(Stage\s+\d+)', block, re.IGNORECASE)
                    if not stage_match:
                        continue
                    stage_name_extracted = stage_match.group(1).strip()

                    # 2. Namens-Parser für diesen spezifischen Block
                    name_match = re.search(r'\b\d+\s+([^,\n]+),\s*([^\n\r]+)', block)
                    if not name_match:
                        continue
                        
                    last_name = name_match.group(1).strip()
                    first_name = name_match.group(2).strip()
                    full_name_extracted = f"{first_name} {last_name}"

                    # 3. User zuordnen
                    matched_user_id = None
                    for u in users:
                        db_name_clean = clean_string(u['real_name'])
                        extracted_name_clean = clean_string(full_name_extracted)
                        if db_name_clean == extracted_name_clean or (clean_string(last_name) in db_name_clean and clean_string(first_name) in db_name_clean):
                            matched_user_id = u['id']
                            break
                            
                    if not matched_user_id:
                        continue

                    # 4. Treffer extrahieren
                    hits = {"a": 0, "c": 0, "d": 0, "m": 0}
                    acd_match = re.search(r'A\s+C\s+D[\s\S]*?(\d+)\s+(\d+)\s+(\d+)', block)
                    if acd_match:
                        hits["a"] = int(acd_match.group(1))
                        hits["c"] = int(acd_match.group(2))
                        hits["d"] = int(acd_match.group(3))
                        
                    miss_match = re.search(r'Miss\s+N/S\s+Proc[\s\S]*?(\d+)\s+(\d+)\s+(\d+)', block)
                    if miss_match:
                        hits["m"] = int(miss_match.group(1))

                    if sum(hits.values()) == 0:
                        continue

                    # 5. In Supabase speichern (Kugelsicherer Zahlen-Matcher)
                    try:
                        all_match_stages = supabase.table("user_match_analytics").select("id, stage_name").eq("user_id", matched_user_id).execute()
                        mail_stage_num = re.search(r'Stage\s+(\d+)', stage_name_extracted, re.IGNORECASE)
                        
                        entry_id = None
                        if mail_stage_num:
                            target_num = mail_stage_num.group(1)
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
                            print(f"   ✅ Block verarbeitet für {full_name_extracted} ({stage_name_extracted}): A:{hits['a']} C:{hits['c']} D:{hits['d']}")
                            is_any_block_processed = True
                    except Exception as e:
                        print(f"   ❌ DB Update Fehler in Block: {e}")

                # Wenn in dieser Sammel-Mail mindestens ein Block erfolgreich gespeichert wurde, löschen wir sie!
                if is_any_block_processed:
                    mail.store(mail_id, '+FLAGS', '\\Deleted')
                    print("   🗑️ Sammel-E-Mail wurde erfolgreich verarbeitet und gelöscht.")

    mail.expunge()
    mail.logout()
    print("\nBot erfolgreich beendet.")

if __name__ == "__main__":
    main()
