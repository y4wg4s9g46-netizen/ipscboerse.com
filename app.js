let cachedMatches = [];
window.editingMatchId = null; 
window.activeChatRoom = null; 
window.lastChatCheckedTimestamp = localStorage.getItem("lastChatChecked") || new Date().toISOString();

// Globale Helferfunktion für sicheres HTML (ersetzt die Einzel-Funktionen aus den alten Dateien)
window.escapeHtml = function(text) { 
    if (!text) return "";
    const div = document.createElement("div"); 
    div.textContent = text; 
    return div.innerHTML; 
};

// ==========================================================================
// GLOBALE INJEKTION FÜR KONTO-EINSTELLUNGEN, AUTH, CHAT & INBOX
// ==========================================================================
(function injectGlobalModals() {
    if (!document.getElementById("auth-modal")) {
        const authModalHtml = `
        <div class="modal" id="auth-modal">
            <div class="modal-content">
                <div class="modal-close-container">
                    <button class="modal-close-trigger" id="btn-close-modal">&times;</button>
                </div>
                
                <div id="modal-login-view">
                    <h3 data-txt="modal-login-title">Anmelden</h3>
                    
                    <form id="login-form">
                        <div class="form-group">
                            <label for="login-email" data-txt="lbl-email">E-Mail *</label>
                            <input type="email" id="login-email" required placeholder="name@beispiel.de">
                        </div>
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label for="login-password" style="margin-bottom: 0;">Passwort *</label>
                                <a onclick="toggleAuthView('forgot')" style="color: var(--info-color); text-decoration: none; font-size: 12px; cursor: pointer; font-weight: 600;" data-txt="link-forgot-pwd">Passwort vergessen?</a>
                            </div>
                            <input type="password" id="login-password" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="btn-primary-auth" data-txt="modal-btn-login">Mit E-Mail einloggen</button>
                    </form>

                    <div class="social-login-separator" style="margin: 24px 0 15px 0; text-align: center; border-top: 1px solid var(--border-color); padding-top: 20px;">
                        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Oder Schnell-Login nutzen:</p>
                        
                        <button type="button" onclick="loginWithPasskey()" class="btn-social-passkey" style="margin-bottom: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path></svg>
                            Mit FaceID / Passkey
                        </button>
                        <button type="button" onclick="loginWithApple()" class="btn-social-apple" style="margin-bottom: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;"><path d="M16.36 14.16c0 3.3-2.67 5.9-6.02 5.9-2.32 0-4.32-1.32-5.32-3.23.47.05.95.07 1.43.07 1.93 0 3.69-.73 5.03-1.95a3.98 3.98 0 0 1-1.78-3.05c.34.06.69.1 1.05.1a3.9 3.9 0 0 0 1.25-.2 4.02 4.02 0 0 1-3.2-3.92v-.05c.57.32 1.22.5 1.9.52a4.01 4.01 0 0 1-1.22-5.37A11.36 11.36 0 0 0 16.5 9c-.06-.31-.08-.63-.08-.96 0-2.2 1.76-3.98 3.95-3.98a3.93 3.93 0 0 1 2.87 1.24 7.82 7.82 0 0 0 2.51-.96 3.97 3.97 0 0 1-1.75 2.19 7.96 7.96 0 0 0 2.27-.61 8.09 8.09 0 0 1-1.97 2.04c.02.21.03.43.03.65 0 6.64-5.07 14.3-14.36 14.3a11.37 11.37 0 0 1-6.17-1.8c.41.05.83.07 1.26.07 2.36 0 4.54-.8 6.27-2.16z"/></svg>
                            Mit Apple anmelden
                        </button>
                        <button type="button" onclick="loginWithGoogle()" class="btn-social-google">
                            <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right: 8px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            Mit Google anmelden
                        </button>
                    </div>

                    <div class="modal-footer" style="margin-top: 15px; text-align: center; font-size: 13px;">
                        <span data-txt="modal-no-acc">Noch kein Konto?</span>
                        <a onclick="toggleAuthView('register')" data-txt="modal-link-reg" style="color: var(--accent-color); cursor: pointer; font-weight: 700;">Registrieren</a>
                    </div>
                </div>

                <div id="modal-register-view" style="display: none;">
                    <h3 data-txt="modal-reg-title">Konto erstellen</h3>
                    <form id="register-form">
                        <div class="form-group">
                            <label for="register-real-name" style="color: var(--info-color);">🔒 Echter Name * (Für Analysen)</label>
                            <input type="text" id="register-real-name" required placeholder="z.B. Max Mustermann">
                        </div>
                        <div class="form-group">
                            <label for="register-ipsc-alias" style="color: var(--success-color);">🛡️ IPSC Alias / Schützenname *</label>
                            <input type="text" id="register-ipsc-alias" required placeholder="z.B. GER1234 oder AlphaShooter">
                        </div>
                        <div class="form-group">
                            <label for="register-email" data-txt="lbl-email">E-Mail *</label>
                            <input type="email" id="register-email" required placeholder="name@beispiel.de">
                        </div>
                        <div class="form-group">
                            <label for="register-password">Passwort *</label>
                            <input type="password" id="register-password" required minlength="6" placeholder="Mindestens 6 Zeichen">
                        </div>
                        <div class="form-group" style="flex-direction: row; align-items: flex-start; gap: 10px; margin-top: 5px; margin-bottom: 20px;">
                            <input type="checkbox" id="register-agb" required style="margin-top: 3px; width: 16px; height: 16px; cursor: pointer;">
                            <label for="register-agb" style="font-size: 12px; color: var(--text-muted); font-weight: normal; line-height: 1.4; margin: 0; text-transform: none; letter-spacing: normal;">
                                Ich akzeptiere die AGB und Nutzungsbedingungen. Weitere Details findest du im <a href="/impressum.html" target="_blank" style="color: var(--accent-color); text-decoration: underline;">Impressum</a>. *
                            </label>
                        </div>
                        <button type="submit" class="btn-primary-auth" data-txt="modal-btn-reg">Konto erstellen</button>
                    </form>
                    <div class="modal-footer" style="margin-top: 15px; text-align: center; font-size: 13px;">
                        <span data-txt="modal-has-acc">Bereits registriert?</span>
                        <a onclick="toggleAuthView('login')" data-txt="modal-link-login" style="color: var(--accent-color); cursor: pointer; font-weight: 700;">Zum Login</a>
                    </div>
                </div>

                <div id="modal-forgot-view" style="display: none;">
                    <h3 data-txt="modal-forgot-title">Passwort vergessen</h3>
                    <form id="forgot-form">
                        <div class="form-group">
                            <label for="forgot-email" data-txt="lbl-email">Deine E-Mail-Adresse *</label>
                            <input type="email" id="forgot-email" required placeholder="name@beispiel.de">
                        </div>
                        <button type="submit" class="btn-primary-auth" data-txt="modal-btn-forgot">Zurücksetzungs-Link senden</button>
                    </form>
                    <div class="modal-footer" style="margin-top: 15px; text-align: center; font-size: 13px;">
                        <a onclick="toggleAuthView('login')" data-txt="modal-link-login" style="color: var(--accent-color); cursor: pointer; font-weight: 700;">Zurück zum Login</a>
                    </div>
                </div>

                <div id="modal-reset-view" style="display: none;">
                    <h3 data-txt="modal-reset-title">Neues Passwort vergeben</h3>
                    <form id="reset-password-form">
                        <div class="form-group">
                            <label for="reset-password-input" data-txt="lbl-new-password">Neues Passwort *</label>
                            <input type="password" id="reset-password-input" required minlength="6" placeholder="Mindestens 6 Zeichen">
                        </div>
                        <button type="submit" class="btn-primary-auth" data-txt="btn-save">Speichern</button>
                    </form>
                </div>

                <div id="modal-settings-view" style="display: none;">
                    <h3 data-txt="modal-settings-title">Konto-Einstellungen</h3>
                    
                    <div class="settings-stats-card" style="background-color: rgba(16, 185, 129, 0.08); padding: 16px; border-radius: var(--radius); border: 1px solid var(--border-color); margin-bottom: 20px;">
                        <span class="settings-stats-title" style="color: var(--success-color); font-weight: 700; margin-bottom: 8px; display: block;" data-txt="modal-settings-deals">📈 Erfolgreiche Vermittlungen</span>
                        <div class="settings-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; text-align: center;">
                            <div class="settings-stat-item" style="background: var(--card-bg); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                                <span class="settings-stat-val" style="color: var(--accent-color); font-size: 20px; font-weight: bold;" id="profile-sales-count">0</span>
                                <p class="settings-stat-lbl" style="font-size: 11px; margin: 4px 0 0 0; color: var(--text-muted);" data-txt="modal-settings-seller">Als Verkäufer</p>
                            </div>
                            <div class="settings-stat-item" style="background: var(--card-bg); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                                <span class="settings-stat-val" style="color: var(--success-color); font-size: 20px; font-weight: bold;" id="profile-purchases-count">0</span>
                                <p class="settings-stat-lbl" style="font-size: 11px; margin: 4px 0 0 0; color: var(--text-muted);" data-txt="modal-settings-buyer">Als Käufer</p>
                            </div>
                        </div>
                        
                        <div class="settings-ratings" style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-color); font-size: 12px; display: flex; flex-direction: column; gap: 4px; text-align: left;">
                            <div><span data-txt="modal-settings-comm">💬 Kommunikation:</span> <span id="profile-rating-comm" style="font-weight: bold; color: #ffca28;">-</span></div>
                            <div><span data-txt="modal-settings-pay">💳 Bezahlung:</span> <span id="profile-rating-pay" style="font-weight: bold; color: #ffca28;">-</span></div>
                        </div>
                    </div>

                    <div class="settings-passkey-card" style="background-color: rgba(52, 152, 219, 0.1); padding: 15px; border-radius: 6px; border: 1px solid rgba(52, 152, 219, 0.3); margin-bottom: 20px;">
                        <span class="settings-passkey-title" style="color: #3498db; font-weight: 600; display: block; margin-bottom: 4px;" data-txt="modal-settings-passkey-title">🔒 Passkey (Schnell-Login)</span>
                        <p class="help-text" style="font-size: 12px; margin-top: 0; color: var(--text-muted); line-height: 1.4;" data-txt="modal-settings-passkey-desc">Hinterlege dein aktuelles Gerät, um dich künftig ohne Passwort per FaceID, Fingerabdruck oder PIN einzuloggen.</p>
                        <button type="button" class="btn-primary-auth" style="width:100%; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; margin-top: 8px; border: none;" onclick="registerPasskey()" data-txt="modal-settings-passkey-btn">Gerät als Passkey registrieren</button>
                    </div>

                    <form id="settings-form">
                        
                        <div class="settings-realname-card" style="background-color: rgba(59, 130, 246, 0.04); padding: 16px; border-radius: 6px; border-left: 4px solid var(--info-color); margin-bottom: 20px; display: flex; flex-direction: column;">
                            <label for="settings-real-name" class="settings-realname-title" style="color: var(--info-color); font-weight: 700; margin-bottom: 4px;" data-txt="lbl-real-name">🔒 Echter Name (Für Analysen & Bot)</label>
                            <p class="help-text" style="font-size: 11px; margin-top: 0; margin-bottom: 8px; color: var(--text-muted); line-height: 1.4;" data-txt="lbl-real-name-desc">Trage hier deinen Klarnamen ein. Dieser Name wird niemals öffentlich auf der Seite gezeigt, sondern arbeitet nur im Hintergrund.</p>
                            <input type="text" id="settings-real-name" data-txt-ph="ph-real-name" placeholder="z.B. Max Mustermann">
                        </div>

                        <div class="settings-alias-card" style="background-color: rgba(16, 185, 129, 0.08); padding: 16px; border-radius: 6px; border-left: 4px solid var(--success-color); margin-bottom: 20px; display: flex; flex-direction: column;">
                            <label for="settings-ipsc-alias" class="settings-alias-title" style="color: var(--success-color); font-weight: 700; margin-bottom: 4px;" data-txt="lbl-ipsc-alias">🛡️ IPSC Alias / Schützenname</label>
                            <p class="help-text" style="font-size: 11px; margin-top: 0; margin-bottom: 8px; color: var(--text-muted); line-height: 1.4;" data-txt="lbl-ipsc-alias-desc">Dies ist dein öffentlicher Anzeigename in der Community! Füllst du hier deine IPSC-Nummer ein, erhältst du zusätzlich das "Trusted Shooter" Badge.</p>
                            <input type="text" id="settings-ipsc-alias" data-txt-ph="ph-ipsc-alias" placeholder="z.B. GER1234 oder AlphaShooter">
                        </div>

                        <div class="form-group">
                            <label for="settings-avatar" data-txt="lbl-profile-pic">Profilbild (Optional)</label>
                            <input type="file" id="settings-avatar" accept="image/*" onchange="previewSettingsAvatar(this)">
                            <img id="settings-avatar-preview" style="max-width: 100px; height: 100px; object-fit: cover; margin-top: 10px; border-radius: 50%; display: none;">
                        </div>
                        
                        <div class="form-group">
                            <label for="settings-password" data-txt="lbl-change-password">Neues Passwort ändern (Optional)</label>
                            <input type="password" id="settings-password" minlength="6" data-txt-ph="ph-password" placeholder="Mindestens 6 Zeichen">
                        </div>
                        
                        <button type="submit" class="btn-primary-auth" style="width:100%;" data-txt="btn-save">Änderungen speichern</button>
                    </form>
                    
                    <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">
                    <button class="btn-danger-block" id="btn-delete-account" data-txt="btn-delete-acc">Konto & alle Einträge unwiderruflich löschen</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", authModalHtml);
    }

    if (!document.getElementById("chat-modal")) {
        const chatModalHtml = `
        <div class="modal" id="chat-modal">
            <div class="modal-content" style="max-width: 500px; padding: 25px;">
                <div class="modal-close-container">
                    <button class="modal-close-trigger" id="btn-close-chat" onclick="closeChatSystem()">&times;</button>
                </div>
                <h3 id="chat-title-match" style="font-size: 18px; margin-bottom: 2px;">Chat</h3>
                <p id="chat-title-partner" style="font-size: 12px; color: var(--text-muted); margin-top:0; margin-bottom: 10px;">Gesprächspartner: -</p>
                <div class="chat-history-area" id="chat-box-messages"></div>
                <form id="chat-send-form" style="display: flex; gap: 8px;">
                    <input type="hidden" id="chat-edit-id" value="">
                    <input type="text" id="chat-message-input" required placeholder="Nachricht schreiben..." style="flex: 1; padding: 10px 14px;">
                    <button type="submit" id="btn-chat-send" class="btn-primary-auth" style="width: auto; margin-top: 0; padding: 10px 20px;">Senden</button>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", chatModalHtml);
    }

    if (!document.getElementById("global-inbox-modal")) {
        const inboxModalHtml = `
        <div class="modal" id="global-inbox-modal">
            <div class="modal-content" style="max-width: 450px; padding: 25px;">
                <div class="modal-close-container">
                    <button class="modal-close-trigger" onclick="document.getElementById('global-inbox-modal').style.display = 'none';">&times;</button>
                </div>
                <h3>Meine Nachrichten</h3>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 0; margin-bottom: 15px;">Hier findest du alle deine aktiven Gespräche.</p>
                <div id="global-inbox-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 350px; overflow-y: auto;">
                    <p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Keine aktiven Nachrichten gefunden.</p>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", inboxModalHtml);
    }
})(); // Injektion läuft

// =========================================================================
// ZENTRALE SEITEN-INITIALISIERUNG FÜR DIE SPA (ROUTER)
// =========================================================================
function initCurrentPage() {
    // ---- MARKTPLATZ LOGIK ----
    if (document.getElementById("match-container")) {
        enforceFutureDates();
        checkPlannerImport();
        fetchMatches();
    }
    
    // ---- MEIN PLANER LOGIK ----
    if (document.getElementById("planner-section")) {
        if (window.currentUser) {
            document.getElementById('logged-out-section').style.display = 'none';
            document.getElementById('planner-section').style.display = 'block';
            window.loadMatchesFromSupabase();
        } else {
            document.getElementById('logged-out-section').style.display = 'block';
            document.getElementById('planner-section').style.display = 'none';
            document.getElementById('match-list').innerHTML = '';
        }
    }

    // ---- COMMUNITY LOGIK ----
    if (document.getElementById("feed-section")) {
        if (window.currentUser) {
            document.getElementById('logged-out-msg').style.display = 'none';
            const hasUsername = window.currentUser.user_metadata?.username && window.currentUser.user_metadata.username.trim() !== "";
            if (!hasUsername) {
                document.getElementById('username-setup-section').style.display = 'block';
                document.getElementById('feed-section').style.display = 'none';
                document.getElementById('groups-section').style.display = 'none';
            } else {
                document.getElementById('username-setup-section').style.display = 'none';
                if (window.currentActiveTabId === 'feed') {
                    document.getElementById('feed-section').style.display = 'block';
                    document.getElementById('groups-section').style.display = 'none';
                } else {
                    document.getElementById('feed-section').style.display = 'none';
                    document.getElementById('groups-section').style.display = 'block';
                }
                window.loadPosts();
            }
        } else {
            document.getElementById('logged-out-msg').style.display = 'block';
            document.getElementById('username-setup-section').style.display = 'none';
            document.getElementById('feed-section').style.display = 'none';
            document.getElementById('groups-section').style.display = 'none';
        }
    }
}

// Wird getriggert, wenn der Router eine neue Seite fertig reinkopiert hat
document.addEventListener("pageLoaded", initCurrentPage);

document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = document.getElementById("btn-close-modal");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("auth-modal").style.display = "none";
            const title = document.querySelector("#modal-settings-view h3");
            if (title) title.innerText = "Konto-Einstellungen";
            const elementsToHide = [
                document.querySelector("#modal-settings-view div[style*='3498db']"),
                document.getElementById("settings-password")?.closest(".form-group"),
                document.querySelector("#modal-settings-view button[type='submit']"),
                document.getElementById("btn-delete-account"),
                document.getElementById("settings-avatar")?.closest(".form-group")
            ];
            elementsToHide.forEach(el => { if(el) el.style.display = "block"; });
            
            const rnInput = document.getElementById("settings-real-name");
            const aliasInput = document.getElementById("settings-ipsc-alias");
            if (rnInput) rnInput.readOnly = false;
            if (aliasInput) aliasInput.readOnly = false;
        });
    }

    if (typeof window.translatePortalPage === "function") {
        window.translatePortalPage();
    }
    
    // Erstes Laden
    initCurrentPage();
});

// =========================================================================
// EVENT DELEGATION (Fängt Klicks etc. ab, egal ob die Seite neu geladen wurde)
// =========================================================================
document.addEventListener("click", (e) => {
  if (e.target && e.target.closest("#btn-cancel-edit")) {
    resetFormState();
  }
});

document.addEventListener("submit", async (e) => {
  if (e.target && e.target.id === "match-form") {
    e.preventDefault();
    if (!window.currentUser) return alert(window.currentLang === "en" ? "Please log in." : "Bitte melde dich an.");
    
    const inputDate = document.getElementById("match-date").value;
    const todayStr = new Date().toISOString().split("T")[0];
    
    if (inputDate < todayStr) {
      alert(window.currentLang === "en" ? "Error: Match date cannot be in the past!" : "Fehler: Das Match-Datum darf nicht in der Vergangenheit liegen!");
      return;
    }

    const matchName = document.getElementById("match-name").value;
    let spamCheck = window.supabaseClient
        .from("matches")
        .select("id")
        .eq("seller_email", window.currentUser.email)
        .eq("match_name", matchName)
        .eq("match_date", inputDate);
        
    if (window.editingMatchId !== null) { 
        spamCheck = spamCheck.neq("id", window.editingMatchId); 
    }

    const { data: duplicateEntries, error: spamError } = await spamCheck;
    if (spamError) return alert((window.currentLang === "en" ? "Spam check error: " : "Fehler bei der Spam-Prüfung: ") + spamError.message);
    if (duplicateEntries && duplicateEntries.length > 0) return alert(window.translations[window.currentLang]["spam-error"]);

    const matchData = {
      match_name: matchName,
      match_level: document.getElementById("match-level").value,
      match_date: inputDate,
      match_location: document.getElementById("match-location").value,
      match_country: document.getElementById("match-country").value,
      match_price: document.getElementById("match-price").value,
      seller_email: window.currentUser.email,
      type: document.getElementById("type-want").checked ? "want" : "offer",
      author_name: window.currentUser.user_metadata?.username || window.currentUser.email.split('@')[0],
      author_avatar: window.currentUser.user_metadata?.avatar_url || '',
      author_ipsc_alias: window.currentUser.user_metadata?.ipsc_alias || ''
    };
    
    matchData.match_squad = document.getElementById("match-squad").value || null;

    if (window.editingMatchId !== null) {
      const { error } = await window.supabaseClient.from("matches").update(matchData).eq("id", window.editingMatchId);
      if (error) alert((window.currentLang === "en" ? "Error updating: " : "Fehler beim Aktualisieren: ") + error.message);
    } else {
      const { error } = await window.supabaseClient.from("matches").insert([matchData]);
      if (error) alert((window.currentLang === "en" ? "Error creating: " : "Fehler beim Erstellen: ") + error.message);
    }

    resetFormState();
    fetchMatches();
    
    if (window.history.replaceState) {
      const url = new URL(window.location);
      url.search = '';
      window.history.replaceState({}, document.title, url);
    }
  }
});

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "filter-type-select") {
    const type = e.target.value;
    if (type === "all") renderMatches(cachedMatches);
    else renderMatches(cachedMatches.filter(m => m.type === type));
  }
});


// =========================================================================
// MARKTPLATZ & ALLGEMEINE LOGIK
// =========================================================================
function enforceFutureDates() {
  const dateInput = document.getElementById("match-date");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
  }
}

async function fetchMatches() {
  const { data, error } = await window.supabaseClient
    .from("matches")
    .select(`*, seller_profile:seller_email (ipsc_alias)`)
    .order("match_date", { ascending: true });
    
  if (error) {
    const { data: fallbackData } = await window.supabaseClient.from("matches").select("*").order("match_date", { ascending: true });
    cachedMatches = fallbackData || [];
  } else {
      cachedMatches = data || [];
  }
  
  const todayStr = new Date().toISOString().split("T")[0];
  cachedMatches = cachedMatches.filter(m => m.match_date >= todayStr);
  renderMatches(cachedMatches);
}

function renderMatches(matches) {
  const container = document.getElementById("match-container");
  if (!container) return;

  if (!matches.length) { 
    container.innerHTML = `<p>${window.translations[window.currentLang]["no-slots"]}</p>`; 
    return; 
  }
  
  window.supabaseClient.from('profiles').select('email, ipsc_alias').then(({data: profiles}) => {
      let aliasMap = {};
      if(profiles) profiles.forEach(p => { aliasMap[p.email] = p.ipsc_alias; });

      container.innerHTML = matches.map(m => {
        const isWant = m.type === "want";
        const levelBadge = m.match_level ? `<span class="badge" style="background:#555; color:#fff; padding:2px 5px; border-radius:3px;">${window.escapeHtml(m.match_level)}</span>` : "";
        const squadBadge = m.match_squad ? `<span class="badge" style="background:#3498db; color:#fff; padding:2px 5px; border-radius:3px;">Squad ${window.escapeHtml(m.match_squad)}</span>` : "";
        const countryBadge = m.match_country ? `<span class="badge" style="background:#8e44ad; color:#fff; padding:2px 5px; border-radius:3px;">${window.escapeHtml(m.match_country)}</span>` : "";

        const isSender = window.currentUser && window.currentUser.email === m.seller_email;
        const isAdmin = window.currentUser && window.currentUser.email === "fabian-schoeps@gmx.de";
        const canManage = isSender || isAdmin;

        let sellerAlias = null;
        if(isSender && window.currentUser.user_metadata?.ipsc_alias) sellerAlias = window.currentUser.user_metadata.ipsc_alias;
        else if (aliasMap[m.seller_email]) sellerAlias = aliasMap[m.seller_email];
        else if (m.seller_profile && m.seller_profile.ipsc_alias) sellerAlias = m.seller_profile.ipsc_alias;
        else if (m.author_ipsc_alias) sellerAlias = m.author_ipsc_alias;

        const trustedBadge = (sellerAlias && sellerAlias.trim() !== "") 
            ? `<span class="badge" style="background:var(--success-color); color:#fff; padding:2px 6px; border-radius:3px; display:inline-flex; align-items:center; gap:4px;" title="Verifizierter IPSC Alias: ${window.escapeHtml(sellerAlias)}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Trusted</span>` : "";

        const cleanMatchName = m.match_name.replace(/"/g, '&quot;').replace(/'/g, "\\'");
        const contactBtnClass = isWant ? "btn-contact btn-contact-want" : "btn-contact";
        const contactText = isWant ? window.translations[window.currentLang]["btn-contact-want"] : window.translations[window.currentLang]["btn-request"];

        const authorName = m.author_name || m.seller_email.split('@')[0];
        const authorAvatar = m.author_avatar || '';
        
        const avatarHtml = authorAvatar 
            ? `<img src="${authorAvatar}" class="card-avatar" onclick="openUserProfile('${m.seller_email}', '${window.escapeHtml(authorName)}', '${authorAvatar}', '${window.escapeHtml(sellerAlias || '')}')" title="Profil von ${window.escapeHtml(authorName)} ansehen">`
            : `<div class="avatar-placeholder-flex" onclick="openUserProfile('${m.seller_email}', '${window.escapeHtml(authorName)}', '${authorAvatar}', '${window.escapeHtml(sellerAlias || '')}')" title="Profil von ${window.escapeHtml(authorName)} ansehen">${window.escapeHtml(authorName.charAt(0).toUpperCase())}</div>`;

        return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
          <div class="match-details">
            <div class="match-header-flex">${avatarHtml}
              <div><h3 style="margin: 0;">${window.escapeHtml(m.match_name)} ${levelBadge} ${squadBadge} ${countryBadge}<span class="badge">${isWant ? window.translations[window.currentLang]["tag-want"] : window.translations[window.currentLang]["tag-offer"]}</span>${trustedBadge}</h3>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-muted);">Inseriert von: <span style="color: var(--accent-color); font-weight: 600; cursor: pointer;" onclick="openUserProfile('${m.seller_email}', '${window.escapeHtml(authorName)}', '${authorAvatar}', '${window.escapeHtml(sellerAlias || '')}')">${window.escapeHtml(authorName)}</span></p>
              </div>
            </div>
            <p style="margin-top: 12px;">${m.match_date} | ${window.escapeHtml(m.match_location)}</p>
          </div>
          <div class="card-actions">
            <p>${parseFloat(m.match_price).toFixed(2)} €</p>
            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                <button class="${contactBtnClass}" onclick="openChatSystem(${m.id}, '${m.seller_email}', '${cleanMatchName}')">💬 Live-Chat</button>
                <button class="${contactBtnClass}" style="background-color: #555;" onclick="handleContactClick('${m.seller_email}', '${cleanMatchName}', '${m.type}')">✉️ ${contactText}</button>
            </div>
            <div class="action-buttons-group">
                <button class="btn-export" onclick="exportToIcs(${m.id})">${window.translations[window.currentLang]["btn-export"]}</button>
                <button class="btn-report" onclick="reportMatch(${m.id})">${window.translations[window.currentLang]["report-btn"]}</button>
            </div>
            ${canManage ? `<div class="action-buttons-group"><button class="btn-mediated" onclick="triggerMediatedModal(${m.id})">Erfolgreich vermittelt</button></div><div class="action-buttons-group"><button class="btn-edit" onclick="handleEditClick(${m.id})">${window.translations[window.currentLang]["btn-edit"]}</button><button class="btn-delete" onclick="handleDelete(${m.id}, '${m.seller_email}')">${window.translations[window.currentLang]["btn-delete"]}</button></div>` : ""}
          </div>
        </div>`;
      }).join("");
  }).catch(() => {
      container.innerHTML = matches.map(m => {
        const isWant = m.type === "want";
        const cleanMatchName = m.match_name.replace(/"/g, '&quot;').replace(/'/g, "\\'");
        return `<div class="match-card ${isWant ? "card-want" : "card-offer"}"><div class="match-details"><h3>${window.escapeHtml(m.match_name)}</h3><p>${m.match_date} | ${window.escapeHtml(m.match_location)}</p></div><div class="card-actions"><p>${parseFloat(m.match_price).toFixed(2)} €</p><button class="btn-contact" onclick="handleContactClick('${m.seller_email}', '${cleanMatchName}', '${m.type}')">Kontakt</button></div></div>`;
      }).join("");
  });
}

function handleContactClick(email, matchName, type) {
  if (!window.currentUser) { alert(window.translations[window.currentLang]["login-required"]); return; }
  const conf = confirm(window.translations[window.currentLang]["security-notice"] + window.translations[window.currentLang]["security-checklist"]);
  if (!conf) return;
  const subjectPrefix = type === "want" ? window.translations[window.currentLang]["email-subject-want"] : window.translations[window.currentLang]["email-subject-offer"];
  const bodyPrefix = type === "want" ? window.translations[window.currentLang]["email-body-want"] : window.translations[window.currentLang]["email-body-offer"];
  const subject = encodeURIComponent(subjectPrefix + matchName);
  const body = encodeURIComponent(bodyPrefix + matchName + window.translations[window.currentLang]["email-body-footer"]);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}
window.handleContactClick = handleContactClick;

async function openChatSystem(matchId, receiverEmail, matchName) {
  if (!window.currentUser) return alert(window.currentLang === "en" ? "Please log in to chat." : "Bitte logge dich ein, um den Live-Chat zu nutzen.");
  if (window.currentUser.email.toLowerCase() === receiverEmail.toLowerCase()) return alert(window.currentLang === "en" ? "You cannot start a chat with yourself." : "Du kannst keinen Chat mit dir selbst starten.");
  window.activeChatRoom = { matchId, receiverEmail, matchName };
  const chatModal = document.getElementById("chat-modal");
  if (chatModal) chatModal.style.display = "flex";
  document.getElementById("chat-title-match").innerText = "Match: " + matchName;
  document.getElementById("chat-title-partner").innerText = (window.currentLang === "en" ? "Chat partner: " : "Gesprächspartner: ") + receiverEmail;
  const box = document.getElementById("chat-box-messages");
  if (box) box.innerHTML = `<p style="color:var(--text-muted); font-style:italic;">${window.currentLang === "en" ? "Loading messages..." : "Lade Chat-Verlauf..."}</p>`;
  const editIdInput = document.getElementById("chat-edit-id");
  if (editIdInput) editIdInput.value = "";
  const msgInput = document.getElementById("chat-message-input");
  if (msgInput) msgInput.value = "";
  const sendBtn = document.getElementById("btn-chat-send");
  if (sendBtn) sendBtn.innerText = window.currentLang === "en" ? "Send" : "Senden";
  await loadChatMessages();
}
window.openChatSystem = openChatSystem;

async function loadChatMessages() {
  if (!window.activeChatRoom || !window.currentUser) return;
  const box = document.getElementById("chat-box-messages");
  if (!box) return;
  const { data: messages, error } = await window.supabaseClient.from("chat_messages").select("*").eq("match_id", window.activeChatRoom.matchId)
    .or(`and(sender_email.eq.${window.currentUser.email},receiver_email.eq.${window.activeChatRoom.receiverEmail}),and(sender_email.eq.${window.activeChatRoom.receiverEmail},receiver_email.eq.${window.currentUser.email})`)
    .order("created_at", { ascending: true });
  if (error) { console.error("Fehler beim Laden:", error); box.innerHTML = ""; return; }
  box.innerHTML = "";
  if (messages && messages.length > 0) {
    messages.forEach(msg => {
      const isMe = msg.sender_email.toLowerCase() === window.currentUser.email.toLowerCase();
      let metaHtml = "";
      if (isMe) {
         metaHtml = `<div class="chat-bubble-meta" style="justify-content: flex-end;"><span class="chat-action-link" onclick="editChatMessage(${msg.id}, '${msg.message.replace(/'/g, "\\'")}')">✏️ ${window.currentLang === 'en' ? 'Edit' : 'Bearbeiten'}</span><span class="chat-action-link delete" onclick="deleteChatMessage(${msg.id})">🗑️ ${window.currentLang === 'en' ? 'Delete' : 'Löschen'}</span></div>`;
      } else {
         metaHtml = `<div class="chat-bubble-meta"><span class="chat-action-link" style="color: var(--danger-color);" onclick="reportChatMessage(${msg.id})">⚠️ ${window.currentLang === 'en' ? 'Report' : 'Melden'}</span></div>`;
      }
      box.innerHTML += `<div class="chat-bubble-container" id="msg-container-${msg.id}"><div class="chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}">${window.escapeHtml(msg.message)}</div>${metaHtml}</div>`;
    });
  }
  box.scrollTop = box.scrollHeight;
}

