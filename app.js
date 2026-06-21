let cachedMatches = [];
window.editingMatchId = null; 
window.activeChatRoom = null; 

window.lastChatCheckedTimestamp = localStorage.getItem("lastChatChecked") || new Date().toISOString();

// ==========================================================================
// GLOBALE INJEKTION FÜR KONTO-EINSTELLUNGEN, AUTH, CHAT & INBOX
// ==========================================================================
// WICHTIG: Sofortige Injektion, um Race-Conditions mit Supabase zu verhindern!
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
                                <label for="login-password" style="margin-bottom: 0;" data-txt="lbl-password">Passwort *</label>
                                <a onclick="toggleAuthView('forgot')" style="color: var(--info-color); text-decoration: none; font-size: 12px; cursor: pointer; font-weight: 600;" data-txt="link-forgot-pwd">Passwort vergessen?</a>
                            </div>
                            <input type="password" id="login-password" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="btn-primary-auth" data-txt="modal-btn-login">Mit Passwort einloggen</button>
                    </form>

                    <div class="social-login-separator" style="margin: 24px 0 15px 0; text-align: center; border-top: 1px solid var(--border-color); padding-top: 20px;">
                        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;" data-txt="modal-social-separator">Oder Schnell-Login nutzen:</p>
                        
                        <button type="button" onclick="loginWithPasskey()" class="btn-social-passkey" style="margin-bottom: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path></svg>
                            <span data-txt="modal-passkey-login">Mit FaceID / Passkey</span>
                        </button>
                        <button type="button" onclick="loginWithApple()" class="btn-social-apple" style="margin-bottom: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;"><path d="M16.36 14.16c0 3.3-2.67 5.9-6.02 5.9-2.32 0-4.32-1.32-5.32-3.23.47.05.95.07 1.43.07 1.93 0 3.69-.73 5.03-1.95a3.98 3.98 0 0 1-1.78-3.05c.34.06.69.1 1.05.1a3.9 3.9 0 0 0 1.25-.2 4.02 4.02 0 0 1-3.2-3.92v-.05c.57.32 1.22.5 1.9.52a4.01 4.01 0 0 1-1.22-5.37A11.36 11.36 0 0 0 16.5 9c-.06-.31-.08-.63-.08-.96 0-2.2 1.76-3.98 3.95-3.98a3.93 3.93 0 0 1 2.87 1.24 7.82 7.82 0 0 0 2.51-.96 3.97 3.97 0 0 1-1.75 2.19 7.96 7.96 0 0 0 2.27-.61 8.09 8.09 0 0 1-1.97 2.04c.02.21.03.43.03.65 0 6.64-5.07 14.3-14.36 14.3a11.37 11.37 0 0 1-6.17-1.8c.41.05.83.07 1.26.07 2.36 0 4.54-.8 6.27-2.16z"/></svg>
                            <span data-txt="modal-apple-login">Mit Apple anmelden</span>
                        </button>
                        <button type="button" onclick="loginWithGoogle()" class="btn-social-google" aria-label="Mit Google anmelden">
                            <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right: 8px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            <span data-txt="modal-google-login">Mit Google anmelden</span>
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
                            <label for="register-ipsc-alias" style="color: var(--success-color);">🛡️ Öffentlicher Alias / Schützenname *</label>
                            <input type="text" id="register-ipsc-alias" required placeholder="z.B. AlphaShooter">
                            <p class="help-text" style="font-size: 11px; margin: 6px 0 0; color: var(--text-muted);">Wird in Community und Marktplatz angezeigt.</p>
                        </div>
                        <div class="form-group">
                            <label for="register-member-number" style="color: var(--info-color);">🔢 Mitglieds-/Lizenznummer (nicht öffentlich)</label>
                            <input type="text" id="register-member-number" placeholder="z.B. 20911 oder GER1234">
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
                    <h3 data-txt="modal-settings-title">Konto</h3>
                    
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

                        <div class="settings-public-alias-card" style="background-color: rgba(16, 185, 129, 0.08); padding: 16px; border-radius: 6px; border-left: 4px solid var(--success-color); margin-bottom: 20px; display: flex; flex-direction: column;">
                            <label for="settings-public-alias" class="settings-public-alias-title" style="color: var(--success-color); font-weight: 700; margin-bottom: 4px;" data-txt="lbl-public-alias">🛡️ Öffentlicher Alias / Schützenname</label>
                            <p class="help-text" style="font-size: 11px; margin-top: 0; margin-bottom: 8px; color: var(--text-muted); line-height: 1.4;" data-txt="lbl-public-alias-desc">Wird in Community und Marktplatz angezeigt. Keine Mitgliedsnummer eintragen.</p>
                            <input type="text" id="settings-public-alias" data-txt-ph="ph-public-alias" placeholder="z.B. AlphaShooter">
                        </div>

                        <div class="settings-alias-card" style="background-color: rgba(59, 130, 246, 0.06); padding: 16px; border-radius: 6px; border-left: 4px solid var(--info-color); margin-bottom: 20px; display: flex; flex-direction: column;">
                            <label for="settings-ipsc-alias" class="settings-alias-title" style="color: var(--info-color); font-weight: 700; margin-bottom: 4px;" data-txt="lbl-ipsc-alias">🔢 Mitglieds-/Lizenznummer</label>
                            <p class="help-text" style="font-size: 11px; margin-top: 0; margin-bottom: 8px; color: var(--text-muted); line-height: 1.4;" data-txt="lbl-ipsc-alias-desc">Nicht öffentlich. Wird nur für Startplatz-Bot, Vereins-/Mitgliedsfunktionen und interne Zuordnung verwendet.</p>
                            <input type="text" id="settings-ipsc-alias" data-txt-ph="ph-ipsc-alias" placeholder="z.B. 20911 oder GER1234">
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
            <div class="modal-content chat-modal-content" style="max-width: 500px; padding: 25px;">
                <div class="modal-close-container">
                    <button class="modal-close-trigger" id="btn-close-chat" onclick="closeChatSystem()">&times;</button>
                </div>
                <div class="chat-modal-header"><div><span class="chat-kicker">Live-Chat</span><h3 id="chat-title-match" style="font-size: 18px; margin-bottom: 2px;">Chat</h3></div></div>
                <p id="chat-title-partner" style="font-size: 12px; color: var(--text-muted); margin-top:0; margin-bottom: 10px;">Gesprächspartner: -</p>
                <div class="chat-history-area" id="chat-box-messages"></div>
                <form id="chat-send-form" style="display: flex; gap: 8px;">
                    <input type="hidden" id="chat-edit-id" value="">
                    <input type="text" id="chat-message-input" required placeholder="Nachricht schreiben..." data-txt-ph="chat-input-placeholder" style="flex: 1; padding: 10px 14px;">
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

