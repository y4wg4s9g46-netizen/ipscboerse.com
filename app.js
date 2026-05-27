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
    "footer-impressum-link": "Impressum & Rechtliche Hinweise",
    "msg-processing": "Verarbeite...",
    "msg-negative-price": "Der Preis darf nicht negativ sein.",
    "msg-past-date": "Das Matchdatum darf nicht in der Vergangenheit liegen.",
    "msg-server-err": "Serverfehler. Bitte versuche es erneut."
  },
  en: {
    "main-title": "IPSC SLOT MARKETPLACE",
    "sub-title": "By Shooters for Shooters – Live Marketplace",
    "btn-login-reg": "Login / Register",
    "info-msg": "<strong>Important Note:</strong> This platform is for mediation only. The final slot transfer must be approved and handled by the respective Match Director!",
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
    "no-slots": "No marketplace entries available at the moment.",
    "btn-request": "Contact Seller",
    "btn-contact-want": "Contact Shooter",
    "btn-delete": "Delete",
    "alert-login-first": "Please log in first to create an entry!",
    "alert-success": "Successfully posted!",
    "msg-save-err": "Error saving data: ",
    "confirm-del": "Are you sure you want to delete this entry?",
    "alert-del-success": "Entry successfully deleted!",
    "filter-type": "Entry Type:",
    "filter-all": "All Entries",
    "filter-offers": "Offers Only",
    "filter-wants": "Requests Only",
    "lbl-price-offer": "Selling Price (€) *",
    "lbl-price-want": "Max. Budget Price (€) *",
    "tag-offer": "OFFER",
    "tag-want": "WANTED",
    "footer-impressum-link": "Legal Notice & Imprint",
    "msg-processing": "Processing...",
    "msg-negative-price": "Price cannot be negative.",
    "msg-past-date": "Match date cannot be in the past.",
    "msg-server-err": "Server error. Please try again."
  }
};

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function applyLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-txt]").forEach(el => {
    const key = el.getAttribute("data-txt");
    if (translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  const levelSelect = document.getElementById("match-level");
  const currentLevel = levelSelect.value;
  levelSelect.innerHTML = lang === "de"
    ? '<option value="">Bitte wählen...</option><option value="Level I">Level I (Verein)</option><option value="Level II">Level II (Landesmeisterschaft)</option><option value="Level III">Level III (Deutsche Meisterschaft / Major)</option>'
    : '<option value="">Please select...</option><option value="Level I">Level I (Club Match)</option><option value="Level II">Level II (Regional Champ.)</option><option value="Level III">Level III (National Champ. / Major)</option>';
  levelSelect.value = currentLevel;

  document.getElementById("match-name").placeholder =
    lang === "de" ? "z.B. Infinity Open" : "e.g. Infinity Open";
  document.getElementById("match-location").placeholder =
    lang === "de" ? "z.B. Philippsburg" : "e.g. Philippsburg";
  document.getElementById("seller-email").placeholder =
    lang === "de" ? "schuetze@beispiel.de" : "shooter@example.com";
  document.getElementById("match-squad").placeholder =
    lang === "de" ? "z.B. 0014" : "e.g. 0014";
  updatePriceLabel();
  filterAndRender();
}

function updatePriceLabel() {
  const isOffer = document.getElementById("type-offer").checked;
  const priceLabel = document.getElementById("lbl-dynamic-price");
  priceLabel.textContent = isOffer ? translations[currentLang]["lbl-price-offer"] : translations[currentLang]["lbl-price-want"];
}

async function checkUserStatus() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  const container = document.getElementById("auth-status-container");
  
  if (user) {
    container.innerHTML = `<span style="font-size:14px; color:var(--text-muted); margin-right:10px;">${escapeHtml(user.email)}</span>
                           <button class="btn-auth" id="btn-logout">${translations[currentLang]["logout"]}</button>`;
    document.getElementById("btn-logout").addEventListener("click", () => { supabaseClient.auth.signOut(); location.reload(); });
    document.getElementById("seller-email").value = user.email;
    document.getElementById("seller-email").readOnly = true;
  } else {
    container.innerHTML = `<button class="btn-auth" id="btn-open-login-v2">${translations[currentLang]["btn-login-reg"]}</button>`;
    document.getElementById("btn-open-login-v2").addEventListener("click", () => document.getElementById("auth-modal").style.display = "flex");
  }
}

function closeModal() {
  document.getElementById("auth-modal").style.display = "none";
}

function toggleAuthView(showLogin) {
  document.getElementById("modal-login-view").style.display = showLogin ? "block" : "none";
  document.getElementById("modal-register-view").style.display = showLogin ? "none" : "block";
}

