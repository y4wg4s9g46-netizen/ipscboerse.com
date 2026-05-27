const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Modal Ansicht umschalten
function toggleAuthView(showLogin) {
    document.getElementById("modal-login-view").style.display = showLogin ? "block" : "none";
    document.getElementById("modal-register-view").style.display = showLogin ? "none" : "block";
}

// Marktplatz-Einträge laden
async function fetchMatches() {
    const container = document.getElementById("match-container");
    if (!container) return;
    
    const { data, error } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
    
    if (error) {
        container.innerHTML = `<p style="color:red;">Fehler beim Laden: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<p>Aktuell keine Einträge verfügbar.</p>`;
        return;
    }

    container.innerHTML = data.map(m => `
        <div class="match-card ${m.type === 'want' ? 'card-want' : 'card-offer'}">
            <div class="match-details">
                <h3>${m.match_name}</h3>
                <p>${m.match_date} | ${m.match_location}</p>
            </div>
            <div class="card-actions">
                <p>${parseFloat(m.match_price).toFixed(2)} €</p>
                <a href="mailto:${m.seller_email}" class="btn-contact">Kontaktieren</a>
            </div>
        </div>
    `).join("");
}

// User Status & Logout
async function checkUserStatus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const container = document.getElementById("auth-status-container");
    
    if (container) {
        if (user) {
            container.innerHTML = `<span>${user.email}</span> <button id="btn-logout" class="btn-auth">Abmelden</button>`;
            document.getElementById("btn-logout").onclick = async () => { 
                await supabaseClient.auth.signOut(); 
                location.reload(); 
            };
        } else {
            container.innerHTML = `<button class="btn-auth" id="btn-open-login">Login / Registrieren</button>`;
            document.getElementById("btn-open-login").onclick = () => document.getElementById("auth-modal").style.display = "flex";
        }
    }
}

// Event-Handler für Formulare
document.getElementById("login-form").onsubmit = async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signInWithPassword({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value
    });
    location.reload();
};

document.getElementById("register-form").onsubmit = async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signUp({
        email: document.getElementById("register-email").value,
        password: document.getElementById("register-password").value
    });
    alert("Registrierung erfolgreich! Bitte E-Mails prüfen.");
};

document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";

// Beim Start ausführen
checkUserStatus();
fetchMatches();