// ==========================================================================
// V76E ACCOUNT & LOGIN POLISH
// Macht Login und Konto app-artiger, kompakter und klarer.
// ==========================================================================
(function accountAndLoginPolishV76e() {
    function ensureAccountTranslationsV76e() {
        window.translations = window.translations || {};
        window.translations.de = window.translations.de || {};
        window.translations.en = window.translations.en || {};

        Object.assign(window.translations.de, {
            "v76e-login-title": "Willkommen zurück",
            "v76e-login-subtitle": "Melde dich sicher bei deiner IPSC-Börse an.",
            "v76e-login-quick": "Schnell anmelden",
            "v76e-login-email": "Oder mit E-Mail anmelden",
            "v76e-login-trust": "Sicherer Login mit Passkey, Apple oder Google.",
            "v76e-settings-title": "Konto",
            "v76e-profile-section": "Profil",
            "v76e-security-section": "Sicherheit",
            "v76e-stats-section": "Vermittlungen",
            "v76e-danger-section": "Gefahrenbereich",
            "v76e-avatar-change": "Profilbild ändern",
            "v76e-password-summary": "Passwort ändern",
            "v76e-password-help": "Nur ausfüllen, wenn du dein Passwort ändern möchtest.",
            "v76e-delete-summary": "Gefahrenbereich anzeigen",
            "v76e-profile-edit-hint": "Name, Schützenname und Profilbild",
            "v76e-passkey-title": "Schnell-Login",
            "v76e-passkey-desc": "FaceID, Fingerabdruck oder Geräte-PIN auf diesem Gerät aktivieren.",
            "v76e-deals-compact": "Erfolgreiche Vermittlungen",
            "modal-settings-passkey-btn": "Passkey auf diesem Gerät aktivieren",
            "modal-apple-login": "Mit Apple anmelden",
            "modal-google-login": "Mit Google anmelden",
            "modal-passkey-login": "Mit FaceID / Passkey fortfahren"
        });

        Object.assign(window.translations.en, {
            "v76e-login-title": "Welcome back",
            "v76e-login-subtitle": "Sign in securely to your IPSC marketplace.",
            "v76e-login-quick": "Quick sign-in",
            "v76e-login-email": "Or sign in with email",
            "v76e-login-trust": "Secure sign-in with passkey, Apple or Google.",
            "v76e-settings-title": "Account",
            "v76e-profile-section": "Profile",
            "v76e-security-section": "Security",
            "v76e-stats-section": "Deals",
            "v76e-danger-section": "Danger zone",
            "v76e-avatar-change": "Change profile photo",
            "v76e-password-summary": "Change password",
            "v76e-password-help": "Only fill this in if you want to change your password.",
            "v76e-delete-summary": "Show danger zone",
            "v76e-profile-edit-hint": "Name, shooter name and profile photo",
            "v76e-passkey-title": "Quick sign-in",
            "v76e-passkey-desc": "Enable Face ID, fingerprint or device PIN on this device.",
            "v76e-deals-compact": "Successful deals",
            "modal-settings-passkey-btn": "Enable passkey on this device",
            "modal-apple-login": "Sign in with Apple",
            "modal-google-login": "Sign in with Google",
            "modal-passkey-login": "Continue with Face ID / Passkey"
        });
    }

    function currentLangV76e() {
        return window.currentLang || localStorage.getItem("selectedLanguage") || "de";
    }

    function tV76e(key, fallback) {
        const lang = currentLangV76e();
        return window.translations?.[lang]?.[key] || fallback || key;
    }

    function translateScopeV76e(scope) {
        if (!scope) return;
        scope.querySelectorAll("[data-txt]").forEach(el => {
            const key = el.getAttribute("data-txt");
            if (window.translations?.[currentLangV76e()]?.[key]) {
                el.textContent = window.translations[currentLangV76e()][key];
            }
        });
        scope.querySelectorAll("[data-txt-ph]").forEach(el => {
            const key = el.getAttribute("data-txt-ph");
            if (window.translations?.[currentLangV76e()]?.[key]) {
                el.setAttribute("placeholder", window.translations[currentLangV76e()][key]);
            }
        });
    }

    function setupLoginPolishV76e() {
        ensureAccountTranslationsV76e();

        const view = document.getElementById("modal-login-view");
        if (!view || view.dataset.polishedV76e === "1") return;
        view.dataset.polishedV76e = "1";
        view.classList.add("login-polish-v76e");

        const title = view.querySelector("h3");
        if (title) {
            title.setAttribute("data-txt", "v76e-login-title");
            title.textContent = tV76e("v76e-login-title", "Willkommen zurück");
        }

        if (title && !view.querySelector(".auth-subtitle-v76e")) {
            const sub = document.createElement("p");
            sub.className = "auth-subtitle-v76e";
            sub.setAttribute("data-txt", "v76e-login-subtitle");
            sub.textContent = tV76e("v76e-login-subtitle", "Melde dich sicher bei deiner IPSC-Börse an.");
            title.after(sub);
        }

        const form = document.getElementById("login-form");
        const social = view.querySelector(".social-login-separator");

        if (social && form) {
            social.classList.add("quick-login-panel-v76e");
            view.insertBefore(social, form);

            const p = social.querySelector("p");
            if (p) {
                p.setAttribute("data-txt", "v76e-login-quick");
                p.textContent = tV76e("v76e-login-quick", "Schnell anmelden");
            }

            if (!social.querySelector(".auth-trust-v76e")) {
                const trust = document.createElement("div");
                trust.className = "auth-trust-v76e";
                trust.setAttribute("data-txt", "v76e-login-trust");
                trust.textContent = tV76e("v76e-login-trust", "Sicherer Login mit Passkey, Apple oder Google.");
                social.appendChild(trust);
            }

            if (!view.querySelector(".auth-email-label-v76e")) {
                const emailLabel = document.createElement("div");
                emailLabel.className = "auth-email-label-v76e";
                emailLabel.setAttribute("data-txt", "v76e-login-email");
                emailLabel.textContent = tV76e("v76e-login-email", "Oder mit E-Mail anmelden");
                form.before(emailLabel);
            }
        }

        const appleBtn = view.querySelector(".btn-social-apple");
        if (appleBtn && !appleBtn.dataset.appleFixedV76e) {
            appleBtn.dataset.appleFixedV76e = "1";
            const oldSvg = appleBtn.querySelector("svg");
            if (oldSvg) oldSvg.remove();
            const mark = document.createElement("span");
            mark.className = "apple-mark-v76e";
            mark.textContent = "";
            appleBtn.prepend(mark);
        }

        view.querySelectorAll(".btn-social-passkey, .btn-social-apple, .btn-social-google").forEach(btn => {
            btn.classList.add("auth-provider-btn-v76e");
        });

        translateScopeV76e(view);
    }

    function updateProfileHeadV76e() {
        const box = document.getElementById("settings-profile-head-v76e");
        if (!box) return;

        const user = window.currentUser || null;
        const meta = user?.user_metadata || {};
        const name = meta.real_name || meta.full_name || meta.name || meta.username || user?.email?.split("@")[0] || "Profil";
        const alias = meta.username || "";
        const email = user?.email || "";
        const avatar = meta.avatar_url || meta.picture || meta.profile_picture || "icon-192.png";

        const img = box.querySelector("img");
        const nameEl = box.querySelector(".profile-head-name-v76e");
        const metaEl = box.querySelector(".profile-head-meta-v76e");
        const emailEl = box.querySelector(".profile-head-email-v76e");

        if (img) img.src = avatar;
        if (nameEl) nameEl.textContent = name;
        if (metaEl) metaEl.textContent = alias ? alias : tV76e("lbl-public-alias", "Öffentlicher Alias");
        if (emailEl) emailEl.textContent = email;
    }

    function sectionTitleV76e(key, fallback) {
        const div = document.createElement("div");
        div.className = "settings-section-title-v76e";
        div.setAttribute("data-txt", key);
        div.textContent = tV76e(key, fallback);
        return div;
    }

    function setupSettingsPolishV76e() {
        ensureAccountTranslationsV76e();

        const view = document.getElementById("modal-settings-view");
        if (!view || view.dataset.polishedV76e === "1") {
            updateProfileHeadV76e();
            return;
        }

        view.dataset.polishedV76e = "1";
        view.classList.add("settings-polish-v76e");

        const title = view.querySelector("h3");
        if (title) {
            title.setAttribute("data-txt", "v76e-settings-title");
            title.textContent = tV76e("v76e-settings-title", "Konto");
        }

        if (title && !document.getElementById("settings-profile-head-v76e")) {
            const head = document.createElement("div");
            head.id = "settings-profile-head-v76e";
            head.className = "settings-profile-head-v76e";
            head.innerHTML = `
                <img src="icon-192.png" alt="Profilbild">
                <div>
                    <strong class="profile-head-name-v76e">Profil</strong>
                    <span class="profile-head-meta-v76e"></span>
                    <small class="profile-head-email-v76e"></small>
                </div>
            `;
            title.after(head);
        }

        const form = document.getElementById("settings-form");
        const stats = view.querySelector(".settings-stats-card");
        const passkey = view.querySelector(".settings-passkey-card");
        const realCard = view.querySelector(".settings-realname-card");
        const publicAliasCard = view.querySelector(".settings-public-alias-card");
        const aliasCard = view.querySelector(".settings-alias-card");
        const avatarInput = document.getElementById("settings-avatar");
        const avatarGroup = avatarInput?.closest(".form-group");
        const avatarPreview = document.getElementById("settings-avatar-preview");
        const passwordInput = document.getElementById("settings-password");
        const passwordGroup = passwordInput?.closest(".form-group");
        const deleteBtn = document.getElementById("btn-delete-account");

        if (form) {
            form.classList.add("settings-form-v76e");

            if (!form.previousElementSibling?.classList?.contains("settings-section-title-v76e")) {
                form.before(sectionTitleV76e("v76e-profile-section", "Profil"));
            }
        }

        if (avatarGroup && !avatarGroup.classList.contains("avatar-polished-v76e")) {
            avatarGroup.classList.add("avatar-polished-v76e");
            const label = avatarGroup.querySelector("label");
            if (label) label.style.display = "none";

            if (avatarPreview) {
                avatarPreview.classList.add("settings-avatar-preview-v76e");
                avatarPreview.style.display = "block";
            }

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "avatar-upload-btn-v76e";
            btn.setAttribute("data-txt", "v76e-avatar-change");
            btn.textContent = tV76e("v76e-avatar-change", "Profilbild ändern");
            btn.addEventListener("click", () => avatarInput.click());
            avatarGroup.appendChild(btn);
        }

        if (passwordGroup && !passwordGroup.closest(".settings-collapse-password-v76e")) {
            const details = document.createElement("details");
            details.className = "settings-collapse-v76e settings-collapse-password-v76e";
            const summary = document.createElement("summary");
            summary.setAttribute("data-txt", "v76e-password-summary");
            summary.textContent = tV76e("v76e-password-summary", "Passwort ändern");
            const help = document.createElement("p");
            help.className = "settings-collapse-help-v76e";
            help.setAttribute("data-txt", "v76e-password-help");
            help.textContent = tV76e("v76e-password-help", "Nur ausfüllen, wenn du dein Passwort ändern möchtest.");
            passwordGroup.before(details);
            details.appendChild(summary);
            details.appendChild(help);
            details.appendChild(passwordGroup);
        }

        if (passkey && !passkey.classList.contains("passkey-polished-v76e")) {
            passkey.classList.add("passkey-polished-v76e");
            const passTitle = passkey.querySelector(".settings-passkey-title");
            const passDesc = passkey.querySelector(".help-text");
            if (passTitle) {
                passTitle.setAttribute("data-txt", "v76e-passkey-title");
                passTitle.textContent = tV76e("v76e-passkey-title", "Schnell-Login");
            }
            if (passDesc) {
                passDesc.setAttribute("data-txt", "v76e-passkey-desc");
                passDesc.textContent = tV76e("v76e-passkey-desc", "FaceID, Fingerabdruck oder Geräte-PIN auf diesem Gerät aktivieren.");
            }
        }

        if (stats && !stats.classList.contains("stats-polished-v76e")) {
            stats.classList.add("stats-polished-v76e");
            const statsTitle = stats.querySelector(".settings-stats-title");
            if (statsTitle) {
                statsTitle.setAttribute("data-txt", "v76e-deals-compact");
                statsTitle.textContent = tV76e("v76e-deals-compact", "Erfolgreiche Vermittlungen");
            }
        }

        // Reihenfolge: Profilkopf -> Profilformular -> Sicherheit -> Vermittlungen -> Gefahrenbereich
        if (form && passkey) {
            form.after(passkey);
            passkey.before(sectionTitleV76e("v76e-security-section", "Sicherheit"));
        }

        if (passkey && stats) {
            passkey.after(stats);
            stats.before(sectionTitleV76e("v76e-stats-section", "Vermittlungen"));
        }

        if (deleteBtn && !deleteBtn.closest(".settings-danger-v76e")) {
            const details = document.createElement("details");
            details.className = "settings-danger-v76e";
            const summary = document.createElement("summary");
            summary.setAttribute("data-txt", "v76e-delete-summary");
            summary.textContent = tV76e("v76e-delete-summary", "Gefahrenbereich anzeigen");
            deleteBtn.before(sectionTitleV76e("v76e-danger-section", "Gefahrenbereich"));
            deleteBtn.before(details);
            details.appendChild(summary);
            details.appendChild(deleteBtn);
        }

        updateProfileHeadV76e();
        translateScopeV76e(view);
    }

    function runPolishV76e() {
        setupLoginPolishV76e();
        setupSettingsPolishV76e();
    }

    document.addEventListener("DOMContentLoaded", runPolishV76e);
    setTimeout(runPolishV76e, 50);
    setTimeout(runPolishV76e, 500);

    document.addEventListener("click", (event) => {
        if (event.target.closest("#btn-open-login") || event.target.closest("#btn-open-settings")) {
            setTimeout(runPolishV76e, 40);
            setTimeout(updateProfileHeadV76e, 150);
        }
    });

    window.addEventListener("ipsc:oauth-login-complete", () => {
        setTimeout(runPolishV76e, 100);
    });

    const previousLanguageHookV76e = window.onLanguageChanged;
    window.onLanguageChanged = function() {
        if (typeof previousLanguageHookV76e === "function") previousLanguageHookV76e();
        ensureAccountTranslationsV76e();
        translateScopeV76e(document.getElementById("auth-modal") || document);
        updateProfileHeadV76e();
    };
})();


