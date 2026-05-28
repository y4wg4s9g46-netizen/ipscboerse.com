const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentLang = "de";
let cachedMatches = [];
let editingMatchId = null; 

const translations = {
  de: {
    "main-title": "IPSC STARTPLATZ-BÖRSE",
    "sub-title": "Von Schützen für Schützen – Live Marktplatz",
    "btn-login-reg": "Login / Registrieren",
    "logout": "Abmelden",
    "info-msg": "<strong>Wichtiger Hinweis:</strong> Diese Plattform dient nur der Vermittlung. Die endgültige Umschreibung des Startplatzes muss zwingend über den jeweiligen Match Director durchgeführt werden!",
    "form-title": "Eintrag erstellen",
    "form-title-edit": "Eintrag bearbeiten ✏️",
    "opt-offer": "Ich BIETE einen Startplatz an",
    "opt-want": "Ich SUCHE einen Startplatz",
    "lbl-name": "Name des Matches *",
    "lbl-level": "Match Level *",
    "lbl-date": "Datum des Matches *",
    "lbl-location": "Austragungsort (Stand) *",
    "lbl-country": "Land *",
    "lbl-squad": "Squad Nummer (Optional)",
    "lbl-price": "Abgabepreis (€) *",
    "lbl-email": "Deine E-Mail-Adresse *",
    "btn-insert": "Eintrag kostenlos veröffentlichen",
    "btn-save-edit": "Änderungen speichern",
    "btn-cancel": "Abbrechen",
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
    "btn-edit": "Bearbeiten",
    "btn-export": "Export (.ics)",
    "report-btn": "Melden",
    "buy-coffee": "Kaffee spendieren",
    "social-proof": "Erfolgreich vermittelte Startplätze: ",
    "login-required": "Nur eingeloggte Nutzer können kontaktieren",
    "security-checklist": "\n\nSicherheits-Checkliste vor der E-Mail:\n- Match-Daten geprüft?\n- Match Director kontaktiert?",
    "tag-offer": "BIETE",
    "tag-want": "SUCHE",
    "link-forgot-pwd": "Passwort vergessen?",
    "modal-forgot-title": "Passwort vergessen",
    "modal-btn-forgot": "Zurücksetzungs-Link senden",
    "modal-reset-title": "Neues Passwort vergeben",
    "lbl-new-password": "Neues Passwort *",
    "btn-save": "Änderungen speichern",
    "modal-settings-title": "Konto-Einstellungen",
    "lbl-username": "Schützenname / Anzeigename",
    "btn-delete-acc": "Konto & alle Einträge unwiderruflich löschen",
    "email-subject-offer": "Interesse an deinem IPSC Startplatz: ",
    "email-subject-want": "Bezüglich deiner Suche nach einem IPSC Startplatz: ",
    "email-body-offer": "Hallo,\n\nich habe dein Inserat auf ipscboerse.com gesehen und interessiere mich für den von dir angebotenen Startplatz für das Match: ",
    "email-body-want": "Hallo,\n\nich habe dein Gesuch auf ipscboerse.com gesehen. Ich hätte einen Startplatz abzugeben für das Match: ",
    "email-body-footer": "\n\nIst das Inserat noch aktuell?\n\nViele Grüße",
    "security-notice": "⚠️ WICHTIGER SICHERHEITSHINWEIS:\n\n1. Nutze für Zahlungen IMMER PayPal mit Käuferschutz (niemals 'Freunde & Familie').\n2. Kontaktiere ZWINGEND den Match Director, BEVOR du Geld sendest, um zu prüfen, ob eine Umschreibung des Platzes überhaupt noch möglich ist!\n\nMöchtest du den E-Mail-Kontakt jetzt öffnen?",
    "spam-error": "Spam-Schutz: Du hast bereits einen Eintrag für dieses Match an diesem Datum erstellt!"
  },
  en: {
    "main-title": "IPSC SLOT MARKETPLACE",
    "sub-title": "By Shooters for Shooters – Live Marketplace",
    "btn-login-reg": "Login / Register",
    "logout": "Logout",
    "info-msg": "<strong>Important Notice:</strong> This platform only serves as a mediator. The final transfer of the slot must be processed by the respective Match Director!",
    "form-title": "Create Entry",
    "form-title-edit": "Edit Entry ✏️",
    "opt-offer": "I OFFER a slot",
    "opt-want": "I AM LOOKING FOR a slot",
    "lbl-name": "Match Name *",
    "lbl-level": "Match Level *",
    "lbl-date": "Match Date *",
    "lbl-location": "Location (Range) *",
    "lbl-country": "Country *",
    "lbl-squad": "Squad Number (Optional)",
    "lbl-price": "Price (€) *",
    "lbl-email": "Your Email Address *",
    "btn-insert": "Publish Entry for Free",
    "btn-save-edit": "Save Changes",
    "btn-cancel": "Cancel",
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
    "btn-edit": "Edit",
    "btn-export": "Export (.ics)",
    "report-btn": "Report",
    "buy-coffee": "Buy me a coffee",
    "social-proof": "Successfully mediated slots: ",
    "login-required": "Only logged-in users can contact",
    "security-checklist": "\n\nSecurity checklist before email:\n- Match details verified?\n- Match Director contacted?",
    "tag-offer": "OFFER",
    "tag-want": "WANTED",
    "link-forgot-pwd": "Forgot password?",
    "modal-forgot-title": "Reset Password",
    "modal-btn-forgot": "Send Reset Link",
    "modal-reset-title": "Set New Password",
    "lbl-new-password": "New Password *",
    "btn-save": "Save Changes",
    "modal-settings-title": "Account Settings",
    "lbl-username": "Shooter / Display Name",
    "btn-delete-acc": "Permanently Delete Account & Postings",
    "email-subject-offer": "Inquiry regarding your IPSC slot: ",
    "email-subject-want": "Regarding your request for an IPSC slot: ",
    "email-body-offer": "Hello,\n\nI saw your listing on ipscboerse.com and I am interested in the slot you offered for the match: ",
    "email-body-want": "Hello,\n\nI saw your request on ipscboerse.com. I have an available slot to give away for the match: ",
    "email-body-footer": "\n\nIs this listing still available?\n\nBest regards",
    "security-notice": "⚠️ IMPORTANT SAFETY NOTICE:\n\n1. ALWAYS use PayPal with Buyer Protection for payments (never use 'Friends & Family').\n2. You MUST contact the Match Director BEFORE making any payment to confirm if a slot transfer is still permitted!\n\nDo you want to open the email client now?",
    "spam-error": "Spam protection: You have already posted an entry for this match on this date!"
  }
};

