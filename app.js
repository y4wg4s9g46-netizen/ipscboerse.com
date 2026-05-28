const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mPH_ETwGVhcm7pr35WVPWA_KgJu5N_e";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentLang = "de";
let cachedMatches = [];
let editingMatchId = null;
let pendingContact = null;

const translations = {
 de: {
   "main-title": "IPSC STARTPLATZ-BÖRSE",
   "sub-title": "Von Schützen für Schützen – Live Marktplatz",
   "btn-login-reg": "Login / Registrieren",
   "logout": "Abmelden",
   "info-msg": "<strong>Wichtiger Hinweis:</strong> Diese Plattform dient nur der Vermittlung. Die endgültige Umschreibung des Startplatzes muss zwingend über den jeweiligen Match Director durchgeführt werden!",
   "stats-text": "Startplätze erfolgreich vermittelt!",
   "form-title": "Eintrag erstellen",
   "form-title-edit": "Eintrag bearbeiten ✏️",
   "opt-offer": "Ich BIETE einen Startplatz an",
   "opt-want": "Ich SUCHE einen Startplatz",
   "lbl-name": "Name des Matches *",
   "lbl-level": "Match Level *",
   "lbl-country": "Land *",
   "lbl-division": "Division (Optional)",
   "lbl-date": "Datum des Matches *",
   "lbl-deadline": "Umschreibung möglich bis (Optional)",
   "lbl-location": "Austragungsort (Stand) *",
   "lbl-squad": "Squad Nummer (Optional)",
   "lbl-price": "Abgabepreis (€) *",
   "lbl-email": "Deine E-Mail *",
   "btn-insert": "Eintrag veröffentlichen",
   "btn-save-edit": "Änderungen speichern",
   "btn-cancel": "Abbrechen",
   "filter-type": "Anzeigentyp:",
   "filter-all": "Alle Anzeigen",
   "filter-offers": "Nur Angebote (Biete)",
   "filter-wants": "Nur Gesuche (Suche)",
   "list-title": "Aktuelle Marktplatz-Einträge",
   "loading": "Lade Einträge...",
   "modal-login-title": "Anmelden",
   "modal-btn-login": "Einloggen",
   "modal-reg-title": "Konto erstellen",
   "modal-btn-reg": "Erstellen",
   "modal-link-reg": "Registrieren",
   "modal-link-login": "Zum Login",
   "link-forgot-pwd": "Passwort vergessen?",
   "modal-forgot-title": "Passwort zurücksetzen",
   "modal-btn-forgot": "Link senden",
   "modal-reset-title": "Neues Passwort vergeben",
   "lbl-new-password": "Neues Passwort (Optional)",
   "btn-save": "Änderungen speichern",
   "modal-settings-title": "Konto-Einstellungen",
   "lbl-username": "Schützenname / Anzeigename",
   "btn-delete-acc": "Konto & alle Einträge unwiderruflich löschen",
   "footer-impressum-link": "Impressum & Rechtliche Hinweise",
   "no-slots": "Aktuell keine Einträge verfügbar.",
   "btn-request": "Anbieter kontaktieren",
   "btn-contact-want": "Schützen kontaktieren",
   "btn-delete": "Löschen",
   "btn-edit": "Bearbeiten",
   "btn-report": "Melden",
   "btn-ics": "Kalender",
   "tag-offer": "BIETE",
   "tag-want": "SUCHE",
   "login-to-contact": "Bitte logge dich ein, um Kontakt aufzunehmen.",
   "modal-checklist-title": "⚠️ Sicherheits-Checkliste",
   "checklist-desc": "Bevor du Kontakt aufnimmst, musst du Folgendes bestätigen:",
   "chk-paypal": "Ich zahle <strong>nur per PayPal mit Käuferschutz</strong>.",
   "chk-mos": "Ich prüfe, ob eine Umschreibung beim Match Director noch möglich ist.",
   "chk-liability": "Mir ist bewusst, dass die Plattform keine Haftung übernimmt.",
   "btn-proceed-mail": "Jetzt E-Mail schreiben",
   "prompt-success-match": "Wurde der Startplatz über diese Plattform erfolgreich vermittelt/gefunden?",
   "alert-reported": "Inserat wurde zur Überprüfung gemeldet. Danke!",
   "spam-error": "Spam-Schutz: Du hast bereits einen Eintrag für dieses Match an diesem Datum erstellt!"
 },
 en: {
   "main-title": "IPSC SLOT MARKETPLACE",
   "sub-title": "By Shooters for Shooters – Live Marketplace",
   "btn-login-reg": "Login / Register",
   "logout": "Logout",
   "info-msg": "<strong>Important Notice:</strong> This platform only serves as a mediator. The final transfer of the slot must be processed by the respective Match Director!",
   "stats-text": "Slots successfully transferred!",
   "form-title": "Create Entry",
   "form-title-edit": "Edit Entry ✏️",
   "opt-offer": "I OFFER a slot",
   "opt-want": "I AM LOOKING FOR a slot",
   "lbl-name": "Match Name *",
   "lbl-level": "Match Level *",
   "lbl-country": "Country *",
   "lbl-division": "Division (Optional)",
   "lbl-date": "Match Date *",
   "lbl-deadline": "Transfer Deadline (Optional)",
   "lbl-location": "Location (Range) *",
   "lbl-squad": "Squad Number (Optional)",
   "lbl-price": "Price (€) *",
   "lbl-email": "Your Email *",
   "btn-insert": "Publish Entry",
   "btn-save-edit": "Save Changes",
   "btn-cancel": "Cancel",
   "filter-type": "Ad Type:",
   "filter-all": "All Ads",
   "filter-offers": "Offers Only",
   "filter-wants": "Wants Only",
   "list-title": "Current Marketplace Entries",
   "loading": "Loading slots...",
   "modal-login-title": "Login",
   "modal-btn-login": "Login",
   "modal-reg-title": "Create Account",
   "modal-btn-reg": "Create",
   "modal-link-reg": "Register",
   "modal-link-login": "Go to Login",
   "link-forgot-pwd": "Forgot password?",
   "modal-forgot-title": "Reset Password",
   "modal-btn-forgot": "Send Link",
   "modal-reset-title": "Set New Password",
   "lbl-new-password": "New Password (Optional)",
   "btn-save": "Save Changes",
   "modal-settings-title": "Account Settings",
   "lbl-username": "Shooter / Display Name",
   "btn-delete-acc": "Permanently Delete Account & Postings",
   "footer-impressum-link": "Imprint & Legal Notices",
   "no-slots": "No entries available.",
   "btn-request": "Contact Seller",
   "btn-contact-want": "Contact Shooter",
   "btn-delete": "Delete",
   "btn-edit": "Edit",
   "btn-report": "Report",
   "btn-ics": "Calendar",
   "tag-offer": "OFFER",
   "tag-want": "WANTED",
   "login-to-contact": "Please log in to contact the user.",
   "modal-checklist-title": "⚠️ Safety Checklist",
   "checklist-desc": "Please confirm the following before proceeding:",
   "chk-paypal": "I will <strong>only use PayPal with Buyer Protection</strong>.",
   "chk-mos": "I will verify if a slot transfer is still permitted by the MD.",
   "chk-liability": "I understand the platform assumes no liability.",
   "btn-proceed-mail": "Open Email Client",
   "prompt-success-match": "Was the slot successfully transferred/found via this platform?",
   "alert-reported": "Listing reported for review. Thank you!",
   "spam-error": "Spam protection: You have already posted an entry for this match on this date!"
 }
};