document.addEventListener("DOMContentLoaded", () => {
    // Schließen-Trigger für das Konto-Modal binden
    const closeBtn = document.getElementById("btn-close-modal");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("auth-modal").style.display = "none";
            const title = document.querySelector("#modal-settings-view h3");
            if (title) title.innerText = "Konto";
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
});

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
    .select(`
      *,
      seller_profile:seller_email (ipsc_alias)
    `)
    .order("match_date", { ascending: true });
    
  if (error) {
    const { data: fallbackData } = await window.supabaseClient
        .from("matches")
        .select("*")
        .order("match_date", { ascending: true });
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
    container.innerHTML = `<p class="empty-state">${window.translations[window.currentLang]["no-slots"]}</p>`;
    return;
  }

  const buildCards = (items, aliasMap = {}) => {
    const escapeJsAttr = (value) => window.escapeHtml(String(value || "")).replace(/'/g, "\\'").replace(/\n/g, " ");
    const t = (key, fallback) => (window.translations?.[window.currentLang]?.[key] || fallback || key);
    return items.map(m => {
      const isWant = m.type === "want";
      const currentEmail = (window.currentUser?.email || "").trim().toLowerCase();
      const sellerEmailNormalized = (m.seller_email || "").trim().toLowerCase();
      const isSender = !!currentEmail && currentEmail === sellerEmailNormalized;
      const isAdmin = currentEmail === "fabian-schoeps@gmx.de";
      const canManage = isSender || isAdmin;

      let sellerAlias = null;
      if (isSender && window.currentUser.user_metadata?.ipsc_alias) {
        sellerAlias = window.currentUser.user_metadata.ipsc_alias;
      } else if (aliasMap[m.seller_email]) {
        sellerAlias = aliasMap[m.seller_email];
      } else if (m.seller_profile && m.seller_profile.ipsc_alias) {
        sellerAlias = m.seller_profile.ipsc_alias;
      } else if (m.author_ipsc_alias) {
        sellerAlias = m.author_ipsc_alias;
      }

      const levelBadge = m.match_level ? `<span class="badge badge-level">${window.escapeHtml(m.match_level)}</span>` : "";
      const squadBadge = m.match_squad ? `<span class="badge badge-squad">${t("label-squad", "Squad")} ${window.escapeHtml(m.match_squad)}</span>` : "";
      const countryBadge = m.match_country ? `<span class="badge badge-country">${window.escapeHtml(m.match_country)}</span>` : "";
      const typeBadge = `<span class="badge badge-type ${isWant ? "badge-want" : "badge-offer"}">${isWant ? window.translations[window.currentLang]["tag-want"] : window.translations[window.currentLang]["tag-offer"]}</span>`;
      const trustedBadge = (sellerAlias && sellerAlias.trim() !== "")
        ? `<span class="badge badge-trusted" title="${t("trusted-title", "Verifizierter IPSC Alias")}: ${window.escapeHtml(sellerAlias)}">✓ ${t("trusted-badge", "Trusted")}</span>`
        : "";

      const cleanMatchName = m.match_name.replace(/"/g, '&quot;').replace(/'/g, "\\'");
      const contactBtnClass = isWant ? "btn-contact btn-contact-want" : "btn-contact";
      const contactText = isWant ? window.translations[window.currentLang]["btn-contact-want"] : window.translations[window.currentLang]["btn-request"];

      const authorName = m.author_name || m.seller_email.split('@')[0];
      const authorAvatar = m.author_avatar || '';
      const safeSellerEmail = escapeJsAttr(m.seller_email);
      const safeAuthorName = escapeJsAttr(authorName);
      const safeAuthorNameText = window.escapeHtml(authorName);
      const safeAvatar = escapeJsAttr(authorAvatar);
      const safeAlias = escapeJsAttr(sellerAlias || "");

      const profileClick = `openUserProfile('${safeSellerEmail}', '${safeAuthorName}', '${safeAvatar}', '${safeAlias}')`;

      const avatarHtml = authorAvatar
        ? `<img src="${safeAvatar}" class="card-avatar" onclick="${profileClick}" title="Profil von ${safeAuthorNameText} ansehen">`
        : `<div class="avatar-placeholder-flex" onclick="${profileClick}" title="Profil von ${safeAuthorNameText} ansehen">${window.escapeHtml(authorName.charAt(0).toUpperCase())}</div>`;

      const priceNumber = Number.parseFloat(m.match_price);
      const priceText = Number.isFinite(priceNumber) ? `${priceNumber.toFixed(2)} €` : "-";

      return `
        <article class="match-card ${isWant ? "card-want" : "card-offer"}">
          ${canManage ? `
            <details class="owner-menu">
              <summary class="owner-menu-trigger" title="${t("btn-manage", "Verwalten")}">⚙</summary>
              <div class="owner-menu-popover">
                <button type="button" onclick="handleEditClick(${m.id})">${t("btn-edit", "Bearbeiten")}</button>
                <button type="button" class="danger" onclick="handleDelete(${m.id}, '${m.seller_email}')">${t("btn-delete", "Löschen")}</button>
              </div>
            </details>
          ` : ""}
          <div class="match-card-main">
            <div class="match-header-flex">
              ${avatarHtml}

              <div class="match-summary">
                <h3 class="match-title">${window.escapeHtml(m.match_name)}</h3>

                <div class="badge-container">
                  ${levelBadge}
                  ${squadBadge}
                  ${countryBadge}
                  ${typeBadge}
                  ${trustedBadge}
                </div>

                <button type="button" class="seller-link" onclick="${profileClick}">
                  ${t("listed-by", "Inseriert von")}: <strong>${safeAuthorNameText}</strong>
                </button>

                <div class="match-meta">${window.escapeHtml(m.match_date)} · ${window.escapeHtml(m.match_location || "-")}</div>
              </div>

              <div class="match-price-head-v76k">${priceText}</div>
            </div>
          </div>

          <div class="card-actions">
            <div class="action-buttons-group ${canManage ? 'manage-actions' : ''}">
              <button class="btn-export" onclick="exportToIcs(${m.id})">${window.translations[window.currentLang]["btn-export"]}</button>
              <button class="btn-report" onclick="reportMatch(${m.id})">${window.translations[window.currentLang]["report-btn"]}</button>
              ${canManage ? `<button class="btn-mediated" onclick="triggerMediatedModal(${m.id})">✓ ${t("btn-mediated", "Vermittelt")}</button>` : ""}
            </div>

            <div class="primary-actions">
              <button class="${contactBtnClass}" onclick="openChatSystem(${m.id}, '${m.seller_email}', '${cleanMatchName}')">💬 ${t("btn-live-chat", "Live-Chat")}</button>
              <button class="${contactBtnClass} btn-contact-secondary" onclick="handleContactClick('${m.seller_email}', '${cleanMatchName}', '${m.type}')">✉️ ${contactText}</button>
            </div>

            ${""}
          </div>
        </article>
      `;
    }).join("");
  };

  window.supabaseClient.from('profiles').select('email, ipsc_alias').then(({data: profiles}) => {
    const aliasMap = {};
    if (profiles) {
      profiles.forEach(p => { aliasMap[p.email] = p.ipsc_alias; });
    }

    container.innerHTML = buildCards(matches, aliasMap);
  }).catch(() => {
    container.innerHTML = buildCards(matches, {});
  });
}

function handleContactClick(email, matchName, type) {
  if (!window.currentUser) {
    alert(window.translations[window.currentLang]["login-required"]);
    return;
  }
  
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
  if (!window.currentUser) {
    return alert(window.currentLang === "en" ? "Please log in to chat." : "Bitte logge dich ein, um den Live-Chat zu nutzen.");
  }

  if (window.currentUser.email.toLowerCase() === receiverEmail.toLowerCase()) {
    return alert(window.currentLang === "en" ? "You cannot start a chat with yourself." : "Du kannst keinen Chat mit dir selbst starten.");
  }

  window.activeChatRoom = { matchId, receiverEmail, matchName };

  const chatModal = document.getElementById("chat-modal");
  if (chatModal) { if (window.ipscShowModalV78l) window.ipscShowModalV78l("chat-modal"); else chatModal.style.display = "flex"; }

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

  const { data: messages, error } = await window.supabaseClient
    .from("chat_messages")
    .select("*")
    .eq("match_id", window.activeChatRoom.matchId)
    .or(`and(sender_email.eq.${window.currentUser.email},receiver_email.eq.${window.activeChatRoom.receiverEmail}),and(sender_email.eq.${window.activeChatRoom.receiverEmail},receiver_email.eq.${window.currentUser.email})`)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fehler beim Laden des Chats:", error);
    box.innerHTML = "";
    return;
  }

  box.innerHTML = "";
  if (!messages || messages.length === 0) {
    box.innerHTML = `
      <div class="chat-empty-state">
        <div class="chat-empty-icon">💬</div>
        <strong>${window.currentLang === "en" ? "No messages yet" : "Noch keine Nachrichten"}</strong>
        <span>${window.currentLang === "en" ? "Start the conversation with a short message." : "Starte das Gespräch mit einer kurzen Nachricht."}</span>
      </div>`;
  }
  if (messages && messages.length > 0) {
    messages.forEach(msg => {
      const isMe = msg.sender_email.toLowerCase() === window.currentUser.email.toLowerCase();
      
      let metaHtml = "";
      if (isMe) {
         metaHtml = `
           <div class="chat-bubble-meta" style="justify-content: flex-end;">
             <span class="chat-action-link" onclick="editChatMessage(${msg.id}, '${msg.message.replace(/'/g, "\\'")}')">✏️ ${window.currentLang === 'en' ? 'Edit' : 'Bearbeiten'}</span>
             <span class="chat-action-link delete" onclick="deleteChatMessage(${msg.id})">🗑️ ${window.currentLang === 'en' ? 'Delete' : 'Löschen'}</span>
           </div>`;
      } else {
         metaHtml = `
           <div class="chat-bubble-meta">
             <span class="chat-action-link" style="color: var(--danger-color);" onclick="reportChatMessage(${msg.id})">⚠️ ${window.currentLang === 'en' ? 'Report' : 'Melden'}</span>
           </div>`;
      }

      box.innerHTML += `
        <div class="chat-bubble-container" id="msg-container-${msg.id}">
          <div class="chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}">${window.escapeHtml(msg.message)}</div>
          ${metaHtml}
        </div>`;
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

function closeChatSystem() {
  window.activeChatRoom = null;
  if (window.ipscHideModalV78l) window.ipscHideModalV78l("chat-modal"); else document.getElementById("chat-modal").style.display = "none";
}
window.closeChatSystem = closeChatSystem;


// Robust Chat Submit Handler v40
// War vorher nicht zuverlässig gebunden: dadurch konnte der Browser nur das Formular neu laden,
// statt die Nachricht in Supabase zu speichern.
if (!window.__chatSubmitHandlerV40Bound) {
  window.__chatSubmitHandlerV40Bound = true;

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!form || form.id !== "chat-send-form") return;

    event.preventDefault();

    if (!window.currentUser || !window.activeChatRoom) {
      return alert(window.currentLang === "en" ? "Please open a chat first." : "Bitte öffne zuerst einen Chat.");
    }

    const input = document.getElementById("chat-message-input");
    const editIdInput = document.getElementById("chat-edit-id");
    const sendBtn = document.getElementById("btn-chat-send");

    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    const originalBtnText = sendBtn ? sendBtn.innerText : "";
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerText = window.currentLang === "en" ? "Sending..." : "Sende...";
    }

    try {
      const editId = editIdInput ? editIdInput.value.trim() : "";

      if (editId) {
        const { error } = await window.supabaseClient
          .from("chat_messages")
          .update({ message })
          .eq("id", editId)
          .eq("sender_email", window.currentUser.email);

        if (error) throw error;

        if (editIdInput) editIdInput.value = "";
      } else {
        const { error } = await window.supabaseClient
          .from("chat_messages")
          .insert({
            match_id: window.activeChatRoom.matchId,
            match_name: window.activeChatRoom.matchName,
            sender_email: window.currentUser.email,
            receiver_email: window.activeChatRoom.receiverEmail,
            message
          });

        if (error) throw error;
      }

      input.value = "";
      if (sendBtn) sendBtn.innerText = window.currentLang === "en" ? "Send" : "Senden";

      if (typeof loadChatMessages === "function") {
        await loadChatMessages();
      }

      if (typeof updateHeaderChatBadge === "function") {
        updateHeaderChatBadge();
      }
    } catch (error) {
      console.error("Chat send error:", error);
      alert((window.currentLang === "en" ? "Message could not be sent: " : "Nachricht konnte nicht gesendet werden: ") + (error.message || error));
      if (sendBtn) sendBtn.innerText = originalBtnText || (window.currentLang === "en" ? "Send" : "Senden");
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  });
}


function triggerChatEmailReminder() {
  if (!window.activeChatRoom) return;

  const partnerEmail = window.activeChatRoom.receiverEmail;
  const matchName = window.activeChatRoom.matchName;

  const subject = encodeURIComponent("Ungelesene Chat-Nachricht auf ipscboerse.com");
  const body = encodeURIComponent(
    `Hallo,\n\nich habe dir gerade eine Nachricht im Live-Chat auf ipscboerse.com bezüglich des Matches "${matchName}" hinterlassen.\n\nBitte schaue kurz in den Chat auf der Plattform rein, um mir zu antworten.\n\nViele Grüße`
  );

  window.location.href = `mailto:${partnerEmail}?subject=${subject}&body=${body}`;
}
window.triggerChatEmailReminder = triggerChatEmailReminder;

async function toggleGlobalInbox() {
  requestChatNotificationPermissionSoft();

  if (!window.currentUser) {
    return alert(window.currentLang === "en" ? "Please log in to see your messages." : "Bitte logge dich ein, um deine Nachrichten zu sehen.");
  }
  
  const modal = document.getElementById("global-inbox-modal");
  if (!modal) return;
  
  if (modal.style.display === "flex") {
    if (window.ipscHideModalV78l) window.ipscHideModalV78l("global-inbox-modal"); else modal.style.display = "none";
    return;
  }
  
  if (window.ipscShowModalV78l) window.ipscShowModalV78l("global-inbox-modal"); else modal.style.display = "flex";

  const previousChatChecked = window.lastChatCheckedTimestamp || localStorage.getItem("lastChatChecked") || new Date(0).toISOString();
  const openedAt = new Date().toISOString();

  const listContainer = document.getElementById("global-inbox-list");
  listContainer.innerHTML = `<div class="inbox-loading-v76k">${window.currentLang === "en" ? "Loading conversations..." : "Lade Gespräche..."}</div>`;

  const { data: allMsgs, error } = await window.supabaseClient
    .from("chat_messages")
    .select("*")
    .or(`sender_email.eq.${window.currentUser.email},receiver_email.eq.${window.currentUser.email}`)
    .order("created_at", { ascending: false });

  if (error || !allMsgs || allMsgs.length === 0) {
    listContainer.innerHTML = `<div class="inbox-empty-v76k">${window.currentLang === "en" ? "No active conversations found." : "Keine aktiven Nachrichten gefunden."}</div>`;
    window.lastChatCheckedTimestamp = openedAt;
    localStorage.setItem("lastChatChecked", window.lastChatCheckedTimestamp);
    updateHeaderChatBadge();
    return;
  }

  const currentEmail = String(window.currentUser.email || "").toLowerCase();
  let uniqueChats = {};

  allMsgs.forEach(msg => {
    const sender = String(msg.sender_email || "").toLowerCase();
    const receiver = String(msg.receiver_email || "").toLowerCase();
    const partner = sender === currentEmail ? msg.receiver_email : msg.sender_email;
    if (!partner) return;

    const key = `${msg.match_id}_${String(partner).toLowerCase()}`;
    const createdAt = msg.created_at || "";
    const isIncomingUnread = receiver === currentEmail && sender !== currentEmail && createdAt > previousChatChecked;

    if (!uniqueChats[key]) {
      uniqueChats[key] = {
        matchId: msg.match_id,
        matchName: msg.match_name || "Chat",
        partnerEmail: partner,
        lastMessage: msg.message || "",
        lastSenderEmail: msg.sender_email || "",
        latestAt: createdAt,
        unreadCount: 0
      };
    }

    if (isIncomingUnread) uniqueChats[key].unreadCount += 1;
  });

  const chats = Object.values(uniqueChats).sort((a, b) => String(b.latestAt || "").localeCompare(String(a.latestAt || "")));

  listContainer.innerHTML = chats.map(c => {
    const isUnread = Number(c.unreadCount || 0) > 0;
    const senderLabel = String(c.lastSenderEmail || "").toLowerCase() === currentEmail
      ? (window.currentLang === "en" ? "You" : "Du")
      : window.escapeHtml(c.partnerEmail);
    const unreadLabel = c.unreadCount > 1
      ? `${c.unreadCount} ${window.currentLang === "en" ? "new" : "neu"}`
      : (window.currentLang === "en" ? "New" : "Neu");

    return `<button type="button"
                    class="inbox-chat-item-v76k ${isUnread ? "is-unread" : ""}"
                    data-match-id="${window.escapeHtml(c.matchId)}"
                    data-partner-email="${window.escapeHtml(c.partnerEmail)}"
                    data-match-name="${window.escapeHtml(c.matchName)}">
              <span class="inbox-chat-title-row-v76k">
                <strong>${window.escapeHtml(c.matchName)}</strong>
                ${isUnread ? `<em>${unreadLabel}</em>` : ""}
              </span>
              <span class="inbox-chat-partner-v76k">${window.currentLang === "en" ? "With" : "Mit"}: ${window.escapeHtml(c.partnerEmail)}</span>
              <span class="inbox-chat-snippet-v76k"><b>${senderLabel}:</b> ${window.escapeHtml(c.lastMessage)}</span>
            </button>`;
  }).join("");

  listContainer.querySelectorAll(".inbox-chat-item-v76k").forEach(item => {
    item.addEventListener("click", () => {
      const inboxModal = document.getElementById("global-inbox-modal");
      if (inboxModal) inboxModal.style.display = "none";
      openChatSystem(item.dataset.matchId, item.dataset.partnerEmail, item.dataset.matchName);
    });
  });

  window.lastChatCheckedTimestamp = openedAt;
  localStorage.setItem("lastChatChecked", window.lastChatCheckedTimestamp);
  updateHeaderChatBadge();
}
window.toggleGlobalInbox = toggleGlobalInbox;


function getPortalText(key, fallback) {
  const lang = window.currentLang || localStorage.getItem("selectedLanguage") || "de";
  return window.translations?.[lang]?.[key] || window.portalTranslations?.[lang]?.[key] || fallback;
}

function ensureChatToastContainer() {
  let container = document.getElementById("chat-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "chat-toast-container";
    document.body.appendChild(container);
  }
  return container;
}

function showChatToast(message, matchName) {
  const container = ensureChatToastContainer();
  const toast = document.createElement("button");
  toast.type = "button";
  toast.className = "chat-toast";
  toast.innerHTML = `
    <span class="chat-toast-icon">💬</span>
    <span class="chat-toast-text">
      <strong>${getPortalText("chat-notification-title", "Neue Nachricht")}</strong>
      <small>${window.escapeHtml(matchName || "")}</small>
      <em>${window.escapeHtml(String(message || "").slice(0, 80))}</em>
    </span>
  `;

  toast.addEventListener("click", () => {
    toast.remove();
    if (typeof toggleGlobalInbox === "function") toggleGlobalInbox();
  });

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-hiding");
    window.setTimeout(() => toast.remove(), 260);
  }, 5200);
}

