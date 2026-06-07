import os
import imaplib
import email
from email.header import decode_header
from supabase import create_client, Client
from bs4 import BeautifulSoup
import PyPDF2
import io

# 1. Umgebungsvariablen (Secrets) aus GitHub Actions laden
IMAP_SERVER = os.environ.get("IMAP_SERVER")
EMAIL_USER = os.environ.get("EMAIL_USER")
EMAIL_PASS = os.environ.get("EMAIL_PASS")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def main():
    print("Starte E-Mail Bot...")

    # 2. Verbindung zu Supabase herstellen
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Fehler: Supabase Credentials fehlen!")
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
        print(f"Fehler beim IMAP-Login: {e}")
        return

    # 4. Nach E-Mails von PractiScore suchen
    # Hier suchen wir nach allen Mails, die das Wort "practiscore" enthalten (kann angepasst werden)
    status, messages = mail.search(None, '(ALL)') # Für den Test erstmal alle laden
    
    mail_ids = messages[0].split()
    print(f"{len(mail_ids)} E-Mails im Postfach gefunden.")

    for mail_id in mail_ids[-5:]: # Nur die letzten 5 Mails zum Testen
        res, msg_data = mail.fetch(mail_id, "(RFC822)")
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                
                # Betreff dekodieren
                subject, encoding = decode_header(msg["Subject"])[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding if encoding else "utf-8")
                
                print(f"Lese E-Mail: {subject}")

                # Hier kommt später deine Logik rein, um die Mails auszuwerten (PDFs lesen, HTML parsen etc.)
                # und die Daten mit supabase.table('deine_tabelle').insert({...}).execute() zu speichern!

    # 5. Postfach schließen
    mail.logout()
    print("Bot erfolgreich beendet.")

if __name__ == "__main__":
    main()
