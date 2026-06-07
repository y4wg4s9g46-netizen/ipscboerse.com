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
    Sucht extrem flexibel nach den Trefferzahlen (A, C, D, Miss), 
    da die Plain-Text-Tabellen je nach Mail-Client stark variieren.
    """
    hits = {"a": 0, "c": 0, "d": 0, "m": 0}
    
    # Sucht nach Zahlenblöcken unterhalb/nahe der Tabellenüberschriften
    # Findet Formate wie: "14","9 1","0" oder "25 0 7"
    # Wir bereinigen den Block von störenden Anführungszeichen und Kommas für den Regex
    clean_block = block.replace('"', '').replace(',', ' ')
    
    # 1. Alphas, Charlies, Deltas extrahieren
    # Wir suchen nach der Zeile, die A, C, D (in beliebiger Reihenfolge/Trennart) definiert
    if re.search(r'\bA\b[\s\S]*?\bC\b[\s\S]*?\bD\b', clean_block, re.IGNORECASE) or "A C D" in clean_block:
        # Matcht typische Zahlenreihen für IPSC Treffer (3 bis 4 Zahlenfolgen untereinander/nebeneinander)
        zahlen_matches = re.findall(r'\b(\d+)\b', clean_block)
        # Wir suchen die Zahlen, die nach den Buchstaben auftauchen und logisch zu Treffern passen
        # Sicherer Ansatz: Wir nutzen spezifische Zeilen-Parser
        lines = clean_block.splitlines()
        for i, line in enumerate(lines):
            # Wenn eine Zeile reine Trefferzahlen enthält (z.B. 14  9 1  0 oder 25 0 7)
            if re.match(r'^\s*\d+(\s+\d+){2,4}\s*$', line):
                parts = line.split()
                if len(parts) >= 3:
                    hits["a"] = int(parts[0])
                    hits["c"] = int(parts[1])
                    hits["d"] = int(parts[2])
                    break

    # 2. Misses extrahieren
    # Sucht nach "Miss" oder "Misses" und greift sich die darauffolgende Zahl ab
    # Berücksichtigt, dass manchmal "N/S" oder "Proc" dazwischen steht
    miss_match = re.search(r'\bMiss\b[\s\S]*?(\d+)', clean_block, re.IGNORECASE)
    if miss_match:
        hits["m"] = int(miss_match.group(1))
    else:
        # Alternativ-Suche, falls Miss in der Tabellenzeile stand (z.B. "14 9 1 0 0 0")
        lines = clean_block.splitlines()
        for line in lines:
            if re.match(r'^\s*\d+(\s+\d+){4,}\s*$', line):
                parts = line.split()
                # Oft ist Index 3 oder 4 der Miss-Wert bei langen Zeilen
                if len(parts) >= 4:
                    hits["m"] = int(parts[3])

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
                # Wir splitten strikt an den Weiterleitungs-Schnittstellen
                raw_blocks = body.split("Anfang der weitergeleiteten Nachricht:")
                
                # Verwende ein Set, um verarbeitete Stage-Nummern pro E-Mail zu tracken (Verhindert Double-Parsing)
                verarbeitete_stages_ids = set()
                is_any_block_processed = False

                for block in raw_blocks:
                    # Spam / Werkstatt-Mails sofort blockieren
                    if "Euromaster" in block or "Dienstleistung" in block:
                        continue

                    # Prüfen, ob eine echte Stage-Tabelle deklariert wird (z.B. "Stage: Stage 19" oder "Stage 19 - R11")
                    stage_match = re.search(r'Stage:\s*(?:Stage\s+)?(\d+)|Stage\s+(\d+)\s*-', block, re.IGNORECASE)
                    if not stage_match:
                        continue
                    
                    # Die korrekte ID aus der passenden Match-Gruppe holen
                    stage_num_str = stage_match.group(1) or stage_match.group(2)
                    stage_nummer = int(stage_num_str)
                    stage_name_extracted = f"Stage {stage_nummer}"

                    # Wenn wir diese Stage aus dieser Mail schon hatten -> Überspringen!
                    if stage_nummer in verarbeitete_stages_ids:
                        continue

                    # Namens-Parser für diesen spezifischen Block
                    name_match = re.search(r'\b\d+\s+([^,\n]+),\s*([^\n\r]+)', block)
                    if not name_match:
                        continue
                        
                    last_name = name_match.group(1).strip()
                    first_name = name_match.group(2).strip()
                    full_name_extracted = f"{first_name} {last_name}"

                    # User zuordnen
                    matched_user_id = None
                    for u in users:
                        db_name_clean = clean_string(u['real_name'])
                        extracted_name_clean = clean_string(full_name_extracted)
                        if db_name_clean == extracted_name_clean or (clean_string(last_name) in db_name_clean and clean_string(first_name) in db_name_clean):
                            matched_user_id = u['id']
                            break
                            
                    if not matched_user_id:
                        continue

                    # Treffer extrahieren über die neue, flexible Funktion
                    hits = extrahiere_treffer_flexibel(block)

                    # Wenn absolut gar keine Treffer gefunden wurden, ist es nur ein Info-Block ohne Tabelle
                    if sum(hits.values()) == 0:
                        continue

                    # In Supabase speichern
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

                print(f"   -> {len(verarbeitete_stages_ids)} echte Stages in dieser E-Mail erfolgreich verarbeitet!")

                # Wenn mindestens ein Block erfolgreich gespeichert wurde, löschen wir die Mail
                if is_any_block_processed:
                    mail.store(mail_id, '+FLAGS', '\\Deleted')
                    print("   🗑️ Sammel-E-Mail wurde erfolgreich verarbeitet und gelöscht.")

    mail.expunge()
    mail.logout()
    print("\nBot erfolgreich beendet.")

if __name__ == "__main__":
    main()