function requestChatNotificationPermissionSoft() {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  } catch (_) {}
}

function showBrowserChatNotification(message, matchName) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const notification = new Notification(getPortalText("chat-notification-title", "Neue Nachricht"), {
      body: `${matchName || "Chat"}: ${String(message || "").slice(0, 120)}`,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: "ipsc-chat-message",
      renotify: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (typeof toggleGlobalInbox === "function") toggleGlobalInbox();
    };
  } catch (_) {}
}

function handleIncomingChatNotificationV41(newMsg) {
  if (!window.currentUser || !newMsg) return;

  const isForMe =
    String(newMsg.receiver_email || "").toLowerCase() === String(window.currentUser.email || "").toLowerCase();

  const isFromMe =
    String(newMsg.sender_email || "").toLowerCase() === String(window.currentUser.email || "").toLowerCase();

  if (!isForMe || isFromMe) return;

  const isActiveSameChat =
    window.activeChatRoom &&
    String(newMsg.match_id) === String(window.activeChatRoom.matchId) &&
    String(newMsg.sender_email || "").toLowerCase() === String(window.activeChatRoom.receiverEmail || "").toLowerCase();

  // Wenn der Chat gerade offen ist, reicht das Live-Nachladen.
  if (isActiveSameChat && document.getElementById("chat-modal")?.style.display === "flex") {
    return;
  }

  showChatToast(newMsg.message, newMsg.match_name);
  showBrowserChatNotification(newMsg.message, newMsg.match_name);

  try {
    if (navigator.vibrate) navigator.vibrate(12);
  } catch (_) {}
}

