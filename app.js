const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let allMatchesCached = [];

// Hilfsfunktionen
function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }
function showToast(message, type) { 
    const container = document.getElementById("toast-container") || document.body;
    const toast = document.createElement("div"); 
    toast.className = `toast toast-${type}`; 
    toast.textContent = message; 
    container.appendChild(toast); 
    setTimeout(() => toast.remove(), 4000); 
}

// Initialisiere Dropdown
function initLevelDropdown() {
    const levelSelect = document.getElementById("match-level");
    const levels = ["Level I", "Level II", "Level III", "Level IV", "Level V"];
    levelSelect.innerHTML = '<option value="">Bitte wählen...</option>';
    levels.forEach(level => {
        const opt = document.createElement("option");
        opt.value = level;
        opt.textContent = level;
        levelSelect.appendChild(opt);
    });
}

// Benutzerstatus prüfen
async function checkUserStatus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    const container = document.getElementById("auth-status-container");
    if (user) {
        container.innerHTML = `<span style="font-size:14px; margin-right:10px;">${user.email}</span><button class="btn-auth" id="btn-logout">Logout</button>`;
        document.getElementById("btn-logout").onclick = () => { supabaseClient.auth.signOut(); location.reload(); };
        document.getElementById("seller-email").value = user.email;
    }
}

// Matches rendern
function renderMatches() {
    const container = document.getElementById("match-container");
    container.innerHTML = allMatchesCached.length ? allMatchesCached.map(m => `
    <div class="match-card ${m.type === 'want' ? 'card-want' : 'card-offer'}">
      <div class="match-details">
        <h3>${escapeHtml(m.match_name)}</h3>
        <p>Ort: ${escapeHtml(m.match_location)} | Datum: ${m.match_date}</p>
        <div class="badge-container">
          <span class="badge">${m.match_level || "N/A"}</span>
          <span class="badge">${m.match_price} €</span>
          ${m.squad ? `<span class="badge">Squad: ${m.squad}</span>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <a href="mailto:${m.seller_email}" class="btn-contact">Kontakt</a>
        ${(currentUser?.email === m.seller_email) ? `<button class="btn-delete" onclick="handleDelete(${m.id})">Löschen</button>` : ""}
      </div>
    </div>`).join("") : `<p>Keine Einträge verfügbar.</p>`;
}

async function fetchMatches() {
    const { data } = await supabaseClient.from("matches").select("*").order("created_at", { ascending: false });
    allMatchesCached = data || [];
    renderMatches();
}

// Formular absenden
async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser) return showToast("Bitte erst einloggen!", "error");

    const matchData = {
        match_name: document.getElementById("match-name").value,
        match_level: document.getElementById("match-level").value,
        match_date: document.getElementById("match-date").value,
        match_location: document.getElementById("match-location").value,
        squad: document.getElementById("match-squad").value || null,
        match_price: parseFloat(document.getElementById("match-price").value),
        seller_email: currentUser.email,
        type: document.querySelector('input[name="ad-type"]:checked').value
    };

    const { error } = await supabaseClient.from("matches").insert([matchData]);
    if (error) showToast("Fehler: " + error.message, "error");
    else { showToast("Erfolgreich veröffentlicht!", "success"); document.getElementById("match-form").reset(); fetchMatches(); }
}

async function handleDelete(id) {
    await supabaseClient.from("matches").delete().eq("id", id);
    fetchMatches();
}

// Event Listener
document.getElementById("match-form").addEventListener("submit", handleSubmit);
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signInWithPassword({ 
        email: document.getElementById("login-email").value, 
        password: document.getElementById("login-password").value 
    });
    location.reload();
});

// App Start
initLevelDropdown();
checkUserStatus();
fetchMatches();