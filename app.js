const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentLang = "de";

// Sprach-Übersetzungen
const translations = {
  de: { "btn-login-reg": "Login / Registrieren", "logout": "Abmelden", "no-slots": "Aktuell keine Einträge verfügbar.", "btn-request": "Anbieter kontaktieren", "btn-contact-want": "Schützen kontaktieren", "btn-delete": "Löschen", "tag-offer": "BIETE", "tag-want": "SUCHE" },
  en: { "btn-login-reg": "Login / Register", "logout": "Logout", "no-slots": "No marketplace entries available.", "btn-request": "Contact Seller", "btn-contact-want": "Contact Shooter", "btn-delete": "Delete", "tag-offer": "OFFER", "tag-want": "WANTED" }
};

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

// Dropdown befüllen
function initLevelDropdown() {
  const levelSelect = document.getElementById("match-level");
  if (!levelSelect) return;
  levelSelect.innerHTML = `
    <option value="">Bitte wählen...</option>
    <option value="Level I">Level I</option>
    <option value="Level II">Level II</option>
    <option value="Level III">Level III</option>
  `;
}

// User Status & Logout
async function checkUserStatus() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  const container = document.getElementById("auth-status-container");
  const emailField = document.getElementById("seller-email");
  
  if (container) {
    if (user) {
      container.innerHTML = `<span>${escapeHtml(user.email)}</span> <button id="btn-logout">${translations[currentLang]["logout"]}</button>`;
      document.getElementById("btn-logout").onclick = async () => { await supabaseClient.auth.signOut(); location.reload(); };
      if (emailField) { emailField.value = user.email; emailField.readOnly = true; }
    } else {
      container.innerHTML = `<button id="btn-open-login">${translations[currentLang]["btn-login-reg"]}</button>`;
      document.getElementById("btn-open-login").onclick = () => document.getElementById("auth-modal").style.display = "flex";
    }
  }
}

// Anzeigen rendern
async function fetchMatches() {
  const { data, error } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
  if (error) { console.error(error); return; }
  
  const container = document.getElementById("match-container");
  if (!data || data.length === 0) { container.innerHTML = `<p>${translations[currentLang]["no-slots"]}</p>`; return; }
  
  container.innerHTML = data.map(m => {
    const isWant = m.type === "want";
    const canDelete = currentUser && currentUser.email === m.seller_email;
    // Level-Anzeige fix:
    const levelBadge = m.match_level ? `<span class="badge badge-type">${escapeHtml(m.match_level)}</span>` : "";
    
    return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
      <div class="match-details">
        <h3>${escapeHtml(m.match_name)} ${levelBadge} <span class="badge">${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}</span></h3>
        <p>${m.match_date} | ${escapeHtml(m.match_location)}</p>
      </div>
      <div class="card-actions">
        <p>${parseFloat(m.match_price || 0).toFixed(2)} €</p>
        <a href="mailto:${m.seller_email}" class="btn-contact">${isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"]}</a>
        ${canDelete ? `<button class="btn-delete" onclick="handleDelete(${m.id})">${translations[currentLang]["btn-delete"]}</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

// Form-Logik
const matchForm = document.getElementById("match-form");
if (matchForm) {
  matchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Bitte melde dich an.");
    const { error } = await supabaseClient.from("matches").insert([{
      match_name: document.getElementById("match-name").value,
      match_level: document.getElementById("match-level").value,
      match_date: document.getElementById("match-date").value,
      match_location: document.getElementById("match-location").value,
      match_price: document.getElementById("match-price").value,
      seller_email: currentUser.email,
      type: document.getElementById("type-want").checked ? "want" : "offer"
    }]);
    if (error) alert("Fehler: " + error.message);
    else { matchForm.reset(); fetchMatches(); }
  });
}

// Auth Forms
document.getElementById("login-form").onsubmit = async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
  });
  if (error) alert(error.message); else location.reload();
};

document.getElementById("register-form").onsubmit = async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signUp({
    email: document.getElementById("register-email").value,
    password: document.getElementById("register-password").value,
  });
  if (error) alert(error.message); else alert("Bitte E-Mail bestätigen.");
};

// Initialisierung
document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";
initLevelDropdown();
checkUserStatus();
fetchMatches();