function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

function applyLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-txt]").forEach(el => {
    const key = el.getAttribute("data-txt");
    if (translations[lang] && translations[lang][key]) { 
      if (key === "form-title" && editingMatchId !== null) return;
      if (key === "btn-insert" && editingMatchId !== null) return;
      el.innerHTML = translations[lang][key]; 
    }
  });

  const levelSelect = document.getElementById("match-level");
  if (levelSelect) {
    const currentVal = levelSelect.value;
    const defaultText = lang === "en" ? "Please select..." : "Bitte wählen...";
    levelSelect.innerHTML = `<option value="">${defaultText}</option><option value="Level I">Level I</option><option value="Level II">Level II</option><option value="Level III">Level III</option>`;
    levelSelect.value = currentVal;
  }
  if (cachedMatches.length > 0) { renderMatches(cachedMatches); }
}

function enforceFutureDates() {
  const dateInput = document.getElementById("match-date");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
  }
}

async function checkUserStatus() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  const container = document.getElementById("auth-status-container");
  const emailField = document.getElementById("seller-email");
  
  if (user) {
    const displayName = user.user_metadata?.username || user.email;
    container.innerHTML = `<span id="btn-open-settings" style="cursor:pointer; font-weight:bold; text-decoration:underline; color:var(--accent-color); margin-right:10px;">${escapeHtml(displayName)}</span><button id="btn-logout">${translations[currentLang]["logout"]}</button>`;
    
    document.getElementById("btn-open-settings").onclick = () => {
      document.getElementById("auth-modal").style.display = "flex";
      toggleAuthView("settings");
      document.getElementById("settings-username").value = user.user_metadata?.username || "";
    };

    document.getElementById("btn-logout").onclick = async () => { 
      await supabaseClient.auth.signOut(); 
      location.reload(); 
    };
    if (emailField) { emailField.value = user.email; emailField.readOnly = true; }
  } else {
    container.innerHTML = `<button id="btn-open-login">${translations[currentLang]["btn-login-reg"]}</button>`;
    document.getElementById("btn-open-login").onclick = () => {
      document.getElementById("auth-modal").style.display = "flex";
      toggleAuthView("login");
    };
    if (emailField) { emailField.value = ""; emailField.placeholder = "Logge dich ein, um zu inserieren"; }
  }
}

