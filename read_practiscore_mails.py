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
    # Entfernt Sonderzeichen für einen toleranteren Namensvergleich
    return re.sub(r'[^a-zA-Z0-9]', '', s.lower())

def get_users_from_db(supabase):
    try:
        response = supabase.table("profiles").select("id, real_name").not_.is_("real_name", "null").execute()
        return response.data
    except Exception as e:
        print(f"❌ Fehler beim Laden der Profile aus Supabase: {e}")
        return []

def extract_hits(body_text):
    hits = {"a": 0, "c": 0, "d": 0, "m": 0}
    
    # Suche nach A C D gefolgt von den Zahlen
    acd_match = re.search(r'A\s+C\s+D[\s\S]*?(\d+)\s+(\d+)\s+(\d+)', body_text)
    if acd_match:
        hits["a"] = int(acd_match.group(1))
        hits["c"] = int(acd_match.group(2))
        hits["d"] = int(acd_match.group(3))
        
    # Suche nach Miss N/S Proc gefolgt von den Zahlen
    miss_match = re.search(r'Miss\s+N/S\s+Proc[\s\S]*?(\d+)\s+(\d+)\s+(\d+)', body_text)
    if miss_match:
        hits["m"] = int(miss_match.group(1))
        
    return hits

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
        # WICHTIG: BODY.PEEK markiert die Mail beim Lesen NICHT als gelesen!
        res, msg_data = mail.fetch(mail_id, "(BODY.PEEK[])")
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1], policy=default)
                
                # Betreff sauber dekodieren
                subject = msg["Subject"] or ""
                if isinstance(subject, bytes):
                    subject = subject.decode('utf-8', errors='ignore')
                
                print(f"Lese E-Mail: {subject}")

                # Mail-Text (Body) extrahieren
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == 'text/plain':
                            body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                            break
                else:
                    body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

                # Sicherheits-Check: Ist es eine PractiScore / Verify Mail?
                is_ipsc_mail = bool(re.search(r'(Stage\s+\d+)', subject + " " + body, re.IGNORECASE) and ("A C D" in body or "Verify" in subject or "Scores" in subject))

                if not is_ipsc_mail:
                    print("   -> Keine IPSC-Ergebnismail. Wird ignoriert und bleibt UNGELESEN.")
                    continue

                print(f"   -> IPSC-Mail erkannt! Starte Analyse...")

                # --- VERBESSERTER NAMENS-PARSER (Fwd-Tolerant) ---
                # Findet die Nummer und den Namen ("443 Schöps, Fabian"), egal was davor steht
                name_match = re.search(r'\b\d+\s+([^,\n]+),\s*([^\n\r]+)', body)
                if not name_match:
                    print("   ⚠️ Kein gültiger Schützen-Name im Text gefunden. Mail wird gelöscht.")
                    mail.store(mail_id, '+FLAGS', '\\Deleted')
                    continue
                    
                last_name = name_match.group(1).strip()
                first_name = name_match.group(2).strip()
                full_name_extracted = f"{first_name} {last_name}"
                
                # Stage-Nummer ermitteln
                stage_match = re.search(r'(Stage\s+\d+)', subject + " " + body, re.IGNORECASE)
                stage_name_extracted = stage_match.group(1).strip() if stage_match else "Unknown Stage"

                # Passenden User in der Datenbank matchen
                matched_user_id = None
                for u in users:
                    db_name_clean = clean_string(u['real_name'])
                    extracted_name_clean = clean_string(full_name_extracted)
                    if db_name_clean == extracted_name_clean or (clean_string(last_name) in db_name_clean and clean_string(first_name) in db_name_clean):
                        matched_user_id = u['id']
                        break
                        
                if not matched_user_id:
                    print(f"   🕵️‍♂️ Schütze '{full_name_extracted}' existiert nicht in Profilen. Mail wird gelöscht.")
                    mail.store(mail_id, '+FLAGS', '\\Deleted')
                    continue

                # Treffer extrahieren
                hits = extract_hits(body)
                if sum(hits.values()) == 0:
                    print("   ⚠️ Keine Trefferdaten (A,C,D) im Text gefunden. Mail wird gelöscht.")
                    mail.store(mail_id, '+FLAGS', '\\Deleted')
                    continue

                # In Supabase updaten
                try:
                    stage_query = supabase.table("user_match_analytics").select("id").eq("user_id", matched_user_id).ilike("stage_name", f"%{stage_name_extracted}%").execute()
                    
                    if stage_query.data and len(stage_query.data) > 0:
                        entry_id = stage_query.data[0]['id']
                        supabase.table("user_match_analytics").update({
                            "alphas": hits["a"],
                            "charlies": hits["c"],
                            "deltas": hits["d"],
                            "misses": hits["m"]
                        }).eq("id", entry_id).execute()
                        
                        print(f"   ✅ Treffer gespeichert für {full_name_extracted} ({stage_name_extracted}): A:{hits['a']} C:{hits['c']} D:{hits['d']} M:{hits['m']}")
                    else:
                        print(f"   ⚠️ Stage '{stage_name_extracted}' für {full_name_extracted} noch nicht in DB (Warte auf Web-Scraper PDF-Lauf).")
                except Exception as e:
                    print(f"   ❌ DB Update Fehler: {e}")

                # Mail zum Löschen markieren
                mail.store(mail_id, '+FLAGS', '\\Deleted')
                print("   🗑️ E-Mail wurde erfolgreich gelöscht.")

    # Alle gelöschten Mails endgültig entfernen
    mail.expunge()
    mail.logout()
    print("Bot erfolgreich beendet.")

if __name__ == "__main__":
    main()
