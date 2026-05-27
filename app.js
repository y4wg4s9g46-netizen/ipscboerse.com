const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentLang = "de";

// Vollständiges Übersetzungsverzeichnis für alle UI-Elemente
const translations = {
  de: {
    "main-title": "IPSC STARTPLATZ-BÖRSE",
    "sub-title": "Von Schützen für Schützen – Live Marktplatz",
    "btn-login-reg": "Login / Registrieren",
    "logout": "Abmelden",
    "info-msg": "<strong>Wichtiger Hinweis:</strong> Diese Plattform dient nur der Vermittlung. Die endgültige Umschreibung des Startplatzes muss zwingend über den jeweiligen Match Director durchgeführt werden!",
    "form-title": "Eintrag erstellen",
    "opt-offer": "Ich BIETE einen Startplatz an",
    "opt-want": "Ich SUCHE einen Startplatz",
    "lbl-name": "Name des Matches *",
    "lbl-level": "Match Level *",
    "lbl-date": "Datum des Matches *",
    "lbl-location": "Austragungsort (Stand) *",
    "lbl-squad": "Squad Nummer (Optional)",
    "lbl-price": "Abgabepreis (€) *",
    "lbl-email": "Deine E-Mail-Adresse *",
    "btn-insert": "Eintrag kostenlos veröffentlichen",
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
    "tag-offer": "BIETE",
    "tag-want": "SUCHE"
  },
  en: {
    "main-title": "IPSC SLOT MARKETPLACE",
    "sub-title": "By Shooters for Shooters – Live Marketplace",
    "btn-login-reg": "Login / Register",
    "logout": "Logout",
    "info-msg": "<strong>Important Notice:</strong> This platform only serves as a mediator. The final transfer of the slot must be processed by the respective Match Director!",
    "form-title": "Create Entry",
    "opt-offer": "I OFFER a slot",
    "opt-want": "I AM LOOKING FOR a slot",
    "lbl-name": "Match Name *",
    "lbl-level": "Match Level *",
    "lbl-date": "Match Date *",
    "lbl-location": "Location (Range) *",
    "lbl-squad": "Squad Number (Optional)",
    "lbl-price": "Price (€) *",
    "lbl-email": "Your Email Address *",
    "btn-insert": "Publish Entry for Free",
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
    "tag-offer": "OFFER",
    "tag-want": "WANTED"
  }
};

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

// Übersetzt die gesamte Seite basierend auf den data-txt Attributen
function applyLanguage(lang) {
  currentLang = lang;
  
  // Alle statischen Texte übersetzen
  document.querySelectorAll('[data-txt]').forEach(el => {
    const key = el.getAttribute('data-txt');
    if (translations[lang] && translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Dropdown-Menü für Match Levels übersetzen
  const levelSelect = document.getElementById("match-level");
  if (levelSelect) {
    const currentVal = levelSelect.value;
    const defaultText = lang === "en" ? "Please select..." : "Bitte wählen...";
    levelSelect.innerHTML = `<option value="">${defaultText}</option><option value="Level I">Level I</option><option value="Level II">Level II</option><option value="Level III">Level III</option>`;
    levelSelect.value = currentVal;
  }

  // Live-Daten und Benutzerbereich ebenfalls aktualisieren
  checkUserStatus();
  fetchMatches();
}

async function checkUserStatus() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  const container = document.getElementById("auth-status-container");
  const emailField = document.getElementById("seller-email");
  
  if (user) {
    container.innerHTML = `<span>${escapeHtml(user.email)}</span> <button id="btn-logout">${translations[currentLang]["logout"]}</button>`;
    
    // REPARIERT: Mit async/await versehen, damit signOut abgeschlossen wird, bevor reload triggert
    document.getElementById("btn-logout").onclick = async () => { 
      await supabaseClient.auth.signOut(); 
      location.reload(); 
    };
    
    if (emailField) { emailField.value = user.email; emailField.readOnly = true; }
  } else {
    container.innerHTML = `<button id="btn-open-login">${translations[currentLang]["btn-login-reg"]}</button>`;
    document.getElementById("btn-open-login").onclick = () => document.getElementById("auth-modal").style.display = "flex";
  }
}

async function fetchMatches() {
  const { data, error } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
  if (error) return;
  renderMatches(data || []);
}

function renderMatches(matches) {
  const container = document.getElementById("match-container");
  if (!matches.length) { container.innerHTML = `<p>${translations[currentLang]["no-slots"]}</p>`; return; }
  
  container.innerHTML = matches.map(m => {
    const isWant = m.type === "want";
    const levelBadge = m.match_level ? `<span class="badge" style="background:#555; color:#fff; padding:2px 5px; border-radius:3px;">${escapeHtml(m.match_level)}</span>` : "";
    const canDelete = currentUser && currentUser.email === m.seller_email;
    
    return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
      <div class="match-details">
        <h3>${escapeHtml(m.match_name)} ${levelBadge} <span class="badge">${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}</span></h3>
        <p>${m.match_date} | ${escapeHtml(m.match_location)}</p>
      </div>
      <div class="card-actions">
        <p>${parseFloat(m.match_price).toFixed(2)} €</p>
        <a href="mailto:${m.seller_email}" class="btn-contact">${isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"]}</a>
        ${canDelete ? `<button class="btn-delete" onclick="handleDelete(${m.id}, '${m.seller_email}')">${translations[currentLang]["btn-delete"]}</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

async function handleDelete(id, sellerEmail) {
  if (!currentUser || currentUser.email !== sellerEmail) {
    alert("Fehler: Du darfst nur deine eigenen Einträge löschen.");
    return;
  }
  if (!confirm("Sicherheitsabfrage:\n\nMöchtest du diesen Eintrag wirklich unwiderruflich löschen?")) return;
  const password = prompt("Sicherheitsprüfung: Bitte gib dein Passwort erneut ein, um den Löschvorgang abzuschließen:");
  if (!password) return;
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email: currentUser.email, password: password });
    if (error) { alert("Authentifizierung fehlgeschlagen."); return; }
    await supabaseClient.from("matches").delete().eq("id", id);
    fetchMatches();
  } catch (err) { alert("Fehler beim Löschen."); }
}

document.getElementById("match-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return alert("Bitte melde dich an.");
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
  document.getElementById("match-form").reset();
  fetchMatches();
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
  });
  if (error) {
    alert("Login fehlgeschlagen: " + error.message);
  } else {
    location.reload();
  }
});

document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";

function toggleAuthView(isLogin) {
  document.getElementById("modal-login-view").style.display = isLogin ? "block" : "none";
  document.getElementById("modal-register-view").style.display = isLogin ? "none" : "block";
}

// REPARIERT: Event-Listener für den Sprachwechsel hinzugefügt
document.getElementById("language-select").addEventListener("change", (e) => {
  applyLanguage(e.target.value);
});

// Initialer Start beim Laden der Seite
applyLanguage("de");