async function fetchMatches() {
  const { data, error } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
  if (error) return;
  
  const todayStr = new Date().toISOString().split("T")[0];
  cachedMatches = (data || []).filter(m => m.match_date >= todayStr);
  
  renderMatches(cachedMatches);
}

function renderMatches(matches) {
  const container = document.getElementById("match-container");
  if (!matches.length) { container.innerHTML = `<p>${translations[currentLang]["no-slots"]}</p>`; return; }
  
  container.innerHTML = matches.map(m => {
    const isWant = m.type === "want";
    const levelBadge = m.match_level ? `<span class="badge" style="background:#555; color:#fff; padding:2px 5px; border-radius:3px;">${escapeHtml(m.match_level)}</span>` : "";
    const squadBadge = m.match_squad ? `<span class="badge" style="background:#3498db; color:#fff; padding:2px 5px; border-radius:3px;">Squad ${escapeHtml(m.match_squad)}</span>` : "";
    const countryBadge = m.match_country ? `<span class="badge" style="background:#8e44ad; color:#fff; padding:2px 5px; border-radius:3px;">${escapeHtml(m.match_country)}</span>` : "";

    const canManage = currentUser && currentUser.email === m.seller_email;
    const cleanMatchName = m.match_name.replace(/"/g, '&quot;').replace(/'/g, "\\'");
    const contactBtnClass = isWant ? "btn-contact btn-contact-want" : "btn-contact";
    const contactText = isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"];

    return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
      <div class="match-details">
        <h3>
          ${escapeHtml(m.match_name)} 
          ${levelBadge} 
          ${squadBadge} 
          ${countryBadge}
          <span class="badge">${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}</span>
        </h3>
        <p>${m.match_date} | ${escapeHtml(m.match_location)}</p>
      </div>
      <div class="card-actions">
        <p>${parseFloat(m.match_price).toFixed(2)} €</p>
        <button class="${contactBtnClass}" onclick="handleContactClick('${m.seller_email}', '${cleanMatchName}', '${m.type}')">${contactText}</button>
        <div class="action-buttons-group">
            <button class="btn-export" onclick="exportToIcs(${m.id})">${translations[currentLang]["btn-export"]}</button>
            <button class="btn-report" onclick="reportMatch(${m.id})">${translations[currentLang]["report-btn"]}</button>
        </div>
        ${canManage ? `
          <div class="action-buttons-group">
            <button class="btn-edit" onclick="handleEditClick(${m.id})">${translations[currentLang]["btn-edit"]}</button>
            <button class="btn-delete" onclick="handleDelete(${m.id}, '${m.seller_email}')">${translations[currentLang]["btn-delete"]}</button>
          </div>
        ` : ""}
      </div>
    </div>`;
  }).join("");
}

function handleContactClick(email, matchName, type) {
  if (!currentUser) {
    alert(translations[currentLang]["login-required"]);
    return;
  }

  const conf = confirm(translations[currentLang]["security-notice"] + translations[currentLang]["security-checklist"]);
  if (!conf) return;

  const subjectPrefix = type === "want" ? translations[currentLang]["email-subject-want"] : translations[currentLang]["email-subject-offer"];
  const bodyPrefix = type === "want" ? translations[currentLang]["email-body-want"] : translations[currentLang]["email-body-offer"];
  
  const subject = encodeURIComponent(subjectPrefix + matchName);
  const body = encodeURIComponent(bodyPrefix + matchName + translations[currentLang]["email-body-footer"]);
  
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}
window.handleContactClick = handleContactClick;

function exportToIcs(id) {
  const match = cachedMatches.find(m => m.id === id);
  if (!match) return;
  const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${match.match_name}\nDTSTART:${match.match_date.replace(/-/g, '')}T080000Z\nLOCATION:${match.match_location}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${match.match_name.replace(/\s+/g, '_')}.ics`;
  a.click();
  window.URL.revokeObjectURL(url);
}
window.exportToIcs = exportToIcs;

function reportMatch(id) {
  if (!currentUser) {
    alert(translations[currentLang]["login-required"]);
    return;
  }
  const subject = encodeURIComponent("Melde-Anzeige: Eintrag ID " + id);
  const body = encodeURIComponent("Hallo Administratoren,\n\nich möchte folgenden Eintrag melden: " + window.location.origin + "/?id=" + id + "\n\nGrund der Meldung:\n");
  window.location.href = `mailto:info@ipscboerse.com?subject=${subject}&body=${body}`;
}
window.reportMatch = reportMatch;

function handleEditClick(id) {
  const match = cachedMatches.find(m => m.id === id);
  if (!match) return;

  editingMatchId = id;

  document.getElementById("match-name").value = match.match_name;
  document.getElementById("match-level").value = match.match_level;
  document.getElementById("match-date").value = match.match_date;
  document.getElementById("match-location").value = match.match_location;
  document.getElementById("match-country").value = match.match_country || "DE";
  document.getElementById("match-squad").value = match.match_squad || "";
  document.getElementById("match-price").value = match.match_price;
  
  if (match.type === "want") {
    document.getElementById("type-want").checked = true;
  } else {
    document.getElementById("type-offer").checked = true;
  }

  document.getElementById("form-section-title").innerText = translations[currentLang]["form-title-edit"];
  document.getElementById("btn-submit-ad").innerText = translations[currentLang]["btn-save-edit"];
  document.getElementById("btn-cancel-edit").style.display = "inline-block";

  document.getElementById("form-anchor").scrollIntoView({ behavior: "smooth" });
}
window.handleEditClick = handleEditClick;

function resetFormState() {
  editingMatchId = null;
  document.getElementById("match-form").reset();
  document.getElementById("form-section-title").innerText = translations[currentLang]["form-title"];
  document.getElementById("btn-submit-ad").innerText = translations[currentLang]["btn-insert"];
  document.getElementById("btn-cancel-edit").style.display = "none";
  enforceFutureDates();
}
document.getElementById("btn-cancel-edit").addEventListener("click", resetFormState);

async function handleDelete(id, sellerEmail) {
  if (!currentUser || currentUser.email !== sellerEmail) { return alert("Fehler: Unberechtigt."); }
  if (!confirm("Möchtest du diesen Eintrag wirklich unwiderruflich löschen?")) return;
  await supabaseClient.from("matches").delete().eq("id", id);
  if (editingMatchId === id) resetFormState();
  fetchMatches();
}

function toggleAuthView(view) {
  document.getElementById("modal-login-view").style.display = view === "login" ? "block" : "none";
  document.getElementById("modal-register-view").style.display = view === "register" ? "block" : "none";
  document.getElementById("modal-forgot-view").style.display = view === "forgot" ? "block" : "none";
  document.getElementById("modal-reset-view").style.display = view === "reset-password" ? "block" : "none";
  document.getElementById("modal-settings-view").style.display = view === "settings" ? "block" : "none";
}
window.toggleAuthView = toggleAuthView;

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    document.getElementById("auth-modal").style.display = "flex";
    toggleAuthView("reset-password");
  }
});

