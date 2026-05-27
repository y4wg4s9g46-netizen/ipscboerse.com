const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentLang = "de";

const translations = {
  de: {
    "btn-login-reg": "Login / Registrieren",
    "logout": "Abmelden",
    "no-slots": "Aktuell keine Einträge verfügbar.",
    "btn-request": "Anbieter kontaktieren",
    "btn-contact-want": "Schützen kontaktieren",
    "btn-delete": "Löschen",
    "tag-offer": "BIETE",
    "tag-want": "SUCHE"
  },
  en: {
    "btn-login-reg": "Login / Register",
    "logout": "Logout",
    "no-slots": "No marketplace entries available.",
    "btn-request": "Contact Seller",
    "btn-contact-want": "Contact Shooter",
    "btn-delete": "Delete",
    "tag-offer": "OFFER",
    "tag-want": "WANTED"
  }
};

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

function applyLanguage(lang) {
  currentLang = lang;
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
  if (!confirm("Möchtest du diesen Eintrag wirklich löschen?")) return;
  await supabaseClient.from("matches").delete().eq("id", id);
  fetchMatches();
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
  await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
  });
  location.reload();
});

document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";
applyLanguage("de");
checkUserStatus();
fetchMatches();