async function fetchMatches() {
  const { data, error } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
  if (error) return console.error(error);
  allMatchesCached = data.filter(m => m.match_date >= new Date().toISOString().split("T")[0]);
  filterAndRender();
}

function filterAndRender() {
  const typeFilter = document.getElementById("filter-type-select")?.value || "all";
  const matches = allMatchesCached.filter(match => {
    return typeFilter === "all" || match.type === typeFilter || (!match.type && typeFilter === "offer");
  });
  renderMatches(matches);
}

function renderMatches(matches) {
  const container = document.getElementById("match-container");
  if (!matches.length) { container.innerHTML = `<p>${translations[currentLang]["no-slots"]}</p>`; return; }
  
  container.innerHTML = matches.map(match => {
    const isWant = match.type === "want";
    return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
      <div class="match-details">
        <h3>${escapeHtml(match.match_name)} <span class="badge ${isWant ? "badge-want" : "badge-type"}">${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}</span></h3>
        <p><strong>Level:</strong> ${escapeHtml(match.match_level)} | <strong>Date:</strong> ${match.match_date} | <strong>Range:</strong> ${escapeHtml(match.match_location)}</p>
      </div>
      <div class="card-actions">
        <p style="font-size: 18px; font-weight: bold;">${parseFloat(match.match_price).toFixed(2)} €</p>
        <a href="mailto:${match.seller_email}" class="btn-contact">${isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"]}</a>
        ${(currentUser && currentUser.email === match.seller_email) ? `<button class="btn-delete" onclick="handleDelete(${match.id})">${translations[currentLang]["btn-delete"]}</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

async function handleDelete(id) {
  if (!confirm(translations[currentLang]["confirm-del"])) return;
  const { error } = await supabaseClient.from("matches").delete().eq("id", id);
  if (!error) { showToast(translations[currentLang]["alert-del-success"], "success"); fetchMatches(); }
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!currentUser) { showToast(translations[currentLang]["alert-login-first"], "error"); return; }

  const matchName = document.getElementById("match-name").value;
  const matchDate = document.getElementById("match-date").value;
  const matchLocation = document.getElementById("match-location").value;
  const matchPrice = parseFloat(document.getElementById("match-price").value);
  if (isNaN(matchPrice) || matchPrice < 0) {
    showToast(translations[currentLang]["msg-negative-price"], "error");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  if (matchDate < today) {
    showToast(translations[currentLang]["msg-past-date"], "error");
    return;
  }

  const { data: existingEntry } = await supabaseClient
    .from("matches")
    .select("id")
    .eq("seller_email", currentUser.email)
    .eq("match_name", matchName)
    .eq("match_date", matchDate)
    .eq("match_location", matchLocation)
    .maybeSingle();

  if (existingEntry) {
    showToast("Du hast für dieses Match an diesem Tag bereits einen Eintrag erstellt.", "error");
    return;
  }

  const matchData = {
    match_name: matchName,
    match_level: document.getElementById("match-level").value,
    match_date: matchDate,
    match_location: matchLocation,
    squad: document.getElementById("match-squad").value || null,
    match_price: matchPrice,
    seller_email: currentUser.email,
    type: document.getElementById("type-want").checked ? "want" : "offer"
  };

  const { error } = await supabaseClient.from("matches").insert([matchData]);
  if (error) showToast(translations[currentLang]["msg-save-err"] + error.message, "error");
  else { showToast(translations[currentLang]["alert-success"], "success"); document.getElementById("match-form").reset(); updatePriceLabel(); fetchMatches(); }
}

// Initialisierung
document.getElementById("match-form").addEventListener("submit", handleSubmit);
document.getElementById("type-offer").addEventListener("change", updatePriceLabel);
document.getElementById("type-want").addEventListener("change", updatePriceLabel);
document.getElementById("language-select").addEventListener("change", (e) => applyLanguage(e.target.value));
document.getElementById("filter-type-select").addEventListener("change", filterAndRender);
document.getElementById("btn-close-modal").addEventListener("click", closeModal);
document.getElementById("match-squad").addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 4);
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
  });
  if (error) {
    showToast(error.message, "error");
    return;
  }
  closeModal();
  await checkUserStatus();
});

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signUp({
    email: document.getElementById("register-email").value,
    password: document.getElementById("register-password").value,
  });
  if (error) {
    showToast(error.message, "error");
    return;
  }
  showToast(translations[currentLang]["alert-success"], "success");
  toggleAuthView(true);
});

document.getElementById("match-date").min = new Date().toISOString().split("T")[0];
applyLanguage("de");
checkUserStatus();
fetchMatches();