function escapeHtml(text) {
 if (!text) return "";
 const div = document.createElement("div"); div.textContent = text; return div.innerHTML;
}

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
   levelSelect.innerHTML = `<option value="">${lang === "en" ? "Select..." : "Wählen..."}</option><option value="Level I">Level I</option><option value="Level II">Level II</option><option value="Level III">Level III</option>`;
   levelSelect.value = currentVal;
 }
 if (cachedMatches.length > 0) renderFilteredMatches();
}

function enforceFutureDates() {
 const today = new Date().toISOString().split("T")[0];
 const dateInput = document.getElementById("match-date");
 const dlInput = document.getElementById("match-deadline");
 if(dateInput) dateInput.setAttribute("min", today);
 if(dlInput) dlInput.setAttribute("min", today);
}

async function checkUserStatus() {
 const { data: { user } } = await supabaseClient.auth.getUser();
 currentUser = user;
 const container = document.getElementById("auth-status-container");
 const emailField = document.getElementById("seller-email");

 if (user) {
   const displayName = user.user_metadata?.username || user.email;
   container.innerHTML = `<span id="btn-open-settings" style="cursor:pointer; font-weight:bold; text-decoration:underline; color:var(--accent-color); margin-right:10px;">${escapeHtml(displayName)}</span><button class="btn-auth" id="btn-logout">${translations[currentLang]["logout"]}</button>`;

   document.getElementById("btn-open-settings").onclick = () => {
     document.getElementById("auth-modal").style.display = "flex";
     toggleAuthView("settings");
     document.getElementById("settings-username").value = user.user_metadata?.username || "";
   };
   document.getElementById("btn-logout").onclick = async () => { await supabaseClient.auth.signOut(); location.reload(); };
   if (emailField) { emailField.value = user.email; emailField.readOnly = true; }
 } else {
   container.innerHTML = `<button class="btn-auth" id="btn-open-login">${translations[currentLang]["btn-login-reg"]}</button>`;
   document.getElementById("btn-open-login").onclick = () => { document.getElementById("auth-modal").style.display = "flex"; toggleAuthView("login"); };
   if (emailField) { emailField.value = ""; emailField.placeholder = "Logge dich ein, um zu inserieren"; }
 }
 fetchStats();
}

