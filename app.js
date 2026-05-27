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
    "tag-offer": "BIETE",
    "tag-want": "SUCHE"
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
    "tag-offer": "OFFER",
    "tag-want": "WANTED"
  }
};

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

function applyLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-txt]").forEach(el => { const key = el.getAttribute("data-txt"); if (translations[lang][key]) el.innerHTML = translations[lang][key]; });
  const levelSelect = document.getElementById("match-level");
  const currentVal = levelSelect.value;
  levelSelect.innerHTML = `<option value="">Bitte wählen...</option><option value="Level I">Level I</option><option value="Level II">Level II</option><option value="Level III">Level III</option>`;
  levelSelect.value = currentVal;
}

async function checkUserStatus() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  const container = document.getElementById("auth-status-container");
  if (user) {
    container.innerHTML = `<span>${escapeHtml(user.email)}</span> <button id="btn-logout">${translations[currentLang]["logout"]}</button>`;
    document.getElementById("btn-logout").onclick = () => { supabaseClient.auth.signOut(); location.reload(); };
  } else {
    container.innerHTML = `<button id="btn-open-login">${translations[currentLang]["btn-login-reg"]}</button>`;
    document.getElementById("btn-open-login").onclick = () => document.getElementById("auth-modal").style.display = "flex";
  }
}

async function fetchMatches() {
  const { data, error } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
  if (error) return;
  allMatchesCached = data;
  renderMatches(data);
}

function renderMatches(matches) {
  const container = document.getElementById("match-container");
  if (!matches.length) { container.innerHTML = `<p>${translations[currentLang]["no-slots"]}</p>`; return; }
  container.innerHTML = matches.map(m => {
    const isWant = m.type === "want";
    const levelBadge = m.match_level ? `<span class="badge" style="background:#555; color:#fff; padding:2px 5px; border-radius:3px;">${escapeHtml(m.match_level)}</span>` : "";
    return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
      <div class="match-details">
        <h3>${escapeHtml(m.match_name)} ${levelBadge} <span class="badge">${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}</span></h3>
        <p>${m.match_date} | ${escapeHtml(m.match_location)}</p>
      </div>
      <div class="card-actions">
        <p>${parseFloat(m.match_price).toFixed(2)} €</p>
        <a href="mailto:${m.seller_email}" class="btn-contact">${isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"]}</a>
      </div>
    </div>`;
  }).join("");
}

// Event Listeners
document.getElementById("match-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return alert(translations[currentLang]["alert-login-first"]);
  const matchData = {
    match_name: document.getElementById("match-name").value,
    match_level: document.getElementById("match-level").value,
    match_date: document.getElementById("match-date").value,
    match_location: document.getElementById("match-location").value,
    match_price: document.getElementById("match-price").value,
    seller_email: currentUser.email,
    type: document.getElementById("type-want").checked ? "want" : "offer"
  };
  await supabaseClient.from("matches").insert([matchData]);
  fetchMatches();
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
  });
  location.reload();
});

document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";
document.getElementById("language-select").onchange = (e) => applyLanguage(e.target.value);

// Start
applyLanguage("de");
checkUserStatus();
fetchMatches();