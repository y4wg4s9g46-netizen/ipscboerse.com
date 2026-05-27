const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Sicherstellen, dass das DOM bereit ist
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Initialisierung der Auth-Prüfung
    await checkUserStatus();

    // 2. Event-Listener für Registrierung
    const regForm = document.getElementById("register-form");
    if (regForm) {
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const { error } = await supabaseClient.auth.signUp({
                email: document.getElementById("register-email").value,
                password: document.getElementById("register-password").value,
            });
            if (error) alert("Registrierung Fehler: " + error.message);
            else alert("Bitte E-Mail bestätigen.");
        });
    }

    // 3. Event-Listener für Login
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const { error } = await supabaseClient.auth.signInWithPassword({
                email: document.getElementById("login-email").value,
                password: document.getElementById("login-password").value,
            });
            if (error) alert("Login Fehler: " + error.message);
            else location.reload();
        });

        // Passwort-Vergessen Link dynamisch einfügen
        const forgotLink = document.createElement("a");
        forgotLink.innerText = "Passwort vergessen?";
        forgotLink.style.cursor = "pointer";
        forgotLink.style.display = "block";
        forgotLink.style.marginTop = "10px";
        forgotLink.style.color = "#ff9f43";
        forgotLink.onclick = async () => {
            const email = document.getElementById("login-email").value;
            if (!email) return alert("Bitte E-Mail eingeben");
            await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
            alert("Reset-Link gesendet.");
        };
        loginForm.appendChild(forgotLink);
    }
});

// Globale Funktion für Modal-Switch (wird im HTML aufgerufen)
window.toggleAuthView = function(showLogin) {
    const loginView = document.getElementById("modal-login-view");
    const regView = document.getElementById("modal-register-view");
    if (loginView && regView) {
        loginView.style.display = showLogin ? "block" : "none";
        regView.style.display = showLogin ? "none" : "block";
    }
};

async function checkUserStatus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    const container = document.getElementById("auth-status-container");
    if (!container) return;

    if (user) {
        container.innerHTML = `<span>${user.email}</span> <button id="btn-logout">Abmelden</button>`;
        document.getElementById("btn-logout").onclick = async () => { 
            await supabaseClient.auth.signOut(); 
            location.reload(); 
        };
    } else {
        container.innerHTML = `<button id="btn-open-login">Login / Registrieren</button>`;
        document.getElementById("btn-open-login").onclick = () => {
            document.getElementById("auth-modal").style.display = "flex";
        };
    }
}