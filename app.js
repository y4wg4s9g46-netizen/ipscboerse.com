const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentLang = "de";

const translations = {
  de: { "btn-login-reg": "Login / Registrieren", "logout": "Abmelden", "no-slots": "Aktuell keine Einträge verfügbar.", "btn-request": "Anbieter kontaktieren", "btn-contact-want": "Schützen kontaktieren", "btn-delete": "Löschen", "tag-offer": "BIETE", "tag-want": "SUCHE" },
  en: { "btn-login-reg": "Login / Register", "logout": "Logout", "no-slots": "No marketplace entries available.", "btn-request": "Contact Seller", "btn-contact-want": "Contact Shooter", "btn-delete": "Delete", "tag-offer": "OFFER", "tag-want": "WANTED" }
};

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

// --- AUTH & USER STATUS ---
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

// --- RENDER & FETCH ---
async function fetchMatches() {
  const { data, error } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
  if (error) { console.error(error); return; }
  const container = document.getElementById("match-container");
  if (!data.length) { container.innerHTML = `<p>${translations[currentLang]["no-slots"]}</p>`; return; }
  
  container.innerHTML = data.map(m => {
    const isWant = m.type === "want";
    const canDelete = currentUser && currentUser.email === m.seller_email;
    return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
      <div class="match-details">
        <h3>${escapeHtml(m.match_name)} <span class="badge">${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}</span></h3>
        <p>${m.match_date} | ${escapeHtml(m.match_location)}</p>
      </div>
      <div class="card-actions">
        <p>${parseFloat(m.match_price).toFixed(2)} €</p>
        <a href="mailto:${m.seller_email}" class="btn-contact">${isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"]}</a>
        ${canDelete ? `<button class="btn-delete" onclick="handleDelete(${m.id})">${translations[currentLang]["btn-delete"]}</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

async function handleDelete(id) {
  if (!confirm("Wirklich unwiderruflich löschen?")) return;
  await supabaseClient.from("matches").delete().eq("id", id);
  fetchMatches();
}

// --- FORMS LOGIC ---
const matchForm = document.getElementById("match-form");
if (matchForm) {
  // Datum-Validierung: Keine Vergangenheit
  const dateInput = document.getElementById("match-date");
  dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);

  matchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Bitte melde dich an.");
    await supabaseClient.from("matches").insert([{
      match_name: document.getElementById("match-name").value,
      match_level: document.getElementById("match-level").value,
      match_date: document.getElementById("match-date").value,
      match_location: document.getElementById("match-location").value,
      match_price: document.getElementById("match-price").value,
      seller_email: currentUser.email,
      type: document.getElementById("type-want").checked ? "want" : "offer"
    }]);
    matchForm.reset();
    fetchMatches();
  });
}

// Login, Register, Forgot Password
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
  });
  if (error) alert(error.message); else location.reload();
});

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signUp({
    email: document.getElementById("register-email").value,
    password: document.getElementById("register-password").value,
  });
  if (error) alert(error.message); else alert("Bitte E-Mail bestätigen.");
});

// Passwort vergessen Link
const forgotBtn = document.createElement("a");
forgotBtn.innerText = "Passwort vergessen?";
forgotBtn.style.cssText = "display:block; margin-top:10px; color:#ff9f43; cursor:pointer;";
forgotBtn.onclick = async () => {
  const email = document.getElementById("login-email").value;
  if (!email) return alert("E-Mail im Login-Feld eingeben.");
  await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  alert("Reset-Link gesendet.");
};
document.getElementById("login-form").appendChild(forgotBtn);

window.toggleAuthView = (show) => {
  document.getElementById("modal-login-view").style.display = show ? "block" : "none";
  document.getElementById("modal-register-view").style.display = show ? "none" : "block";
};

document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";

// INIT
checkUserStatus();
fetchMatches();