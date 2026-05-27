const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentLang = "de";

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

// --- AUTH UI LOGIK ---
function showResetView() {
    document.getElementById('modal-login-view').style.display = 'none';
    document.getElementById('modal-register-view').style.display = 'none';
    document.getElementById('modal-reset-view').style.display = 'block';
}

function toggleAuthView(isLogin) {
    document.getElementById('modal-reset-view').style.display = 'none';
    document.getElementById('modal-login-view').style.display = isLogin ? 'block' : 'none';
    document.getElementById('modal-register-view').style.display = isLogin ? 'none' : 'block';
}

// --- CORE FUNKTIONEN ---
async function checkUserStatus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    const container = document.getElementById("auth-status-container");
    const emailField = document.getElementById("seller-email");
    if (user) {
        container.innerHTML = `<span>${escapeHtml(user.email)}</span> <button id="btn-logout">Abmelden</button>`;
        document.getElementById("btn-logout").onclick = () => { supabaseClient.auth.signOut(); location.reload(); };
        if (emailField) emailField.value = user.email;
    } else {
        container.innerHTML = `<button class="btn-auth" id="btn-open-login">Login / Registrieren</button>`;
        document.getElementById("btn-open-login").onclick = () => document.getElementById("auth-modal").style.display = "flex";
    }
}

// --- EVENT HANDLER ---
document.getElementById("reset-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    if (error) alert("Fehler: " + error.message);
    else { alert("Überprüfe deine E-Mails."); toggleAuthView(true); }
});

// Passwort-Reset check beim Start
window.onload = async () => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
        const newPassword = prompt("Passwort zurücksetzen: Bitte gib dein neues Passwort ein:");
        if (newPassword) {
            const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (error) alert("Fehler: " + error.message);
            else alert("Passwort erfolgreich geändert!");
        }
    }
};

// Bestehende Logik (gekürzt zur Übersicht)
async function fetchMatches() {
    const { data } = await supabaseClient.from("matches").select("*");
    renderMatches(data || []);
}

function renderMatches(matches) {
    const container = document.getElementById("match-container");
    container.innerHTML = matches.map(m => `
        <div class="match-card ${m.type === 'want' ? 'card-want' : 'card-offer'}">
            <div><h3>${escapeHtml(m.match_name)}</h3><p>${m.match_date} | ${m.match_location}</p></div>
            <div class="card-actions"><p>${parseFloat(m.match_price).toFixed(2)} €</p>
            <a href="mailto:${m.seller_email}" class="btn-contact">Kontaktieren</a></div>
        </div>`).join("");
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signInWithPassword({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
    });
    location.reload();
});

document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";

checkUserStatus();
fetchMatches();
