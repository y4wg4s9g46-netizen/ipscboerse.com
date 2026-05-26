// Konfiguration
const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// HILFSFUNKTIONEN
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateSellerEmailField(email) {
    const emailInput = document.getElementById("seller-email");
    if (emailInput) {
        emailInput.value = email || "";
        emailInput.readOnly = !!email;
    }
}

// 1. AUTH STATUS
async function checkUserStatus() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  const container = document.getElementById("auth-status-container");
  if (container) {
    if (user) {
      container.innerHTML = `<span style="font-size:14px; color:#aaa; margin-right:10px;">${escapeHtml(user.email)}</span>
                             <button class="btn-auth" id="btn-logout">Abmelden</button>`;
      updateSellerEmailField(user.email);
    } else {
      container.innerHTML = `<button class="btn-auth" id="btn-open-login-v2">Login / Registrieren</button>`;
      updateSellerEmailField("");
    }
  }
}

// 2. RENDERN DER EINTRÄGE
async function renderMatches() {
    const container = document.getElementById("match-container");
    if (!container) return;
    
    const { data, error } = await supabaseClient.from("matches").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); return; }

    container.innerHTML = data.map(match => {
        const isWant = match.type === "want";
        const badgeColor = isWant ? "#2ecc71" : "#ff9f43";
        return `
            <div style="background:#2d2d2d; padding:15px; margin-bottom:10px; border-left: 5px solid ${badgeColor}; border-radius:4px;">
                <span style="background:${badgeColor}; color:#000; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">
                    ${isWant ? "SUCHE" : "BIETE"}
                </span>
                <h3 style="margin:10px 0; color:#fff;">${escapeHtml(match.match_name || "Unbekanntes Match")}</h3>
            </div>
        `;
    }).join("");
}

// 3. EINTRAG SPEICHERN
document.getElementById("match-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) { alert("Bitte erst einloggen!"); return; }

    const matchData = {
        match_name: document.getElementById("match-name").value,
        seller_email: currentUser.email,
        type: document.querySelector('input[name="ad-type"]:checked')?.value || "offer"
    };

    const { error } = await supabaseClient.from("matches").insert([matchData]);
    if (error) alert("Fehler: " + error.message);
    else { alert("Erfolgreich!"); document.getElementById("match-form").reset(); renderMatches(); }
});

// 4. EVENT DELEGATOR & INITIALISIERUNG
document.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "btn-logout") { await supabaseClient.auth.signOut(); location.reload(); }
    if (e.target && e.target.id === "btn-open-login-v2") { document.getElementById("auth-modal").style.display = "flex"; }
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
    });
    if (error) alert(error.message);
    else location.reload();
});

document.addEventListener("DOMContentLoaded", () => {
    checkUserStatus();
    renderMatches();
});