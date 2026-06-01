// === ZENTRALE SUPABASE KONFIGURATION ===
const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yModrA5JZTiN5Cw7MHQqLQ_Coc04WAS";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global verfügbar machen
window.supabaseClient = supabaseClient;
window.currentUser = null;
window.currentLang = "de";

window.translations = {
  de: {
    "main-title": "IPSC STARTPLATZ-BÖRSE",
    "sub-title": "Von Schützen für Schützen – Live Marktplatz",
    "btn-login-reg": "Login / Registrieren",
    "logout": "Abmelden",
    "info-msg": "<strong>Wichtiger Hinweis:</strong> Diese Plattform dient nur der Vermittlung. Die endgültige Umschreibung des Startplatzes muss zwingend über den jeweiligen Match Director durchgeführt werden!",
    "form-title": "Eintrag erstellen",
    "form-title-edit": "Eintrag bearbeiten ✏️",
    "opt-offer": "Ich BIETE einen Startplatz an",
    "opt-want": "Ich SUCHE einen Startplatz",
    "lbl-name": "Name des Matches *",
    "lbl-level": "Match Level *",
    "lbl-date": "Datum des Matches *",
    "lbl-location": "Austragungsort (Stand) *",
    "lbl-country": "Land *",
    "lbl-squad": "Squad Nummer (Optional)",
    "lbl-price": "Abgabepreis (€) *",
    "lbl-email": "Deine E-Mail-Adresse *",
    "btn-insert": "Eintrag kostenlos veröffentlichen",
    "btn-save-edit": "Änderungen speichern",
    "btn-cancel": "Abbrechen",
    "filter-type": "Anzeigentyp:",
    "filter-all": "Alle Anzeigen",
    "filter-offers": "Nur Angebote (Biete)",
    "filter-wants": "Nur Gesuche (Suche)",
    "list-title": "Aktuelle Marktplatz-Einträge",
    "loading": "Lade aktuelle Startplätze...",
    "modal-login-title": "Anmelden",
    "modal-btn-login": "Einloggen",
    "modal-no-acc": "Noch kein Konto?",
    "modal-link-reg": "Registrieren",
    "modal-reg-title": "Konto erstellen",
    "modal-btn-reg": "Konto erstellen",
    "modal-has-acc": "Bereits registriert?",
    "modal-link-login": "Zum Login",
    "footer-impressum-link": "Impressum & Rechtliche Hinweise",
    "no-slots": "Aktuell keine Einträge verfügbar.",
    "btn-request": "Anbieter kontaktieren",
    "btn-contact-want": "Schützen kontaktieren",
    "btn-delete": "Löschen",
    "btn-edit": "Bearbeiten",
    "btn-export": "Export (.ics)",
    "report-btn": "Melden",
    "buy-coffee": "Kaffee spendieren",
    "social-proof": "Erfolgreich vermittelte Startplätze: ",
    "login-required": "Nur eingeloggte Nutzer können kontaktieren",
    "security-checklist": "\n\nSicherheits-Checkliste vor der E-Mail:\n- Match-Daten geprüft?\n- Match Director kontaktiert?",
    "tag-offer": "BIETE",
    "tag-want": "SUCHE",
    "link-forgot-pwd": "Passwort vergessen?",
    "modal-forgot-title": "Passwort vergessen",
    "modal-btn-forgot": "Zurücksetzungs-Link senden",
    "modal-reset-title": "Neues Passwort vergeben",
    "lbl-new-password": "Neues Passwort *",
    "btn-save": "Änderungen speichern",
    "modal-settings-title": "Konto-Einstellungen",
    "lbl-username": "Schützenname / Anzeigename",
    "btn-delete-acc": "Konto & alle Einträge unwiderruflich löschen",
    "email-subject-offer": "Interesse an deinem IPSC Startplatz: ",
    "email-subject-want": "Bezüglich deiner Suche nach einem IPSC Startplatz: ",
    "email-body-offer": "Hallo,\n\nich habe dein Inserat auf ipscboerse.com gesehen und interessiere mich für den von dir angebotenen Startplatz für das Match: ",
    "email-body-want": "Hallo,\n\nich habe dein Gesuch auf ipscboerse.com gesehen. Ich hätte einen Startplatz abzugeben für das Match: ",
    "email-body-footer": "\n\nIst das Inserat noch aktuell?\n\nViele Grüße",
    "security-notice": "⚠️ WICHTIGER SICHERHEITSHINWEIS:\n\n1. Nutze für Zahlungen IMMER PayPal mit Käuferschutz (niemals 'Freunde & Familie').\n2. Kontaktiere ZWINGEND den Match Director, BEVOR du Geld sendest, um zu prüfen, ob eine Umschreibung des Platzes überhaupt noch möglich ist!\n\nMöchtest du den E-Mail-Kontakt jetzt öffnen?",
    "spam-error": "Spam-Schutz: Du hast bereits einen Eintrag für dieses Match an diesem Datum erstellt!"
  },
  en: {
    "main-title": "IPSC SLOT MARKETPLACE",
    "sub-title": "By Shooters for Shooters – Live Marketplace",
    "btn-login-reg": "Login / Register",
    "logout": "Logout",
    "info-msg": "<strong>Important Notice:</strong> This platform only serves as a mediator. The final transfer of the slot must be processed by the respective Match Director!",
    "form-title": "Create Entry",
    "form-title-edit": "Edit Entry ✏️",
    "opt-offer": "I OFFER a slot",
    "opt-want": "I AM LOOKING FOR a slot",
    "lbl-name": "Match Name *",
    "lbl-level": "Match Level *",
    "lbl-date": "Match Date *",
    "lbl-location": "Location (Range) *",
    "lbl-country": "Country *",
    "lbl-squad": "Squad Number (Optional)",
    "lbl-price": "Price (€) *",
    "lbl-email": "Your Email Address *",
    "btn-insert": "Publish Entry for Free",
    "btn-save-edit": "Save Changes",
    "btn-cancel": "Cancel",
    "filter-type": "Ad Type:",
    "filter-all": "All Ads",
    "filter-offers": "Offers Only",
    "filter-wants": "Wants Only",
    "list-title": "Current Marketplace Entries",
    "loading": "Loading current slots...",
    "modal-login-title": "Login",
    "modal-btn-login": "Login",
    "modal-no-acc": "Don't have an account?",
    "modal-link-reg": "Register",
    "modal-reg-title": "Create Account",
    "modal-btn-reg": "Create Account",
    "modal-has-acc": "Already registered?",
    "modal-link-login": "Go to Login",
    "footer-impressum-link": "Imprint & Legal Notices",
    "no-slots": "No marketplace entries available.",
    "btn-request": "Contact Seller",
    "btn-contact-want": "Contact Shooter",
    "btn-delete": "Delete",
    "btn-edit": "Edit",
    "btn-export": "Export (.ics)",
    "report-btn": "Report",
    "buy-coffee": "Buy me a coffee",
    "social-proof": "Successfully mediated slots: ",
    "login-required": "Only logged-in users can contact",
    "security-checklist": "\n\nSecurity checklist before email:\n- Match details verified?\n- Match Director contacted?",
    "tag-offer": "OFFER",
    "tag-want": "WANTED",
    "link-forgot-pwd": "Forgot password?",
    "modal-forgot-title": "Reset Password",
    "modal-btn-forgot": "Send Reset Link",
    "modal-reset-title": "Set New Password",
    "lbl-new-password": "New Password *",
    "btn-save": "Save Changes",
    "modal-settings-title": "Account Settings",
    "lbl-username": "Shooter / Display Name",
    "btn-delete-acc": "Permanently Delete Account & Postings",
    "email-subject-offer": "Inquiry regarding your IPSC slot: ",
    "email-subject-want": "Regarding your request for an IPSC slot: ",
    "email-body-offer": "Hello,\n\nI saw your listing on ipscboerse.com and I am interested in the slot you offered for the match: ",
    "email-body-want": "Hello,\n\nI saw your request on ipscboerse.com. I have an available slot to give away for the match: ",
    "email-body-footer": "\n\nIs this listing still available?\n\nBest regards",
    "security-notice": "⚠️ IMPORTANT SAFETY NOTICE:\n\n1. ALWAYS use PayPal with Buyer Protection for payments (never use 'Friends & Family').\n2. You MUST contact the Match Director BEFORE making any payment to confirm if a slot transfer is still permitted!\n\nDo you want to open the email client now?",
    "spam-error": "Spam protection: You have already posted an entry for this match on this date!"
  }
};

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