function updateHeaderChatBadge() {
  const badge = document.getElementById("chat-badge-count");
  const chatBtn = document.getElementById("header-chat-btn");

  const setBadge = (count) => {
    const safeCount = Number(count || 0);
    if (badge) {
      if (safeCount > 0) {
        badge.innerText = safeCount > 99 ? "99+" : String(safeCount);
        badge.style.display = "inline-flex";
      } else {
        badge.innerText = "0";
        badge.style.display = "none";
      }
    }

    if (chatBtn) {
      chatBtn.classList.toggle("has-chat-unread", safeCount > 0);
      chatBtn.setAttribute("aria-label", safeCount > 0 ? `Nachrichten öffnen (${safeCount} neu)` : "Nachrichten öffnen");
    }
  };

  if (!window.currentUser) {
    setBadge(0);
    return;
  }

  window.supabaseClient
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_email", window.currentUser.email)
    .gt("created_at", window.lastChatCheckedTimestamp)
    .then(({ count, error }) => {
       if (error) {
         console.warn("Chat badge count failed:", error);
         setBadge(0);
         return;
       }
       setBadge(count || 0);
    });
}

setTimeout(() => {
  updateHeaderChatBadge();
  if (window.supabaseClient) {
    window.supabaseClient
      .channel('public:chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
          updateHeaderChatBadge();

          if (payload.eventType === "INSERT" && window.currentUser && payload.new) {
              handleIncomingChatNotificationV41(payload.new);
          }
          
          if (!window.activeChatRoom || !window.currentUser) return;

          if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
              loadChatMessages();
              return;
          }

          const newMsg = payload.new;
          if (!newMsg) return;
          const matchMatch = newMsg.match_id == window.activeChatRoom.matchId;
          const participantMatch = (newMsg.sender_email.toLowerCase() === window.currentUser.email.toLowerCase() && newMsg.receiver_email.toLowerCase() === window.activeChatRoom.receiverEmail.toLowerCase()) ||
                                   (newMsg.sender_email.toLowerCase() === window.activeChatRoom.receiverEmail.toLowerCase() && newMsg.receiver_email.toLowerCase() === window.currentUser.email.toLowerCase());

          if (matchMatch && participantMatch) {
              loadChatMessages();
          }
      })
      .subscribe();
  }
}, 1000);

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
  if (!window.currentUser) { 
      alert(window.translations[window.currentLang]["login-required"]); 
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
  
  window.editingMatchId = id;

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

  document.getElementById("form-section-title").innerText = window.translations[window.currentLang]["form-title-edit"];
  document.getElementById("btn-submit-ad").innerText = window.translations[window.currentLang]["btn-save-edit"];
  document.getElementById("btn-cancel-edit").style.display = "inline-block";
  if (typeof window.openMarketForm === "function") { window.openMarketForm(); } else { document.getElementById("form-anchor").scrollIntoView({ behavior: "smooth" }); }
}
window.handleEditClick = handleEditClick;