document.getElementById("match-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return alert("Bitte melde dich an.");
  
  const inputDate = document.getElementById("match-date").value;
  const todayStr = new Date().toISOString().split("T")[0];
  
  if (inputDate < todayStr) {
    alert(currentLang === "en" ? "Error: Match date cannot be in the past!" : "Fehler: Das Match-Datum darf nicht in der Vergangenheit liegen!");
    return;
  }

  const matchName = document.getElementById("match-name").value;

  let spamCheck = supabaseClient
    .from("matches")
    .select("id")
    .eq("seller_email", currentUser.email)
    .eq("match_name", matchName)
    .eq("match_date", inputDate);

  if (editingMatchId !== null) {
    spamCheck = spamCheck.neq("id", editingMatchId);
  }

  const { data: duplicateEntries, error: spamError } = await spamCheck;

  if (spamError) {
    alert("Fehler bei der Spam-Prüfung: " + spamError.message);
    return;
  }

  if (duplicateEntries && duplicateEntries.length > 0) {
    alert(translations[currentLang]["spam-error"]);
    return;
  }

  const matchData = {
    match_name: matchName,
    match_level: document.getElementById("match-level").value,
    match_date: inputDate,
    match_location: document.getElementById("match-location").value,
    match_country: document.getElementById("match-country").value,
    match_price: document.getElementById("match-price").value,
    seller_email: currentUser.email,
    type: document.getElementById("type-want").checked ? "want" : "offer"
  };

  if (document.getElementById("match-squad").value) {
    matchData.match_squad = document.getElementById("match-squad").value;
  } else {
    matchData.match_squad = null;
  }

  if (editingMatchId !== null) {
    const { error } = await supabaseClient.from("matches").update(matchData).eq("id", editingMatchId);
    if (error) alert("Fehler beim Aktualisieren: " + error.message);
  } else {
    const { error } = await supabaseClient.from("matches").insert([matchData]);
    if (error) alert("Fehler beim Erstellen: " + error.message);
  }

  resetFormState();
  fetchMatches();
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
  });
  if (error) alert("Login fehlgeschlagen: " + error.message);
  else location.reload();
});

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signUp({
    email: document.getElementById("register-email").value,
    password: document.getElementById("register-password").value,
  });
  if (error) alert("Registrierung fehlgeschlagen: " + error.message);
  else { alert("Konto erstellt! Bitte überprüfe dein Postfach."); toggleAuthView("login"); }
});