window.editChatMessage = function(id, text) {
  const editIdInput = document.getElementById("chat-edit-id");
  const msgInput = document.getElementById("chat-message-input");
  const sendBtn = document.getElementById("btn-chat-send");
  if (editIdInput) editIdInput.value = id;
  if (msgInput) { msgInput.value = text; msgInput.focus(); }
  if (sendBtn) sendBtn.innerText = window.currentLang === "en" ? "Save" : "Speichern";
};

window.deleteChatMessage = async function(id) {
  if (!confirm(window.currentLang === "en" ? "Delete this message?" : "Möchtest du diese Nachricht wirklich löschen?")) return;
  const { error } = await window.supabaseClient.from("chat_messages").delete().eq("id", id);
  if (error) alert("Fehler: " + error.message);
  else await loadChatMessages();
};

window.reportChatMessage = function(id) {
  const subject = encodeURIComponent("Chat-Meldung: Nachricht ID " + id);
  const body = encodeURIComponent("Hallo Support,\n\nich möchte die Chat-Nachricht mit der ID " + id + " wegen eines Richtlinienverstoßes melden.\n\nGrund:\n");
  window.location.href = `mailto:info@ipscboerse.com?subject=${subject}&body=${body}`;
};

function closeChatSystem() { window.activeChatRoom = null; document.getElementById("chat-modal").style.display = "none"; }
window.closeChatSystem = closeChatSystem;