function resetFormState() {
  window.editingMatchId = null;
  document.getElementById("match-form").reset();
  document.getElementById("form-section-title").innerText = window.translations[window.currentLang]["form-title"];
  document.getElementById("btn-submit-ad").innerText = window.translations[window.currentLang]["btn-insert"];
  document.getElementById("btn-cancel-edit").style.display = "none";
  enforceFutureDates();
}
document.getElementById("btn-cancel-edit")?.addEventListener("click", resetFormState);

async function handleDelete(id, sellerEmail) {
  const isAdmin = window.currentUser && window.currentUser.email === "fabian-schoeps@gmx.de";
  const isOwner = window.currentUser && window.currentUser.email === sellerEmail;

  if (!isOwner && !isAdmin) { 
      return alert(window.currentLang === "en" ? "Error: Unauthorized." : "Fehler: Unberechtigt."); 
  }
  
  const textAdmin = window.currentLang === "en" ? "Do you want to permanently delete this entry as an ADMIN?" : "Möchtest du diesen fremden Eintrag als ADMIN unwiderruflich löschen?";
  const textUser = window.currentLang === "en" ? "Do you really want to permanently delete this entry?" : "Möchtest du diesen Eintrag wirklich unwiderruflich löschen?";
  const text = isAdmin && !isOwner ? textAdmin : textUser;
    
  if (!confirm(text)) return;
  
  await window.supabaseClient.from("matches").delete().eq("id", id);
  if (window.editingMatchId === id) resetFormState();
  fetchMatches();
}

