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
  const emailField = document.getElementById("seller-email");
  
  if (user) {
    // ERWEITERT: Klick auf den Anzeigenamen/E-Mail öffnet das neue Kontoverwaltungs-Menü
    const displayName = user.user_metadata?.display_name || user.email;
    container.innerHTML = `<span id="btn-open-account" style="color: var(--accent-color); font-weight: bold; cursor: pointer; margin-right: 15px; text-decoration: underline;">${escapeHtml(displayName)}</span> <button id="btn-logout">${translations[currentLang]["logout"]}</button>`;
    
    document.getElementById("btn-logout").onclick = () => { supabaseClient.auth.signOut(); location.reload(); };
    
    document.getElementById("btn-open-account").onclick = () => {
      document.getElementById("account-modal").style.display = "flex";
      document.getElementById("account-display-name").value = user.user_metadata?.display_name || "";
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
  document.getElementById("modal-reset-view").style.display = "none";
}

function showResetView() {
  document.getElementById("modal-login-view").style.display = "none";
  document.getElementById("modal-register-view").style.display = "none";
  document.getElementById("modal-reset-view").style.display = "block";
}

document.getElementById("reset-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("reset-email").value;
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      alert("Fehler beim Senden: " + error.message);
    } else {
      alert("Eine E-Mail mit dem Link zum Zurücksetzen deines Passworts wurde versendet.");
      toggleAuthView(true);
    }
  } catch (err) {
    alert("Ein unerwarteter Fehler ist aufgetreten.");
  }
});

window.addEventListener("load", async () => {
  if (window.location.hash.includes("type=recovery")) {
    setTimeout(() => {
      const newPassword = prompt("Passwort zurücksetzen:\n\nBitte gib dein neues Passwort ein (mindestens 6 Zeichen):");
      if (newPassword) {
        if (newPassword.length < 6) {
          alert("Das Passwort muss mindestens 6 Zeichen lang sein.");
          return;
        }
        supabaseClient.auth.updateUser({ password: newPassword }).then(({ error }) => {
          if (error) {
            alert("Fehler beim Speichern des neuen Passworts: " + error.message);
          } else {
            alert("Dein Passwort wurde erfolgreich geändert! Du kannst dich jetzt regulär einloggen.");
            window.location.hash = "";
          }
        });
      }
    }, 500);
  }
});

// --- NEU HINZUGEFÜGT: STEUERUNG FÜR DAS BENUTZERMENÜ (KONTO MODAL) ---

document.getElementById("btn-close-account-modal").onclick = () => {
  document.getElementById("account-modal").style.display = "none";
};

// 1. Profil bearbeiten (Anzeigename in User Metadata speichern)
document.getElementById("account-update-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const displayName = document.getElementById("account-display-name").value;
  const { error } = await supabaseClient.auth.updateUser({
    data: { display_name: displayName }
  });
  if (error) {
    alert("Fehler beim Aktualisieren: " + error.message);
  } else {
    alert("Profil erfolgreich aktualisiert!");
    location.reload();
  }
});

// 2. Passwort direkt ändern (Eingeloggter Zustand)
document.getElementById("account-password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById("account-new-password").value;
  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) {
    alert("Fehler beim Speichern: " + error.message);
  } else {
    alert("Dein Passwort wurde erfolgreich geändert.");
    document.getElementById("account-new-password").value = "";
    document.getElementById("account-modal").style.display = "none";
  }
});

// 3. Konto-Daten & Inserate permanent löschen
document.getElementById("btn-delete-account").addEventListener("click", async () => {
  if (!confirm("WARNUNG!\n\nMöchtest du all deine Einträge permanent vom Marktplatz löschen? Dieser Schritt kann nicht rückgängig gemacht werden.")) return;
  
  const password = prompt("Sicherheitsprüfung: Bitte gib dein Passwort ein, um die Löschung zu autorisieren:");
  if (!password) return;

  try {
    // Re-Authentifizieren, um Datenmissbrauch zu verhindern
    const { error: authError } = await supabaseClient.auth.signInWithPassword({
      email: currentUser.email,
      password: password
    });
    if (authError) {
      alert("Authentifizierung fehlgeschlagen. Abbruch.");
      return;
    }

    // Alle Inserate des Benutzers löschen
    const { error: dbError } = await supabaseClient.from("matches").delete().eq("seller_email", currentUser.email);
    if (dbError) throw dbError;

    alert("Deine Inserate und Profildaten wurden erfolgreich entfernt. Du wirst nun abgemeldet.");
    await supabaseClient.auth.signOut();
    location.reload();
  } catch (err) {
    alert("Fehler beim Löschen: " + err.message);
  }
});

// --- ENDE BENUTZERMENÜ LOGIK ---

applyLanguage("de");
checkUserStatus();
fetchMatches();