window.triggerChatEmailReminder = function() {
  if (!window.activeChatRoom) return;
  const partnerEmail = window.activeChatRoom.receiverEmail;
  const matchName = window.activeChatRoom.matchName;
  const subject = encodeURIComponent("Ungelesene Chat-Nachricht auf ipscboerse.com");
  const body = encodeURIComponent(`Hallo,\n\nich habe dir gerade eine Nachricht im Live-Chat auf ipscboerse.com bezüglich des Matches "${matchName}" hinterlassen.\n\nBitte schaue kurz in den Chat auf der Plattform rein, um mir zu antworten.\n\nViele Grüße`);
  window.location.href = `mailto:${partnerEmail}?subject=${subject}&body=${body}`;
};

window.toggleGlobalInbox = async function() {
  if (!window.currentUser) return alert(window.currentLang === "en" ? "Please log in to see your messages." : "Bitte logge dich ein, um deine Nachrichten zu sehen.");
  const modal = document.getElementById("global-inbox-modal");
  if (!modal) return;
  if (modal.style.display === "flex") { modal.style.display = "none"; return; }
  modal.style.display = "flex";
  window.lastChatCheckedTimestamp = new Date().toISOString();
  localStorage.setItem("lastChatChecked", window.lastChatCheckedTimestamp);
  updateHeaderChatBadge(); 
  const listContainer = document.getElementById("global-inbox-list");
  listContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Lade Gespräche...</p>`;
  const { data: allMsgs, error } = await window.supabaseClient.from("chat_messages").select("*")
    .or(`sender_email.eq.${window.currentUser.email},receiver_email.eq.${window.currentUser.email}`).order("created_at", { ascending: false });
  if (error || !allMsgs || allMsgs.length === 0) { listContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Keine aktiven Nachrichten gefunden.</p>`; return; }
  let uniqueChats = {};
  allMsgs.forEach(msg => {
    const partner = msg.sender_email.toLowerCase() === window.currentUser.email.toLowerCase() ? msg.receiver_email : msg.sender_email;
    const key = `${msg.match_id}_${partner.toLowerCase()}`;
    if (!uniqueChats[key]) uniqueChats[key] = { matchId: msg.match_id, matchName: msg.match_name, partnerEmail: partner, lastMessage: msg.message };
  });
  listContainer.innerHTML = Object.values(uniqueChats).map(c => {
    return `<div style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius); cursor: pointer; transition: border-color 0.15s;" onclick="document.getElementById('global-inbox-modal').style.display='none'; openChatSystem(${c.matchId}, '${c.partnerEmail}', '${c.matchName.replace(/'/g, "\\'")}')"><strong style="font-size: 13px; display: block; color: var(--accent-color);">${window.escapeHtml(c.matchName)}</strong><span style="font-size: 11px; color: var(--text-muted); display: block; margin: 2px 0;">Mit: ${window.escapeHtml(c.partnerEmail)}</span><p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.escapeHtml(c.lastMessage)}</p></div>`;
  }).join("");
};