function applyLanguage(lang) {
  window.currentLang = lang;
  document.querySelectorAll("[data-txt]").forEach(el => {
    const key = el.getAttribute("data-txt");
    if (window.translations[lang] && window.translations[lang][key]) { 
      if (key === "form-title" && window.editingMatchId !== undefined && window.editingMatchId !== null) return;
      if (key === "btn-insert" && window.editingMatchId !== undefined && window.editingMatchId !== null) return;
      el.innerHTML = window.translations[lang][key]; 
    }
  });

  const levelSelect = document.getElementById("match-level");
  if (levelSelect) {
    const currentVal = levelSelect.value;
    const defaultText = lang === "en" ? "Please select..." : "Bitte wählen...";
    levelSelect.innerHTML = `<option value="">${defaultText}</option><option value="Level I">Level I</option><option value="Level II">Level II</option><option value="Level III">Level III</option>`;
    levelSelect.value = currentVal;
  }
  if (typeof window.onLanguageChanged === "function") { window.onLanguageChanged(lang); }
}

async function checkUserStatus() {
  const container = document.getElementById("auth-status-container");
  const emailField = document.getElementById("seller-email");
  const user = window.currentUser;
  
  if (user) {
    const displayName = user.user_metadata?.username || user.email;
    if (container) {
      container.innerHTML = `<span id="btn-open-settings" style="cursor:pointer; font-weight:bold; text-decoration:underline; color:var(--accent-color); margin-right:10px;">${escapeHtml(displayName)}</span><button class="btn-auth" id="btn-logout" style="border-color: var(--danger-color); color: var(--danger-color);">${window.translations[window.currentLang]["logout"]}</button>`;
    }
    if (emailField) { emailField.value = user.email; emailField.readOnly = true; }
  } else {
    if (container) {
      container.innerHTML = `<button class="btn-auth" id="btn-open-login">${window.translations[window.currentLang]["btn-login-reg"]}</button>`;
    }
    if (emailField) { emailField.value = ""; emailField.placeholder = "Logge dich ein, um zu inserieren"; }
  }
}

