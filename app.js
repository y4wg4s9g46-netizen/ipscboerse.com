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
    "info-msg": "<strong>Wichtiger Hinweis:</strong> Diese Plattform dient nur der Vermittlung. Die endgültige Umschreibung des Startplatzes muss zwingend über den jeweiligen Match Director durchgeführt werden!",
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
    "alert-login-first": "Bitte melde dich zuerst an, um einen Eintrag zu erstellen!",
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
function showToast(message, type) { const container = document.getElementById("toast-container"); const toast = document.createElement("div"); toast.className = "toast toast-" + type; toast.textContent = message; container.appendChild(toast); setTimeout(() => toast.remove(), 4000); }

function applyLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-txt]").forEach(el => { const key = el.getAttribute("data-txt"); if (translations[lang][key]) el.innerHTML = translations[lang][key]; });
  
  const levelSelect = document.getElementById("match-level");
  const currentVal = levelSelect.value;
  levelSelect.innerHTML = lang === "de"
    ? '<option value="">Bitte wählen...</option><option value="Level I">Level I (Verein)</option><option value="Level II">Level II (Landesmeisterschaft)</option><option value="Level III">Level III (Deutsche Meisterschaft / Major)</option>'
    : '<option value="">Please select...</option><option value="Level I">Level I (Club Match)</option><option value="Level II">Level II (Regional Champ.)</option><option value="Level III">Level III (National Champ. / Major)</option>';
  levelSelect.value = currentVal;
  updatePriceLabel();
  filterAndRender();
}

function updatePriceLabel() {
  const isOffer = document.getElementById("type-offer").checked;
  document.getElementById("lbl-dynamic-price").textContent = translations[currentLang][isOffer ? "lbl-price-offer" : "lbl-price-want"];
}

async function checkUserStatus() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  const container = document.getElementById("auth-status-container");
  if (user) {
    container.innerHTML = `<span style="font-size:14px; margin-right:10px;">${escapeHtml(user.email)}</span><button class="btn-auth" id="btn-logout">${translations[currentLang]["logout"]}</button>`;
    document.getElementById("btn-logout").onclick = () => { supabaseClient.auth.signOut(); location.reload(); };
    document.getElementById("seller-email").value = user.email;
  } else {
    container.innerHTML = `<button class="btn-auth" id="btn-open-login-v2">${translations[currentLang]["btn-login-reg"]}</button>`;
    document.getElementById("btn-open-login-v2").onclick = () => document.getElementById("auth-modal").style.display = "flex";
  }
}

function renderMatches(matches) {
  const container = document.getElementById("match-container");
  if (!matches.length) { container.innerHTML = `<p>${translations[currentLang]["no-slots"]}</p>`; return; }
  
  container.innerHTML = matches.map(m => {
    const isWant = m.type === "want";
    // Badge für das Level
    const levelBadge = m.match_level ? `<span class="badge" style="background-color: var(--accent-color); color: #000;">${escapeHtml(m.match_level)}</span>` : "";
    
    return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
      <div class="match-details">
        <h3>${escapeHtml(m.match_name)} ${levelBadge} <span class="badge ${isWant ? "badge-want" : "badge-type"}">${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}</span></h3>
        <p><strong>Date:</strong> ${m.match_date} | <strong>Range:</strong> ${escapeHtml(m.match_location)}</p>
      </div>
      <div class="card-actions">
        <p style="font-size: 18px; font-weight: bold;">${parseFloat(m.match_price).toFixed(2)} €</p>
        <a href="mailto:${m.seller_email}" class="btn-contact">${isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"]}</a>
        ${(currentUser?.email === m.seller_email) ? `<button class="btn-delete" onclick="handleDelete(${m.id})">${translations[currentLang]["btn-delete"]}</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

function filterAndRender() {
  const typeFilter = document.getElementById("filter-type-select")?.value || "all";
  const matches = allMatchesCached.filter(m => typeFilter === "all" || m.type === typeFilter);
  renderMatches(matches);
}

async function fetchMatches() {
  const { data } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
  allMatchesCached = data || [];
  filterAndRender();
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!currentUser) return showToast(translations[currentLang]["alert-login-first"], "error");

  const matchData = {
    match_name: document.getElementById("match-name").value,
    match_level: document.getElementById("match-level").value,
    match_date: document.getElementById("match-date").value,
    match_location: document.getElementById("match-location").value,
    squad: document.getElementById("match-squad").value || null,
    match_price: parseFloat(document.getElementById("match-price").value),
    seller_email: currentUser.email,
    type: document.getElementById("type-want").checked ? "want" : "offer"
  };

  const { error } = await supabaseClient.from("matches").insert([matchData]);
  if (error) showToast("Error: " + error.message, "error");
  else { showToast(translations[currentLang]["alert-success"], "success"); document.getElementById("match-form").reset(); fetchMatches(); }
}

async function handleDelete(id) {
  if (!confirm(translations[currentLang]["confirm-del"])) return;
  await supabaseClient.from("matches").delete().eq("id", id);
  fetchMatches();
}

// Event Listeners
document.getElementById("match-form").addEventListener("submit", handleSubmit);
document.getElementById("type-offer").addEventListener("change", updatePriceLabel);
document.getElementById("type-want").addEventListener("change", updatePriceLabel);
document.getElementById("language-select").addEventListener("change", (e) => applyLanguage(e.target.value));
document.getElementById("filter-type-select").addEventListener("change", filterAndRender);
document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";
document.getElementById("login-form").onsubmit = async (e) => { e.preventDefault(); await supabaseClient.auth.signInWithPassword({ email: document.getElementById("login-email").value, password: document.getElementById("login-password").value }); location.reload(); };
document.getElementById("register-form").onsubmit = async (e) => { e.preventDefault(); await supabaseClient.auth.signUp({ email: document.getElementById("register-email").value, password: document.getElementById("register-password").value }); location.reload(); };

// Init
document.getElementById("match-date").min = new Date().toISOString().split("T")[0];
applyLanguage("de");
checkUserStatus();
fetchMatches();