document.getElementById("match-form")?.addEventListener("submit", async (e) => {
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
});

document.getElementById("filter-type-select")?.addEventListener("change", (e) => {
  const type = e.target.value;
  if (type === "all") renderMatches(cachedMatches);
  else renderMatches(cachedMatches.filter(m => m.type === type));
});

function checkPlannerImport() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('from_planner') === 'true') {
    const name = urlParams.get('name');
    const date = urlParams.get('date');
    const location = urlParams.get('location');

    if (name && document.getElementById("match-name")) document.getElementById("match-name").value = name;
    if (date && document.getElementById("match-date")) document.getElementById("match-date").value = date;
    if (location && document.getElementById("match-location")) document.getElementById("match-location").value = location;

    if (typeof window.openMarketForm === "function") window.openMarketForm();

    const formAnchor = document.getElementById("form-anchor");
    if (formAnchor) setTimeout(() => { formAnchor.scrollIntoView({ behavior: "smooth" }); }, 300);
  }
}

// =========================================================================
// AUTOMATISCHE LADEN & SPEICHERN LOGIK FÜR PROFILWERTE
// =========================================================================
async function loadUserSettingsProfile() {
  if (!window.currentUser) return;

  const { data: profile, error } = await window.supabaseClient
    .from("profiles")
    .select("username, ipsc_alias, real_name")
    .eq("id", window.currentUser.id)
    .single();

  if (!error && profile) {
    const publicAliasInput = document.getElementById("settings-public-alias");
    const aliasInput = document.getElementById("settings-ipsc-alias");
    const rnInput = document.getElementById("settings-real-name");

    if (!publicAliasInput || !aliasInput || !rnInput) {
        setTimeout(loadUserSettingsProfile, 100);
        return;
    }

    publicAliasInput.value = profile.username || window.currentUser.user_metadata?.username || "";
    aliasInput.value = profile.ipsc_alias || window.currentUser.user_metadata?.ipsc_alias || "";
    rnInput.value = profile.real_name || window.currentUser.user_metadata?.real_name || "";
  }
}

const originalOnAuthChange = window.onAuthChange;
window.onAuthChange = (user) => {
  if (typeof originalOnAuthChange === "function") originalOnAuthChange(user);
  loadUserSettingsProfile();

  // V76K: Marktplatz nach Auth-Check erneut rendern, damit Besitzer/Admin-Aktionen
  // wie „Vermittelt" auch nach dem initialen Gast-Render sichtbar sind.
  if (document.getElementById("match-container")) {
    fetchMatches();
  }
};

enforceFutureDates();
checkPlannerImport();
fetchMatches();