function toggleAuthView(view) {
  if(document.getElementById("modal-login-view")) document.getElementById("modal-login-view").style.display = view === "login" ? "block" : "none";
  if(document.getElementById("modal-register-view")) document.getElementById("modal-register-view").style.display = view === "register" ? "block" : "none";
  if(document.getElementById("modal-forgot-view")) document.getElementById("modal-forgot-view").style.display = view === "forgot" ? "block" : "none";
  if(document.getElementById("modal-reset-view")) document.getElementById("modal-reset-view").style.display = view === "reset-password" ? "block" : "none";
  if(document.getElementById("modal-settings-view")) document.getElementById("modal-settings-view").style.display = view === "settings" ? "block" : "none";
}
window.toggleAuthView = toggleAuthView;


// ==========================================
// --- ROBUSTE EVENT DELEGATION (NEU) ---
// ==========================================

// 1. Klicks auf der ganzen Seite überwachen
document.addEventListener("click", async (e) => {
    
    // Login-Button geklickt
    if (e.target.id === "btn-open-login" || e.target.closest("#btn-open-login")) {
        document.getElementById("auth-modal").style.display = "flex";
        toggleAuthView("login");
    }
    
    // Modal schließen geklickt
    if (e.target.id === "btn-close-modal" || e.target.closest("#btn-close-modal")) {
        document.getElementById("auth-modal").style.display = "none";
    }
    
    // Logout geklickt
    if (e.target.id === "btn-logout" || e.target.closest("#btn-logout")) {
        await window.supabaseClient.auth.signOut();
        location.reload();
    }
    
    // Einstellungen geklickt
    if (e.target.id === "btn-open-settings" || e.target.closest("#btn-open-settings")) {
        document.getElementById("auth-modal").style.display = "flex";
        toggleAuthView("settings");
        const settingsUser = document.getElementById("settings-username");
        if (settingsUser && window.currentUser) {
            settingsUser.value = window.currentUser.user_metadata?.username || "";
        }
    }
    
    // Profil löschen geklickt
    if (e.target.id === "btn-delete-account") {
        e.preventDefault();
        if (!confirm("⚠️ WARNUNG:\n\nMöchtest du dein Profil und all deine aktiven Marktplatz-Inserate wirklich unwiderruflich löschen?")) return;
        await window.supabaseClient.from("matches").delete().eq("seller_email", window.currentUser.email);
        await window.supabaseClient.auth.updateUser({ data: { deleted: true, username: "Gelöschter Schütze" } });
        await window.supabaseClient.auth.signOut();
