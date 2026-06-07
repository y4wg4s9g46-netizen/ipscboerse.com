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
    Maximal robuster Parser: Ignoriert alles bis zum Range Officer
    und greift sich exakt die Tabelle darunter.
    """
    hits = {"a": 0, "c": 0, "d": 0, "m": 0}
    
    # 1. Wir schneiden den ganzen Kopfbereich ab. 
    # "Range Officer" ist der perfekte Anker, da er immer direkt über der Tabelle steht.
    parts = re.split(r'(?i)Range Officer[^\n]*', block)
    # Wenn wir den RO nicht finden, nehmen wir zur Sicherheit die letzten 200 Zeichen
    hit_table = parts[-1] if len(parts) > 1 else block[-200:]
    
    # 2. Bereinigen: Kommas, Quotes, Pipes durch Leerzeichen ersetzen
    clean_table = re.sub(r'["|,]', ' ', hit_table)
    
    # 3. Entferne alle Kommazahlen (wie den Hit Factor 6.0377 oder die Zeit 20.54)
    table_no_floats = re.sub(r'\b\d+\.\d+\b', '', clean_table)
    
    # 4. Fall 1: A, C, D kleben als Buchstaben direkt an den Zahlen (z.B. "8A", "2D" in Stage 19)
    if re.search(r'\b\d+A\b', table_no_floats, re.IGNORECASE):
        for hit_type in ['a', 'c', 'd', 'm']:
            m = re.search(fr'\b(\d+){hit_type.upper()}\b', table_no_floats, re.IGNORECASE)
            if m: hits[hit_type] = int(m.group(1))
        
        # Falls Miss als einzelnes Wort in dieser verrutschten Tabelle steht
        if hits["m"] == 0:
            m_miss = re.search(r'\bMiss\s*(\d+)', table_no_floats, re.IGNORECASE)
            if m_miss: hits["m"] = int(m_miss.group(1))
        return hits

    # 5. Fall 2: Normale Tabellen. Wir sammeln einfach alle verbleibenden ganzen Zahlen.
    zahlen = [int(x) for x in re.findall(r'\b\d+\b', table_no_floats)]
    
    if not zahlen:
        return hits

    # 6. Spezial-Korrektur für PDF/Mail-Salat, wenn sich plötzlich Nullen vordrängeln (wie Stage 14)
    if len(zahlen) >= 5 and zahlen[1] == 0 and sum(zahlen[2:]) > 0 and sum(zahlen[:1]) > 0:
         echte_treffer = [z for z in zahlen if z != 0]
         zahlen = echte_treffer + [0, 0, 0, 0] # Mit Nullen auffüllen
         
    # 7. Standardmäßige IPSC-Zuweisung
    if len(zahlen) >= 1: hits["a"] = zahlen[0]
    if len(zahlen) >= 2: hits["c"] = zahlen[1]
    if len(zahlen) >= 3: hits["d"] = zahlen[2]
    if len(zahlen) >= 4: hits["m"] = zahlen[3]
    
    # Korrektur, falls N/S vor Miss stand in der Kopfzeile
    if len(zahlen) >= 5 and re.search(r'\bN/S\s*Miss\b', hit_table, re.IGNORECASE):
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

                # Abfrage in lower() für Sicherheit bei allen E-Mail-Clients
                if not ("stage" in body.lower() or "verify" in subject.lower()):
                    print("   -> Keine IPSC-Ergebnismail. Wird ignoriert.")
                    continue

                # --- DER ULTIMATIVE PARSER-SPLIT ---
                # Wir zerschneiden die Mail exakt an der PractiScore-Bestätigung!
                # Dadurch enthält jeder Block garantiert genau EINE Stage, völlig unbeeindruckt von Mail-Headern.
                raw_blocks = re.split(r'(?i)Score confirmed at[^\n]*|Secured and verified[^\n]*', body)
                
                verarbeitete_stages_ids = set()
                is_any_block_processed = False

                for block in raw_blocks:
                    # Müll-Blöcke (z.B. Euromaster) sofort skippen
                    if "Euromaster" in block or "Dienstleistung" in block:
                        continue

                    # Stage-Nummer suchen
                    stage_match = re.search(r'Stage:\s*(?:Stage\s+)?(\d+)|Stage\s+(\d+)\s*-', block, re.IGNORECASE)
                    if not stage_match:
                        continue
                    
                    stage_num_str = stage_match.group(1) or stage_match.group(2)
                    stage_nummer = int(stage_num_str)
                    stage_name_extracted = f"Stage {stage_nummer}"

                    # Doppelte Verarbeitungen blockieren
                    if stage_nummer in verarbeitete_stages_ids:
                        continue

                    # Schütze / Name suchen (z.B. 443 Schöps, Fabian)
                    name_match = re.search(r'\b\d+\s+([^,\n]+),\s*([^\n\r]+)', block)
                    if not name_match:
                        continue
                        
                    last_name = name_match.group(1).strip()
                    first_name = name_match.group(2).strip()
                    full_name_extracted = f"{first_name} {last_name}"

                    # User matchen
                    matched_user_id = None
                    for u in users:
                        db_name_clean = clean_string(u['real_name'])
                        extracted_name_clean = clean_string(full_name_extracted)
                        if db_name_clean == extracted_name_clean or (clean_string(last_name) in db_name_clean and clean_string(first_name) in db_name_clean):
                            matched_user_id = u['id']
                            break
                            
                    if not matched_user_id:
                        continue

                    # Treffer extrahieren
                    hits = extrahiere_treffer_flexibel(block)

                    if sum(hits.values()) == 0:
                        continue

                    # Supabase Update
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