// ==========================================================================
// V76F LOGIN + SETTINGS BALANCE
// - Login wieder klarer wie vorher: E-Mail zuerst, Schnell-Login darunter.
// - Profilbereich in Konto einklappbar, damit man alles schneller sieht.
// ==========================================================================
(function loginSettingsBalanceV76f() {
    function ensureTranslationsV76f() {
        window.translations = window.translations || {};
        window.translations.de = window.translations.de || {};
        window.translations.en = window.translations.en || {};

        Object.assign(window.translations.de, {
            "v76f-login-title": "Willkommen zurück",
            "v76f-login-subtitle": "Melde dich mit E-Mail, Passkey, Apple oder Google an.",
            "v76f-login-quick": "Oder Schnell-Login nutzen",
            "v76f-profile-edit": "Profil bearbeiten",
            "v76f-profile-edit-help": "Name, Mitgliedsnummer, Profilbild und Passwort ändern.",
            "v76f-profile-title": "Profilübersicht",
            "lbl-real-name": "🔒 Echter Name (für automatische Zuordnung)",
            "lbl-real-name-desc": "Trage deinen Namen so ein, wie er in Starterlisten erscheint. Der Name wird nicht öffentlich angezeigt und hilft der App, öffentlich verfügbare Matchdaten korrekt zuzuordnen.",
            "lbl-public-alias": "🛡️ Öffentlicher Alias / Schützenname",
            "lbl-public-alias-desc": "Wird in Community und Marktplatz angezeigt. Keine Mitgliedsnummer eintragen.",
            "ph-public-alias": "z.B. AlphaShooter",
            "lbl-ipsc-alias": "🔢 Mitglieds-/Lizenznummer",
            "lbl-ipsc-alias-desc": "Nicht öffentlich. Wird nur für Startplatz-Bot, Vereins-/Mitgliedsfunktionen und interne Zuordnung verwendet.",
            "ph-ipsc-alias": "z.B. 20911 oder GER1234",
            "lbl-change-password": "Neues Passwort (optional)"
        });

        Object.assign(window.translations.en, {
            "v76f-login-title": "Welcome back",
            "v76f-login-subtitle": "Sign in with email, passkey, Apple or Google.",
            "v76f-login-quick": "Or use quick sign-in",
            "v76f-profile-edit": "Edit profile",
            "v76f-profile-edit-help": "Change name, member number, profile photo and password.",
            "v76f-profile-title": "Profile overview",
            "lbl-real-name": "🔒 Real name (for automatic matching)",
            "lbl-real-name-desc": "Enter your name exactly as it appears on start lists. It is not shown publicly and helps the app match publicly available match data correctly.",
            "lbl-public-alias": "🛡️ Public alias / shooter name",
            "lbl-public-alias-desc": "Shown in community and marketplace. Do not enter your member number here.",
            "ph-public-alias": "e.g. AlphaShooter",
            "lbl-ipsc-alias": "🔢 Member/license number",
            "lbl-ipsc-alias-desc": "Not public. Used only for Slot Bot, club/member functions and internal matching.",
            "ph-ipsc-alias": "e.g. 20911 or GER1234",
            "lbl-change-password": "New password (optional)"
        });
    }

    function langV76f() {
        return window.currentLang || localStorage.getItem("selectedLanguage") || "de";
    }

    function textV76f(key, fallback) {
        return window.translations?.[langV76f()]?.[key] || fallback || key;
    }

    function translateV76f(scope) {
        if (!scope) return;
        scope.querySelectorAll("[data-txt]").forEach(el => {
            const key = el.getAttribute("data-txt");
            const value = window.translations?.[langV76f()]?.[key];
            if (value) el.textContent = value;
        });
        scope.querySelectorAll("[data-txt-ph]").forEach(el => {
            const key = el.getAttribute("data-txt-ph");
            const value = window.translations?.[langV76f()]?.[key];
            if (value) el.setAttribute("placeholder", value);
        });
    }

    function setupLoginClassicV76f() {
        ensureTranslationsV76f();
        const view = document.getElementById("modal-login-view");
        if (!view) return;

        view.classList.remove("login-polish-v76e");
        view.classList.add("login-balanced-v76f");

        const title = view.querySelector("h3");
        const subtitle = view.querySelector(".auth-subtitle-v76e");
        const form = document.getElementById("login-form");
        const social = view.querySelector(".social-login-separator");
        const emailLabel = view.querySelector(".auth-email-label-v76e");

        if (title) {
            title.setAttribute("data-txt", "v76f-login-title");
            title.textContent = textV76f("v76f-login-title", "Willkommen zurück");
        }

        if (subtitle) {
            subtitle.setAttribute("data-txt", "v76f-login-subtitle");
            subtitle.textContent = textV76f("v76f-login-subtitle", "Melde dich mit E-Mail, Passkey, Apple oder Google an.");
        }

        if (emailLabel) emailLabel.remove();

        // Reihenfolge wieder ruhiger/klassischer: Titel, Beschreibung, E-Mail-Formular, Schnell-Login.
        if (form && subtitle && form.previousElementSibling !== subtitle) {
            subtitle.after(form);
        } else if (form && title && !subtitle && form.previousElementSibling !== title) {
            title.after(form);
        }

        if (social && form && social.previousElementSibling !== form) {
            form.after(social);
        }

        if (social) {
            social.classList.remove("quick-login-panel-v76e");
            social.classList.add("quick-login-balanced-v76f");

            const p = social.querySelector("p");
            if (p) {
                p.setAttribute("data-txt", "v76f-login-quick");
                p.textContent = textV76f("v76f-login-quick", "Oder Schnell-Login nutzen");
            }
        }

        // Apple-Logo aus v76e bleibt korrekt.
        translateV76f(view);
    }

    function setupSettingsCompactV76f() {
        ensureTranslationsV76f();
        const view = document.getElementById("modal-settings-view");
        const form = document.getElementById("settings-form");
        if (!view || !form) return;

        view.classList.add("settings-compact-v76f");

        // Profil-Abschnitt einklappen, damit Konto direkt übersichtlicher ist.
        if (!form.closest(".profile-editor-v76f")) {
            const details = document.createElement("details");
            details.className = "profile-editor-v76f";
            details.open = false;

            const summary = document.createElement("summary");
            summary.innerHTML = `
                <span>
                    <strong data-txt="v76f-profile-edit">${textV76f("v76f-profile-edit", "Profil bearbeiten")}</strong>
                    <small data-txt="v76f-profile-edit-help">${textV76f("v76f-profile-edit-help", "Name, Mitgliedsnummer, Profilbild und Passwort ändern.")}</small>
                </span>
                <em>⌄</em>
            `;

            form.before(details);
            details.appendChild(summary);
            details.appendChild(form);
        }

        // Alte Profil-Section-Headline weniger dominant machen
        const titles = view.querySelectorAll(".settings-section-title-v76e");
        titles.forEach(t => {
            if ((t.textContent || "").trim().toLowerCase() === "profil" || (t.getAttribute("data-txt") === "v76e-profile-section")) {
                t.setAttribute("data-txt", "v76f-profile-title");
                t.textContent = textV76f("v76f-profile-title", "Profilübersicht");
            }
        });

        translateV76f(view);
    }

    function runV76f() {
        setupLoginClassicV76f();
        setupSettingsCompactV76f();
    }

    document.addEventListener("DOMContentLoaded", runV76f);
    setTimeout(runV76f, 50);
    setTimeout(runV76f, 350);
    setTimeout(runV76f, 900);

    document.addEventListener("click", (e) => {
        if (e.target.closest("#btn-open-login") || e.target.closest("#btn-open-settings") || e.target.closest("[onclick*='toggleAuthView']")) {
            setTimeout(runV76f, 50);
            setTimeout(runV76f, 250);
        }
    });

    const previousLangHookV76f = window.onLanguageChanged;
    window.onLanguageChanged = function() {
        if (typeof previousLangHookV76f === "function") previousLangHookV76f();
        ensureTranslationsV76f();
        translateV76f(document.getElementById("auth-modal") || document);
    };
})();


// V78L app modal polish: keep chat/inbox above fixed app header and restore shell chrome after close.
(function(){
  if (window.__IPSC_APP_MODAL_POLISH_V78L) return;
  window.__IPSC_APP_MODAL_POLISH_V78L = true;
  window.ipscShowModalV78l = function(id){
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.setProperty('display','flex','important');
    modal.style.setProperty('visibility','visible','important');
    modal.style.setProperty('opacity','1','important');
    modal.style.setProperty('pointer-events','auto','important');
    modal.classList.add('is-open','show');
  };
  window.ipscHideModalV78l = function(id){
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('is-open','show');
    modal.style.display = 'none';
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'ipsc-restore-chrome-v78l' }, window.location.origin); } catch (_) {}
  };
})();