function updateHeaderChatBadge() {
  if (!window.currentUser) return;
  window.supabaseClient.from("chat_messages").select("id", { count: 'exact' }).eq("receiver_email", window.currentUser.email).gt("created_at", window.lastChatCheckedTimestamp).then(({ count, error }) => {
       const badge = document.getElementById("chat-badge-count");
       if (badge) { if (!error && count > 0) { badge.innerText = count; badge.style.display = "block"; } else { badge.style.display = "none"; } }
    });
}

setTimeout(() => {
  updateHeaderChatBadge();
  if (window.supabaseClient) {
    window.supabaseClient.channel('public:chat_messages').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
          updateHeaderChatBadge();
          if (!window.activeChatRoom || !window.currentUser) return;
          if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") { loadChatMessages(); return; }
          const newMsg = payload.new;
          const matchMatch = newMsg.match_id == window.activeChatRoom.matchId;
          const participantMatch = (newMsg.sender_email.toLowerCase() === window.currentUser.email.toLowerCase() && newMsg.receiver_email.toLowerCase() === window.activeChatRoom.receiverEmail.toLowerCase()) ||
                                   (newMsg.sender_email.toLowerCase() === window.activeChatRoom.receiverEmail.toLowerCase() && newMsg.receiver_email.toLowerCase() === window.currentUser.email.toLowerCase());
          if (matchMatch && participantMatch) loadChatMessages();
      }).subscribe();
  }
}, 1000);