document.getElementById("forgot-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.resetPasswordForEmail(document.getElementById("forgot-email").value, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) alert("Fehler: " + error.message);
  else { alert("Link zum Zurücksetzen gesendet!"); toggleAuthView("login"); }
});

document.getElementById("reset-password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.updateUser({
    password: document.getElementById("reset-password-input").value
  });
  if (error) alert("Fehler: " + error.message);
  else { 
    alert(currentLang === "en" ? "Password updated! Confirmation email has been sent." : "Passwort erfolgreich aktualisiert! Eine Bestätigungs-E-Mail wurde versendet."); 
    location.reload(); 
  }
});

document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const newUsername = document.getElementById("settings-username").value;
  const newPassword = document.getElementById("settings-password").value;
  
  let updates = { data: { username: newUsername } };
  if (newPassword.trim().length >= 6) { updates.password = newPassword; }

  const { error } = await supabaseClient.auth.updateUser(updates);
  if (error) alert("Fehler beim Aktualisieren: " + error.message);
  else { 
    alert(currentLang === "en" ? "Account updated! Security notice sent if password was changed." : "Konto erfolgreich aktualisiert! Falls das Passwort geändert wurde, wurde eine Bestätigungs-Mail versendet."); 
    location.reload(); 
  }
});

document.getElementById("btn-delete-account").addEventListener("click", async () => {
  if (!confirm("⚠️ WARNUNG:\n\nMöchtest du dein Profil und all deine aktiven Marktplatz-Inserate wirklich unwiderruflich löschen?")) return;
  await supabaseClient.from("matches").delete().eq("seller_email", currentUser.email);
  await supabaseClient.auth.updateUser({ data: { deleted: true, username: "Gelöschter Schütze" } });
  await supabaseClient.auth.signOut();
  alert("Dein Konto und deine Inserate wurden erfolgreich entfernt.");
  location.reload();
});

document.getElementById("filter-type-select").addEventListener("change", (e) => {
  const type = e.target.value;
  if (type === "all") renderMatches(cachedMatches);
  else renderMatches(cachedMatches.filter(m => m.type === type));
});

document.getElementById("language-select").addEventListener("change", (e) => { applyLanguage(e.target.value); });
document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";

// Initiale Funktionsaufrufe
applyLanguage("de");
enforceFutureDates();
checkUserStatus();
fetchMatches();