async function fetchStats() {
 const { data } = await supabaseClient.from("platform_stats").select("successful_matches").eq("id", 1).single();
 if (data && data.successful_matches > 0) {
   const banner = document.getElementById("stats-banner");
   if(banner) {
       banner.style.display = "block";
       document.getElementById("stats-counter").innerText = data.successful_matches;
   }
 }
}

async function fetchMatches() {
 const { data, error } = await supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
 if (error) return;
 const todayStr = new Date().toISOString().split("T")[0];
 // Filtere abgelaufene Matches UND solche, deren Deadline überschritten ist
 cachedMatches = (data || []).filter(m => m.match_date >= todayStr && (!m.transfer_deadline || m.transfer_deadline >= todayStr));
 renderFilteredMatches();
}

function renderFilteredMatches() {
   const filterSelect = document.getElementById("filter-type-select");
   const type = filterSelect ? filterSelect.value : "all";
   if (type === "all") renderMatches(cachedMatches);
   else renderMatches(cachedMatches.filter(m => m.type === type));
}

function renderMatches(matches) {
 const container = document.getElementById("match-container");
 if (!matches.length) { container.innerHTML = `<p>${translations[currentLang]["no-slots"]}</p>`; return; }

 container.innerHTML = matches.map(m => {
   const isWant = m.type === "want";
   const canManage = currentUser && currentUser.email === m.seller_email;
   const cleanMatchName = String(m.match_name).replace(/"/g, '&quot;').replace(/'/g, "\\'");

   // Badges generieren
   const badges = [];
   if (m.match_level) badges.push(`<span class="badge">${escapeHtml(m.match_level)}</span>`);
   if (m.match_country) badges.push(`<span class="badge" style="background:#8e44ad;">${escapeHtml(m.match_country)}</span>`);
   if (m.match_division) badges.push(`<span class="badge" style="background:#e67e22;">${escapeHtml(m.match_division)}</span>`);
   if (m.match_squad) badges.push(`<span class="badge" style="background:#3498db;">Squad ${escapeHtml(String(m.match_squad))}</span>`);
   if (m.transfer_deadline) badges.push(`<span class="badge" style="background:#c0392b;">Deadline: ${m.transfer_deadline}</span>`);

   return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
     <div class="match-details">
       <h3>
         ${isWant ? translations[currentLang]["tag-want"] : translations[currentLang]["tag-offer"]}: ${escapeHtml(m.match_name)}
       </h3>
       <div class="badge-container">${badges.join("")}</div>
       <p style="margin-top: 10px;">📅 ${m.match_date} | 📍 ${escapeHtml(m.match_location)}</p>

       <div class="action-links">
           <a onclick="generateICS('${cleanMatchName}', '${m.match_date}', '${escapeHtml(m.match_location)}')">📅 ${translations[currentLang]["btn-ics"]}</a>
           ${currentUser && !canManage ? `| <a class="report-link" onclick="handleReport('${m.id}')">🚩 ${translations[currentLang]["btn-report"]}</a>` : ""}
       </div>
     </div>

     <div class="card-actions">
       <p style="margin: 0; font-weight: bold; font-size: 18px;">${parseFloat(m.match_price).toFixed(2)} €</p>
       <button class="btn-contact" style="background:${isWant ? 'var(--info-color)' : 'var(--success-color)'}; color:#fff;"
               onclick="handleContactClick('${m.seller_email}', '${cleanMatchName}', '${m.type}')">
           ${isWant ? translations[currentLang]["btn-contact-want"] : translations[currentLang]["btn-request"]}
       </button>
       ${canManage ? `
         <div style="display:flex; gap:10px; margin-top:5px;">
           <a onclick="handleEditClick('${m.id}')" style="cursor:pointer; font-size:12px; color:var(--accent-color);">✏️ ${translations[currentLang]["btn-edit"]}</a>
           <a onclick="handleDelete('${m.id}', '${m.seller_email}')" style="cursor:pointer; font-size:12px; color:var(--danger-color);">🗑️ ${translations[currentLang]["btn-delete"]}</a>
         </div>
       ` : ""}
     </div>
   </div>`;
 }).join("");
}

// ICS KALENDER EXPORT
function generateICS(name, date, location) {
 const icsData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:IPSC Match: ${name}\nDTSTART;VALUE=DATE:${date.replace(/-/g, '')}\nLOCATION:${location}\nEND:VEVENT\nEND:VCALENDAR`;
 const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
 const link = document.createElement('a');
 link.href = URL.createObjectURL(blob);
 link.download = `IPSC_${name.replace(/\s+/g, '_')}.ics`;
 document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
window.generateICS = generateICS;

// REPORT FUNKTION
async function handleReport(id) {
 if(!confirm("Dieses Inserat als verdächtig melden?")) return;
 await supabaseClient.from("matches").update({ is_reported: true }).eq("id", id);
 alert(translations[currentLang]["alert-reported"]);
}
window.handleReport = handleReport;

// KONTAKT & CHECKLISTE
function handleContactClick(email, matchName, type) {
 if (!currentUser) {
   alert(translations[currentLang]["login-to-contact"]);
   document.getElementById("auth-modal").style.display = "flex";
   toggleAuthView("login");
   return;
 }
 pendingContact = { email, matchName, type };
 document.getElementById("auth-modal").style.display = "flex";
 toggleAuthView("checklist");

 ["chk-paypal", "chk-mos", "chk-liability"].forEach(id => document.getElementById(id).checked = false);
 document.getElementById("btn-proceed-contact").disabled = true;
}
window.handleContactClick = handleContactClick;

// Checkbox Logic
document.querySelectorAll(".checklist-item input").forEach(chk => {
   chk.addEventListener("change", () => {
       const allChecked = document.getElementById("chk-paypal").checked &&
                          document.getElementById("chk-mos").checked &&
                          document.getElementById("chk-liability").checked;
       document.getElementById("btn-proceed-contact").disabled = !allChecked;
   });
});

document.getElementById("btn-proceed-contact").addEventListener("click", () => {
   if(!pendingContact) return;
   const isWant = pendingContact.type === "want";
   const subject = encodeURIComponent((isWant ? "Gesuch: " : "Angebot: ") + pendingContact.matchName);
   const body = encodeURIComponent("Hallo,\n\nich habe dein Inserat auf ipscboerse.com gesehen bezüglich: " + pendingContact.matchName + "\n\nIst das noch aktuell?\n\nViele Grüße");
   window.location.href = `mailto:${pendingContact.email}?subject=${subject}&body=${body}`;
   document.getElementById("auth-modal").style.display = "none";
});

function handleEditClick(id) {
 const match = cachedMatches.find(m => String(m.id) === String(id));
 if (!match) return;
 editingMatchId = id;

 document.getElementById("match-name").value = match.match_name || "";
 document.getElementById("match-level").value = match.match_level || "";
 document.getElementById("match-country").value = match.match_country || "DE";
 document.getElementById("match-division").value = match.match_division || "";
 document.getElementById("match-date").value = match.match_date || "";
 document.getElementById("match-deadline").value = match.transfer_deadline || "";
 document.getElementById("match-location").value = match.match_location || "";
 document.getElementById("match-squad").value = match.match_squad || "";
 document.getElementById("match-price").value = match.match_price || "";
 document.getElementById(match.type === "want" ? "type-want" : "type-offer").checked = true;

 const titleEl = document.getElementById("form-section-title");
 if (titleEl) titleEl.innerText = translations[currentLang]["form-title-edit"];

 const submitBtn = document.getElementById("btn-submit-ad");
 if (submitBtn) submitBtn.innerText = translations[currentLang]["btn-save-edit"];

 const cancelBtn = document.getElementById("btn-cancel-edit");
 if (cancelBtn) cancelBtn.style.display = "inline-block";

 const formAnchor = document.getElementById("form-anchor");
 if (formAnchor) formAnchor.scrollIntoView({ behavior: "smooth" });
}
window.handleEditClick = handleEditClick;

function resetFormState() {
 editingMatchId = null;
 document.getElementById("match-form").reset();

 const titleEl = document.getElementById("form-section-title");
 if (titleEl) titleEl.innerText = translations[currentLang]["form-title"];

 const submitBtn = document.getElementById("btn-submit-ad");
 if (submitBtn) submitBtn.innerText = translations[currentLang]["btn-insert"];

 const cancelBtn = document.getElementById("btn-cancel-edit");
 if (cancelBtn) cancelBtn.style.display = "none";

 enforceFutureDates();
}
const btnCancelEdit = document.getElementById("btn-cancel-edit");
if (btnCancelEdit) btnCancelEdit.addEventListener("click", resetFormState);

// LÖSCHEN & STATISTIK TRACKING
async function handleDelete(id, sellerEmail) {
 if (!currentUser || currentUser.email !== sellerEmail) { return alert("Fehler: Unberechtigt."); }

 const wasSuccess = confirm(translations[currentLang]["prompt-success-match"]);
 if (!confirm("Eintrag endgültig löschen?")) return;

 if (wasSuccess) {
   const { data } = await supabaseClient.from("platform_stats").select("successful_matches").eq("id", 1).single();
   if (data) {
       await supabaseClient.from("platform_stats").update({ successful_matches: data.successful_matches + 1 }).eq("id", 1);
   }
 }

 await supabaseClient.from("matches").delete().eq("id", id);
 if (String(editingMatchId) === String(id)) resetFormState();
 fetchMatches();
 fetchStats();
}
window.handleDelete = handleDelete;

function toggleAuthView(view) {
 document.getElementById("modal-login-view").style.display = view === "login" ? "block" : "none";
 document.getElementById("modal-register-view").style.display = view === "register" ? "block" : "none";
 document.getElementById("modal-forgot-view").style.display = view === "forgot" ? "block" : "none";
 document.getElementById("modal-reset-view").style.display = view === "reset-password" ? "block" : "none";
 document.getElementById("modal-settings-view").style.display = view === "settings" ? "block" : "none";
 document.getElementById("modal-checklist-view").style.display = view === "checklist" ? "block" : "none";
}
window.toggleAuthView = toggleAuthView;

supabaseClient.auth.onAuthStateChange(async (event, session) => {
 if (event === "PASSWORD_RECOVERY") {
   document.getElementById("auth-modal").style.display = "flex";
   toggleAuthView("reset-password");
 }
});

// FORMULAR SUBMIT INKL. SPAM-SCHUTZ
document.getElementById("match-form").addEventListener("submit", async (e) => {
 e.preventDefault();
 if (!currentUser) return alert("Bitte anmelden.");

 const inputDate = document.getElementById("match-date").value;
 const todayStr = new Date().toISOString().split("T")[0];

 if (inputDate < todayStr) {
   alert(currentLang === "en" ? "Error: Match date cannot be in the past!" : "Fehler: Das Match-Datum darf nicht in der Vergangenheit liegen!");
   return;
 }

 const matchName = document.getElementById("match-name").value;

 // SPAM SCHUTZ
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
 if (spamError) return alert("Fehler bei der Spam-Prüfung: " + spamError.message);
 if (duplicateEntries && duplicateEntries.length > 0) return alert(translations[currentLang]["spam-error"]);

 const deadline = document.getElementById("match-deadline").value;
 const squadValue = document.getElementById("match-squad") ? document.getElementById("match-squad").value : "";

 const matchData = {
   match_name: matchName,
   match_level: document.getElementById("match-level").value,
   match_country: document.getElementById("match-country").value,
   match_division: document.getElementById("match-division").value || null,
   match_date: inputDate,
   transfer_deadline: deadline ? deadline : null,
   match_location: document.getElementById("match-location").value,
   match_price: parseFloat(document.getElementById("match-price").value),
   match_squad: squadValue.trim() !== "" ? squadValue : null,
   seller_email: currentUser.email,
   type: document.getElementById("type-want").checked ? "want" : "offer"
 };

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

// AUTHENTIFIZIERUNGS-LISTENER
document.getElementById("login-form").addEventListener("submit", async (e) => {
 e.preventDefault();
 const { error } = await supabaseClient.auth.signInWithPassword({ email: document.getElementById("login-email").value, password: document.getElementById("login-password").value });
 if (error) alert("Login fehlgeschlagen: " + error.message); else location.reload();
});

document.getElementById("register-form").addEventListener("submit", async (e) => {
 e.preventDefault();
 const { error } = await supabaseClient.auth.signUp({ email: document.getElementById("register-email").value, password: document.getElementById("register-password").value });
 if (error) alert("Registrierung fehlgeschlagen: " + error.message);
 else { alert("Konto erstellt! Bitte überprüfe dein Postfach."); toggleAuthView("login"); }
});

document.getElementById("forgot-form").addEventListener("submit", async (e) => {
 e.preventDefault();
 const { error } = await supabaseClient.auth.resetPasswordForEmail(document.getElementById("forgot-email").value, { redirectTo: window.location.origin + window.location.pathname });
 if (error) alert("Fehler: " + error.message); else { alert("Link gesendet!"); toggleAuthView("login"); }
});

document.getElementById("reset-password-form").addEventListener("submit", async (e) => {
 e.preventDefault();
 const { error } = await supabaseClient.auth.updateUser({ password: document.getElementById("reset-password-input").value });
 if (error) alert("Fehler: " + error.message); else { alert("Passwort aktualisiert!"); location.reload(); }
});

document.getElementById("settings-form").addEventListener("submit", async (e) => {
 e.preventDefault();
 const newUsername = document.getElementById("settings-username").value;
 const newPassword = document.getElementById("settings-password").value;
 let updates = { data: { username: newUsername } };
 if (newPassword.trim().length >= 6) updates.password = newPassword;
 const { error } = await supabaseClient.auth.updateUser(updates);
 if (error) alert("Fehler: " + error.message); else { alert("Konto aktualisiert!"); location.reload(); }
});

document.getElementById("btn-delete-account").addEventListener("click", async () => {
 if (!confirm("⚠️ WARNUNG:\n\nMöchtest du dein Profil und all deine aktiven Marktplatz-Inserate wirklich unwiderruflich löschen?")) return;
 await supabaseClient.from("matches").delete().eq("seller_email", currentUser.email);
 await supabaseClient.auth.updateUser({ data: { deleted: true, username: "Gelöschter Schütze" } });
 await supabaseClient.auth.signOut();
 alert("Dein Konto und deine Inserate wurden erfolgreich entfernt.");
 location.reload();
});

const filterTypeSelect = document.getElementById("filter-type-select");
if (filterTypeSelect) filterTypeSelect.addEventListener("change", renderFilteredMatches);

const languageSelect = document.getElementById("language-select");
if (languageSelect) languageSelect.addEventListener("change", (e) => applyLanguage(e.target.value));

document.getElementById("btn-close-modal").onclick = () => document.getElementById("auth-modal").style.display = "none";

applyLanguage("de");
enforceFutureDates();
checkUserStatus();
fetchMatches();