window.exportToIcs = function(id) {
  const match = cachedMatches.find(m => m.id === id);
  if (!match) return;
  const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${match.match_name}\nDTSTART:${match.match_date.replace(/-/g, '')}T080000Z\nLOCATION:${match.match_location}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${match.match_name.replace(/\s+/g, '_')}.ics`; a.click(); window.URL.revokeObjectURL(url);
};

window.reportMatch = function(id) {
  if (!window.currentUser) { alert(window.translations[window.currentLang]["login-required"]); return; }
  const subject = encodeURIComponent("Melde-Anzeige: Eintrag ID " + id);
  const body = encodeURIComponent("Hallo Administratoren,\n\nich möchte folgenden Eintrag melden: " + window.location.origin + "/?id=" + id + "\n\nGrund der Meldung:\n");
  window.location.href = `mailto:info@ipscboerse.com?subject=${subject}&body=${body}`;
};

window.handleEditClick = function(id) {
  const match = cachedMatches.find(m => m.id === id);
  if (!match) return;
  window.editingMatchId = id;
  document.getElementById("match-name").value = match.match_name; document.getElementById("match-level").value = match.match_level;
  document.getElementById("match-date").value = match.match_date; document.getElementById("match-location").value = match.match_location;
  document.getElementById("match-country").value = match.match_country || "DE"; document.getElementById("match-squad").value = match.match_squad || "";
  document.getElementById("match-price").value = match.match_price;
  if (match.type === "want") { document.getElementById("type-want").checked = true; } else { document.getElementById("type-offer").checked = true; }
  document.getElementById("form-section-title").innerText = window.translations[window.currentLang]["form-title-edit"];
  document.getElementById("btn-submit-ad").innerText = window.translations[window.currentLang]["btn-save-edit"];
  document.getElementById("btn-cancel-edit").style.display = "inline-block";
  document.getElementById("form-anchor").scrollIntoView({ behavior: "smooth" });
};

window.handleDelete = async function(id, sellerEmail) {
  const isAdmin = window.currentUser && window.currentUser.email === "fabian-schoeps@gmx.de";
  const isOwner = window.currentUser && window.currentUser.email === sellerEmail;
  if (!isOwner && !isAdmin) { return alert(window.currentLang === "en" ? "Error: Unauthorized." : "Fehler: Unberechtigt."); }
  const textAdmin = window.currentLang === "en" ? "Do you want to permanently delete this entry as an ADMIN?" : "Möchtest du diesen fremden Eintrag als ADMIN unwiderruflich löschen?";
  const textUser = window.currentLang === "en" ? "Do you really want to permanently delete this entry?" : "Möchtest du diesen Eintrag wirklich unwiderruflich löschen?";
  const text = isAdmin && !isOwner ? textAdmin : textUser;
  if (!confirm(text)) return;
  await window.supabaseClient.from("matches").delete().eq("id", id);
  if (window.editingMatchId === id) resetFormState();
  fetchMatches();
};

function resetFormState() {
  window.editingMatchId = null;
  document.getElementById("match-form").reset();
  document.getElementById("form-section-title").innerText = window.translations[window.currentLang]["form-title"];
  document.getElementById("btn-submit-ad").innerText = window.translations[window.currentLang]["btn-insert"];
  document.getElementById("btn-cancel-edit").style.display = "none";
  enforceFutureDates();
}

function checkPlannerImport() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('from_planner') === 'true') {
    const name = urlParams.get('name'); const date = urlParams.get('date'); const location = urlParams.get('location');
    if (name && document.getElementById("match-name")) document.getElementById("match-name").value = name;
    if (date && document.getElementById("match-date")) document.getElementById("match-date").value = date;
    if (location && document.getElementById("match-location")) document.getElementById("match-location").value = location;
    const formAnchor = document.getElementById("form-anchor");
    if (formAnchor) setTimeout(() => { formAnchor.scrollIntoView({ behavior: "smooth" }); }, 300);
  }
}

async function loadUserSettingsProfile() {
  if (!window.currentUser) return;
  const { data: profile, error } = await window.supabaseClient.from("profiles").select("username, ipsc_alias, real_name").eq("id", window.currentUser.id).single();
  if (!error && profile) {
    const aliasInput = document.getElementById("settings-ipsc-alias"); const rnInput = document.getElementById("settings-real-name");
    if (!aliasInput || !rnInput) { setTimeout(loadUserSettingsProfile, 100); return; }
    aliasInput.value = profile.ipsc_alias || ""; rnInput.value = profile.real_name || "";
  }
}

// Auth State Wrapper
const originalOnAuthChange = window.onAuthChange;
window.onAuthChange = (user) => {
  if (typeof originalOnAuthChange === "function") originalOnAuthChange(user);
  loadUserSettingsProfile();
  initCurrentPage(); // Trigger view updates instantly!
};


// =========================================================================
// MEIN PLANER LOGIK
// =========================================================================
window.myMatches = [];

window.loadMatchesFromSupabase = async function() {
    if (!window.currentUser) return;
    const { data, error } = await window.supabaseClient.from('user_matches').select('*').order('match_date', { ascending: true });
    if (error) { console.error("Fehler beim Laden:", error); return; }
    window.myMatches = data || [];
    window.renderPlannerMatches();
};

window.addMatch = async function() {
    const name = document.getElementById('match-name').value.trim();
    const date = document.getElementById('match-date').value;
    const location = document.getElementById('match-location').value.trim();
    if (!name || !date) { alert("Match-Name und Datum sind Pflichtfelder."); return; }
    const { error = null } = await window.supabaseClient.from('user_matches').insert([{ user_id: window.currentUser.id, match_name: name, match_date: date, match_location: location }]);
    if (error) { alert("Fehler beim Speichern: " + error.message); return; }
    document.getElementById('match-name').value = ''; document.getElementById('match-date').value = ''; document.getElementById('match-location').value = '';
    window.loadMatchesFromSupabase();
};

window.deletePlannerMatch = async function(id) {
    const { error } = await window.supabaseClient.from('user_matches').delete().eq('id', id);
    if (!error) window.loadMatchesFromSupabase();
};

window.renderPlannerMatches = function() {
    const container = document.getElementById('match-list');
    if (!container) return;
    container.innerHTML = '';
    if (window.myMatches.length === 0) { container.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-weight: 600;" data-txt="planner-no-matches">Noch keine Matches eingetragen.</p>'; return; }
    
    window.myMatches.forEach(match => {
        const dateObj = new Date(match.match_date);
        const displayDate = dateObj.toLocaleDateString('de-DE');
        const safeName = encodeURIComponent(match.match_name);
        const safeLocation = encodeURIComponent(match.match_location || '');
        let matchTitleHtml = window.escapeHtml(match.match_name);
        if (match.match_url) matchTitleHtml = `<a href="${window.escapeHtml(match.match_url)}" target="_blank" rel="noopener noreferrer">${window.escapeHtml(match.match_name)} 🔗</a>`;
        let badgesHtml = '';
        if (match.auto_imported) badgesHtml += `<span class="badge badge-bot">🤖 Auto-Import</span>`;
        if (match.status) {
            const statusLower = match.status.toLowerCase();
            if (statusLower.includes('approved') || statusLower.includes('bestätigt')) badgesHtml += `<span class="badge badge-approved">Approved</span>`;
            else if (statusLower.includes('warteliste') || statusLower.includes('waiting')) badgesHtml += `<span class="badge badge-warteliste">Warteliste</span>`;
            else badgesHtml += `<span class="badge badge-pending">${window.escapeHtml(match.status)}</span>`;
        }
        if (match.squad && match.squad !== 'TBD') badgesHtml += `<span class="badge badge-squad">${window.escapeHtml(match.squad)}</span>`;
        
        container.innerHTML += `
            <div class="match-item">
                <div><h4>${matchTitleHtml} ${badgesHtml}</h4><p>📅 ${displayDate} | 📍 ${window.escapeHtml(match.match_location || '-')}</p></div>
                <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px; flex-wrap: wrap;">
                    <button onclick="inserierenAufMarktplatz('${safeName}', '${match.match_date}', '${safeLocation}')" style="background: var(--accent-gradient); color: #fff; border: none; border-radius: var(--radius); width: auto; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 159, 67, 0.3);">📢 Inserieren</button>
                    <button onclick="deletePlannerMatch(${match.id})" class="delete-btn">Löschen</button>
                </div>
            </div>`;
    });
};

window.inserierenAufMarktplatz = function(name, date, location) {
    const params = new URLSearchParams({ from_planner: 'true', name: decodeURIComponent(name), date: date, location: decodeURIComponent(location) });
    window.location.href = 'marktplatz.html?' + params.toString();
};

window.exportToCalendar = function() {
    if (window.myMatches.length === 0) { alert("Keine Matches zum Exportieren."); return; }
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//IPSC Boerse//Wettkampfplaner//DE\nCALSCALE:GREGORIAN\n";
    window.myMatches.forEach(match => {
        const dateStr = match.match_date.replace(/-/g, '');
        icsContent += "BEGIN:VEVENT\nDTSTART;VALUE=DATE:${dateStr}\n";
        const endDate = new Date(match.match_date); endDate.setDate(endDate.getDate() + 1);
        const endStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
        icsContent += `DTEND;VALUE=DATE:${endStr}\nSUMMARY:${match.match_name}\n`;
        if(match.match_location) icsContent += `LOCATION:${match.match_location}\n`;
        icsContent += "DESCRIPTION:Wettkampf eingetragen über ipscboerse.com\nEND:VEVENT\n";
    });
    icsContent += "END:VCALENDAR";
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'meine_ipsc_matches.ics';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};


// =========================================================================
// COMMUNITY LOGIK
// =========================================================================
window.ADMIN_EMAIL = 'fabian-schoeps@gmx.de';
window.currentActiveTabId = 'feed';

window.checkTextForBadWords = function(text) {
    if (!text) return false;
    let cleanText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");
    const blacklist = ["arsch", "arschloch", "arschkriecher", "asozial", "bastard", "depp", "ficker", "fotze", "hurensohn", "hure", "idiot", "miststueck", "miststück", "nutte", "schlampe", "schwachkopf", "wichser", "wixxer", "vollidiot", "spasti", "missgeburt", "pisser", "vogel", "hanswurst", "nazi", "hitler", "neger", "kanake", "schwuchtel", "fascho", "antifa", "terrorist", "juden", "zionist", "heil hitler", "jude", "casino", "slots", "poker", "bitcoin", "crypto", "kryptowaehrung", "kryptowährung", "geld verdienen", "schnelles geld", "reich werden", "investieren", "dividende", "aktien", "whatsapp", "telegram", "gewinnspiel", "jackpot", "bonuscode", "sex", "porn", "porno", "erotik", "cam", "webcam", "dating", "singles", "ficken", "milf", "geile", "nackt", "onlyfans", "sugar daddy", "escort", "xxx", "hentai", "hack", "warez", "crack", "phishing", "betrug", "scam", "gefaelscht", "gefälscht", "ausweis kaufen", "pass kaufen", "geldwaesche", "geldwäsche", "paypal betrug", "kredit ohne schufa"];
    let hasMatch = blacklist.some(word => cleanText.includes(word));
    if (hasMatch) return true;
    let tightText = cleanText.replace(/\s+/g, "");
    return blacklist.some(word => tightText.includes(word));
};

window.switchTab = function(tab) {
    if (window.currentUser && (!window.currentUser.user_metadata?.username || window.currentUser.user_metadata.username.trim() === "")) return;
    window.currentActiveTabId = tab;
    document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
    document.getElementById('feed-section').style.display = 'none';
    document.getElementById('groups-section').style.display = 'none';
    if(tab === 'feed') {
        document.getElementById('tab-feed-btn').classList.add('active');
        if (window.currentUser) document.getElementById('feed-section').style.display = 'block';
    } else {
        document.getElementById('tab-groups-btn').classList.add('active');
        if (window.currentUser) document.getElementById('groups-section').style.display = 'block';
    }
};

window.saveInitialUsername = async function() {
    const newUsername = document.getElementById('initial-username').value.trim();
    if (!newUsername || newUsername.length < 3) { alert("Bitte gib einen Schützennamen ein (mindestens 3 Zeichen)."); return; }
    const { error } = await window.supabaseClient.auth.updateUser({ data: { username: newUsername } });
    if (error) alert("Fehler beim Speichern: " + error.message);
    else { alert("Erfolgreich gespeichert! Willkommen in der Community."); location.reload(); }
};

window.loadPosts = async function() {
    if (!window.currentUser) return;
    const container = document.getElementById('posts-container');
    if (!container) return;
    const { data, error } = await window.supabaseClient.from('community_posts').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) { container.innerHTML = 'Fehler beim Laden.'; return; }
    container.innerHTML = '';
    if(data.length === 0) { container.innerHTML = '<p style="text-align:center; color:#888;">Noch keine Beiträge. Mach den Anfang!</p>'; return; }

    data.forEach(post => {
        const dateObj = new Date(post.created_at);
        const displayDate = dateObj.toLocaleDateString('de-DE') + ' ' + dateObj.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
        const isAdmin = post.author_email && post.author_email.toLowerCase().trim() === window.ADMIN_EMAIL.toLowerCase().trim();
        const avatarClass = isAdmin ? 'avatar admin-avatar' : 'avatar';
        const initial = post.author_name ? post.author_name.charAt(0).toUpperCase() : '?';
        const adminBadge = isAdmin ? '<span class="badge-admin">Admin News</span>' : '';
        const avatarHtml = post.author_avatar ? `<img src="${post.author_avatar}" class="${avatarClass}" style="object-fit: cover; padding: 0; border: none;">` : `<div class="${avatarClass}">${initial}</div>`;
        const postImageHtml = post.image_url ? `<img src="${post.image_url}" style="width: 100%; border-radius: 12px; margin-top: 15px; border: 1px solid var(--border-color);">` : '';
        const isOwner = window.currentUser.email === post.author_email || window.currentUser.email === window.ADMIN_EMAIL;
        const deleteBtn = isOwner ? `<button onclick="deletePost(${post.id})" style="background:none; border:none; color:var(--danger-color); cursor:pointer; font-size:12px; float:right; padding:4px;">Löschen</button>` : '';
        
        container.innerHTML += `
            <div class="post-card ${isAdmin ? 'admin-post' : ''}">
                ${deleteBtn}
                <div class="post-header">${avatarHtml}<div class="post-meta"><h4>${window.escapeHtml(post.author_name)} ${adminBadge}</h4><span>${displayDate}</span></div></div>
                <div class="post-content">${window.escapeHtml(post.content)}</div>${postImageHtml}
                <div class="post-actions-bar">
                    <div class="action-trigger" style="color: var(--success-color);" onclick="likePost(${post.id}, ${post.likes || 0})">👍 <span id="likes-count-${post.id}">${post.likes || 0}</span></div>
                    <div class="action-trigger" style="color: var(--danger-color);" onclick="dislikePost(${post.id}, ${post.dislikes || 0})">👎 <span id="dislikes-count-${post.id}">${post.dislikes || 0}</span></div>
                    <div class="action-trigger" style="color: var(--social-accent);" onclick="toggleCommentsSection(${post.id})">💬 Kommentieren</div>
                    <div class="action-trigger" style="color: var(--text-muted); margin-left: auto; font-size: 12px;" onclick="reportPost(${post.id})">⚠️ Melden</div>
                </div>
                <div class="comments-wrapper" id="comments-wrapper-${post.id}">
                    <div id="comments-list-${post.id}"><p style="font-size:12px; color:var(--text-muted);">Lade Kommentare...</p></div>
                    <div class="comment-input-box"><input type="text" id="comment-input-${post.id}" placeholder="Schreibe einen Kommentar..."><button onclick="submitComment(${post.id})">Senden</button></div>
                </div>
            </div>`;
    });
};

window.likePost = async function(postId, currentLikes) {
    const { error } = await window.supabaseClient.from('community_posts').update({ likes: currentLikes + 1 }).eq('id', postId);
    if (!error) { const badge = document.getElementById(`likes-count-${postId}`); if (badge) badge.innerText = currentLikes + 1; }
};
        
window.dislikePost = async function(postId, currentDislikes) {
    const { error } = await window.supabaseClient.from('community_posts').update({ dislikes: currentDislikes + 1 }).eq('id', postId);
    if (!error) { const badge = document.getElementById(`dislikes-count-${postId}`); if (badge) badge.innerText = currentDislikes + 1; }
};
        
window.toggleCommentsSection = function(postId) {
    const wrapper = document.getElementById(`comments-wrapper-${postId}`);
    if (!wrapper) return;
    if (wrapper.style.display === "block") { wrapper.style.display = "none"; } else { wrapper.style.display = "block"; window.loadComments(postId); }
};
        
window.loadComments = async function(postId) {
    const container = document.getElementById(`comments-list-${postId}`);
    if (!container) return;
    const { data, error } = await window.supabaseClient.from('community_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    if (error || !data || data.length === 0) { container.innerHTML = '<p style="font-size:12px; color:var(--text-muted); font-style:italic; margin:0;">Noch keine Kommentare geschrieben.</p>'; return; }
    container.innerHTML = data.map(c => {
        const dObj = new Date(c.created_at);
        const dStr = dObj.toLocaleDateString('de-DE') + ' ' + dObj.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
        return `<div class="comment-item"><div class="comment-meta">${window.escapeHtml(c.author_name)} <span>${dStr}</span></div><div style="color: var(--text-color);">${window.escapeHtml(c.content)}</div></div>`;
    }).join('');
};

window.submitComment = async function(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    if (window.checkTextForBadWords(text)) { alert("Dein Kommentar enthält Begriffe, die gegen unsere Richtlinien verstoßen."); return; }
    const displayName = window.currentUser.user_metadata?.username || "Schütze";
    const { error } = await window.supabaseClient.from('community_comments').insert([{ post_id: postId, user_id: window.currentUser.id, author_name: displayName, content: text }]);
    if (error) alert("Fehler beim Kommentieren: " + error.message); else { input.value = ''; window.loadComments(postId); }
};
        
window.reportPost = function(postId) {
    const subject = encodeURIComponent("Regelverstoß Community-Eintrag ID: " + postId);
    const body = encodeURIComponent("Hallo Support-Team,\n\nich möchte den folgenden Beitrag zur Überprüfung melden:\nPlattform-ID: " + postId + "\n\nGrund der Meldung:\n");
    window.location.href = `mailto:info@ipscboerse.com?subject=${subject}&body=${body}`;
};
        
window.previewPostImage = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { const img = document.getElementById('post-image-preview'); if (img) { img.src = e.target.result; img.style.display = 'block'; } }
        reader.readAsDataURL(input.files[0]);
    }
};

window.openPostModal = function() { document.getElementById('post-modal').style.display = 'flex'; document.getElementById('post-content').focus(); };
window.closePostModal = function() { document.getElementById('post-modal').style.display = 'none'; document.getElementById('post-image').value = ''; document.getElementById('post-image-preview').style.display = 'none'; };

window.submitPost = async function() {
    const content = document.getElementById('post-content').value.trim();
    const imageFile = document.getElementById('post-image').files[0];
    const btn = document.getElementById('btn-submit-post');
    if (!content && !imageFile) return;
    if (window.checkTextForBadWords(content)) { alert("Dein Beitrag enthält Begriffe, die gegen unsere Community-Richtlinien verstoßen. Bitte passe deinen Text an."); return; }

    if (imageFile) {
        const originalText = btn.innerText;
        btn.innerText = "Prüfe Bild auf zulässige Inhalte...";
        btn.style.opacity = "0.7";
        try {
            const imgElement = document.createElement('img');
            imgElement.src = URL.createObjectURL(imageFile);
            await new Promise((resolve) => { imgElement.onload = resolve; });
            const model = await nsfwjs.load();
            const predictions = await model.classify(imgElement);
            const unsafe = predictions.find(p => (p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.65);
            if (unsafe) { alert("Das hochgeladene Bild verstößt gegen unsere Richtlinien (unzulässiger Inhalt erkannt)."); btn.innerText = originalText; btn.style.opacity = "1"; return; }
        } catch (kiError) { console.error("KI-Filter Fehler:", kiError); }
    }

    btn.innerText = "Wird hochgeladen...";
    btn.style.opacity = "0.7";

    try {
        let imageUrl = null;
        if (imageFile) { imageUrl = await window.uploadImage(imageFile, 'posts'); }
        const displayName = window.currentUser.user_metadata?.username || "Schütze";
        const avatarUrl = window.currentUser.user_metadata?.avatar_url || null;
        const { error } = await window.supabaseClient.from('community_posts').insert([{ user_id: window.currentUser.id, author_name: displayName, author_email: window.currentUser.email, author_avatar: avatarUrl, content: content, image_url: imageUrl }]);
        if (error) throw error;
        document.getElementById('post-content').value = ''; window.closePostModal(); btn.innerText = "Teilen"; btn.style.opacity = "1"; window.loadPosts();
    } catch (err) { btn.innerText = "Teilen"; btn.style.opacity = "1"; alert("Fehler beim Posten: " + err.message); }
};

window.deletePost = async function(id) { 
    if(!confirm("Beitrag wirklich löschen?")) return;
    const { error } = await window.supabaseClient.from('community_posts').delete().eq('id', id); if(!error) window.loadPosts();
};
