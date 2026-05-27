const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let currentLang = "de";
let allMatchesCached = [];

const translations = {
  de: {
    "main-title": "IPSC STARTPLATZ-BÖRSE",
    "sub-title": "Von Schützen für Schützen – Live Marktplatz",
    "btn-login-reg": "Login / Registrieren",
    "info-msg": "<strong>Wichtiger Hinweis:</strong> Diese Plattform dient nur der Vermittlung.",
    "form-title": "Eintrag erstellen",
    "opt-offer": "Ich BIETE einen Startplatz an",
    "opt-want": "Ich SUCHE einen Startplatz",
    "lbl-name": "Name des Matches *",
    "lbl-level": "Match Level *",
    "lbl-date": "Datum des Matches *",
    "lbl-location": "Austragungsort (Stand) *",
    "lbl-squad": "Squad Nummer (Optional)",
    "lbl-email": "Deine E-Mail-Adresse *",
    "btn-insert": "Eintrag kostenlos veröffentlichen",
    "list-title": "Aktuelle Marktplatz-Einträge",
    loading: "Lade aktuelle Startplätze...",
    "modal-login-title": "Anmelden",
    "lbl-password": "Passwort *",
    "modal-btn-login": "Einloggen",
    "modal-no-acc": "Noch kein Konto?",
    "modal-link-reg": "Registrieren",
    "modal-reg-title": "Konto erstellen",
    "modal-btn-reg": "Konto erstellen",
    "modal-has-acc": "Bereits registriert?",
    "modal-link-login": "Zum Login",
    logout: "Abmelden",
    "no-slots": "Aktuell keine Einträge verfügbar.",
    "btn-request": "Anbieter kontaktieren",
    "btn-contact-want": "Schützen kontaktieren",
    "btn-delete": "Löschen",
    "alert-login-first": "Bitte melde dich zuerst an!",
    "alert-success": "Erfolgreich eingetragen!",
    "msg-save-err": "Fehler beim Speichern: ",
    "confirm-del": "Möchtest du diesen Eintrag wirklich löschen?",
    "alert-del-success": "Eintrag erfolgreich gelöscht!",
    "filter-type": "Anzeigentyp:",
    "filter-all": "Alle Einträge",
    "filter-offers": "Nur Angebote (Biete)",
    "filter-wants": "Nur Gesuche (Suche)",
    "lbl-price-offer": "Abgabepreis (€) *",
    "lbl-price-want": "Maximaler Kaufpreis (€) *",
    "tag-offer": "BIETE",
    "tag-want": "SUCHE",
    "footer-impressum-link": "Impressum & Rechtliche Hinweise"
  },
  en: {
    "main-title": "IPSC SLOT MARKETPLACE",
    "sub-title": "By Shooters for Shooters – Live Marketplace",
    "btn-login-reg": "Login / Register",
    "info-msg": "<strong>Important Note:</strong> This platform is for mediation only.",
    "form-title": "Create Entry",
    "opt-offer": "I am OFFERING a match slot",
    "opt-want": "I am LOOKING FOR a match slot",
    "lbl-name": "Match Name *",
    "lbl-level": "Match Level *",
    "lbl-date": "Match Date *",
    "lbl-location": "Location (Range) *",
    "lbl-squad": "Squad Number (Optional)",
    "lbl-email": "Your Email Address *",
    "btn-insert": "Publish Entry for Free",
    "list-title": "Current Marketplace Entries",
    loading: "Loading entries...",
    "modal-login-title": "Login",
    "lbl-password": "Password *",
    "modal-btn-login": "Login",
    "modal-no-acc": "Don't have an account?",
    "modal-link-reg": "Register here",
    "modal-reg-title": "Create Account",
    "modal-btn-reg": "Sign Up",
    "modal-has-acc": "Already registered?",
    "modal-link-login": "Back to Login",
    logout: "Logout",
    "no-slots": "No marketplace entries available.",
    "btn-request": "Contact Seller",
    "btn-contact-want": "Contact Shooter",
    "btn-delete": "Delete",
    "alert-login-first": "Please log in first!",
    "alert-success": "Successfully posted!",
    "msg-save-err": "Error saving data: ",
    "confirm-del": "Are you sure?",
    "alert-del-success": "Deleted successfully!",
    "filter-type": "Entry Type:",
    "filter-all": "All Entries",
    "filter-offers": "Offers Only",
    "filter-wants": "Requests Only",
    "lbl-price-offer": "Selling Price (€) *",
    "lbl-price-want": "Max. Budget Price (€) *",
    "tag-offer": "OFFER",
    "tag-want": "WANTED",
    "footer-impressum-link": "Legal Notice & Imprint"
  }
};

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

function applyLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-txt]").forEach(el => { const key = el.getAttribute("data-txt"); if (translations[lang][key]) el.innerHTML = translations[lang][key]; });
  const levelSelect = document.getElementById("match-level");
  const currentVal = levelSelect.value;
  levelSelect.innerHTML = lang === "de"
    ? '<option value="">Bitte wählen...</option><option value="Level I">Level I</option><option value="Level II">Level II</option><option value="Level III">Level III</option>'
    : '<option value="">Please select...</option><option value="Level I">Level I</option><option value="Level II">Level II</option><option value="Level III">Level III</option>';
  levelSelect.value = currentVal;
}

function renderMatches(matches) {
  const container = document.getElementById("match-container");
  container.innerHTML = matches.map(m => {
    const isWant = m.type === "want";
    const levelBadge = m.match_level ? `<span class="badge" style="background: var(--accent-color); color: #000;">${escapeHtml(m.match_level)}</span>` : "";
    return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
      <div class="match-details">
        <h3>${escapeHtml(m.match_name)} ${levelBadge} <span class="badge ${isWant ? "badge-want" : "badge-type"}">${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}</span></h3>
        <p><strong>Date:</strong> ${m.match_date} | <strong>Range:</strong> ${escapeHtml(m.match_location)}</p>
      </div>
      <div class="card-actions">
        <p style="font-size: 18px; font-weight: bold;">${parseFloat(m.match_price).toFixed(2)} €</p>
        <a href="mailto:${m.seller_email}" class="btn-contact">${isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"]}</a>
      </div>
    </div>`;
  }).join("");
}

// Initialisierung (gekürzt auf das Wesentliche)
applyLanguage("de");