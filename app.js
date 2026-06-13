let cachedMatches = [];
window.editingMatchId = null; 
window.activeChatRoom = null; 

window.lastChatCheckedTimestamp = localStorage.getItem("lastChatChecked") || new Date().toISOString();

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
                    <button type="button" class="btn-secondary-auth" onclick="loginWithPasskey()">
                        <span>📱</span> Login mit FaceID / Fingerabdruck
                    </button>
                    <div class="modal-divider">oder klassisch mit E-Mail</div>
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
                        <button type="submit" class="btn-primary-auth" data-txt="modal-btn-login">Mit Passwort einloggen</button>
                    </form>
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
})();

document.addEventListener("DOMContentLoaded", () => {
    // Event-Listener für Modal-Close anheften
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

    // Settings-Formular Listener binden
    const settingsForm = document.getElementById("settings-form");
    if (settingsForm) {
        settingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!window.currentUser) return;

            const realNameEl = document.getElementById("settings-real-name");
            const aliasEl = document.getElementById("settings-ipsc-alias");

            const realName = realNameEl ? realNameEl.value.trim() : "";
            const ipscAlias = aliasEl ? aliasEl.value.trim() : "";

            const publicUsername = ipscAlias !== "" ? ipscAlias : window.currentUser.email.split('@')[0];

            const { error } = await window.supabaseClient
                .from("profiles")
                .update({
                    username: publicUsername,
                    ipsc_alias: ipscAlias,
                    real_name: realName
                })
                .eq("id", window.currentUser.id);

            if (error) {
                alert(window.currentLang === "en" ? "Error saving profile: " + error.message : "Fehler beim Speichern des Profils: " + error.message);
            } else {
                alert(window.currentLang === "en" ? "Profile updated successfully!" : "Profil erfolgreich aktualisiert!");
                
                if (window.currentUser.user_metadata) {
                    window.currentUser.user_metadata.username = publicUsername;
                    window.currentUser.user_metadata.ipsc_alias = ipscAlias;
                }
                
                await window.supabaseClient.auth.updateUser({
                    data: { username: publicUsername, ipsc_alias: ipscAlias }
                });

                fetchMatches();
            }
        });
    }

    // Chat-Senden binden
    const chatForm = document.getElementById("chat-send-form");
    if (chatForm) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!window.activeChatRoom || !window.currentUser) return;

            const input = document.getElementById("chat-message-input");
            const editIdInput = document.getElementById("chat-edit-id");
            const messageText = input.value.trim();
            if (!messageText) return;

            const editId = editIdInput ? editIdInput.value : "";

            if (editId) {
                const { error } = await window.supabaseClient.from("chat_messages").update({ message: messageText }).eq("id", editId);
                if (error) {
                    alert("Fehler beim Aktualisieren: " + error.message);
                } else {
                    if (editIdInput) editIdInput.value = "";
                    input.value = "";
                    const sendBtn = document.getElementById("btn-chat-send");
                    if (sendBtn) sendBtn.innerText = window.currentLang === "en" ? "Send" : "Senden";
                    await loadChatMessages();
                }
            } else {
                const { error } = await window.supabaseClient.from("chat_messages").insert([{
                    match_id: window.activeChatRoom.matchId,
                    match_name: window.activeChatRoom.matchName,
                    sender_email: window.currentUser.email,
                    receiver_email: window.activeChatRoom.receiverEmail,
                    message: messageText
                }]);

                if (error) {
                    alert("Fehler beim Senden: " + error.message);
                } else {
                    input.value = "";
                }
            }
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
    container.innerHTML = `<p>${window.translations[window.currentLang]["no-slots"]}</p>`; 
    return; 
  }
  
  window.supabaseClient.from('profiles').select('email, ipsc_alias').then(({data: profiles}) => {
      
      let aliasMap = {};
      if(profiles) {
          profiles.forEach(p => { aliasMap[p.email] = p.ipsc_alias; });
      }

      container.innerHTML = matches.map(m => {
        const isWant = m.type === "want";
        const levelBadge = m.match_level ? `<span class="badge" style="background:#555; color:#fff; padding:2px 5px; border-radius:3px;">${window.escapeHtml(m.match_level)}</span>` : "";
        const squadBadge = m.match_squad ? `<span class="badge" style="background:#3498db; color:#fff; padding:2px 5px; border-radius:3px;">Squad ${window.escapeHtml(m.match_squad)}</span>` : "";
        const countryBadge = m.match_country ? `<span class="badge" style="background:#8e44ad; color:#fff; padding:2px 5px; border-radius:3px;">${window.escapeHtml(m.match_country)}</span>` : "";

        const isSender = window.currentUser && window.currentUser.email === m.seller_email;
        const isAdmin = window.currentUser && window.currentUser.email === "fabian-schoeps@gmx.de";
        const canManage = isSender || isAdmin;

        let sellerAlias = null;
        if(isSender && window.currentUser.user_metadata?.ipsc_alias) {
             sellerAlias = window.currentUser.user_metadata.ipsc_alias;
        } else if (aliasMap[m.seller_email]) {
            sellerAlias = aliasMap[m.seller_email];
        } else if (m.seller_profile && m.seller_profile.ipsc_alias) {
             sellerAlias = m.seller_profile.ipsc_alias;
        } else if (m.author_ipsc_alias) {
             sellerAlias = m.author_ipsc_alias;
        }

        const trustedBadge = (sellerAlias && sellerAlias.trim() !== "") 
            ? `<span class="badge" style="background:var(--success-color); color:#fff; padding:2px 6px; border-radius:3px; display:inline-flex; align-items:center; gap:4px;" title="Verifizierter IPSC Alias: ${window.escapeHtml(sellerAlias)}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Trusted
               </span>` 
            : "";

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
            <div class="match-header-flex">
              ${avatarHtml}
              <div>
                <h3 style="margin: 0;">
                  ${window.escapeHtml(m.match_name)} 
                  ${levelBadge} 
                  ${squadBadge} 
                  ${countryBadge}
                  <span class="badge">${isWant ? window.translations[window.currentLang]["tag-want"] : window.translations[window.currentLang]["tag-offer"]}</span>
                  ${trustedBadge}
                </h3>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-muted);">
                  Inseriert von: <span style="color: var(--accent-color); font-weight: 600; cursor: pointer;" onclick="openUserProfile('${m.seller_email}', '${window.escapeHtml(authorName)}', '${authorAvatar}', '${window.escapeHtml(sellerAlias || '')}')">${window.escapeHtml(authorName)}</span>
                </p>
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
            ${canManage ? `
              <div class="action-buttons-group">
                <button class="btn-mediated" onclick="triggerMediatedModal(${m.id})">Erfolgreich vermittelt</button>
              </div>
              <div class="action-buttons-group">
                <button class="btn-edit" onclick="handleEditClick(${m.id})">${window.translations[window.currentLang]["btn-edit"]}</button>
                <button class="btn-delete" onclick="handleDelete(${m.id}, '${m.seller_email}')">${window.translations[window.currentLang]["btn-delete"]}</button>
              </div>
            ` : ""}
          </div>
        </div>`;
      }).join("");
  }).catch(() => {
      container.innerHTML = matches.map(m => {
        const isWant = m.type === "want";
        const cleanMatchName = m.match_name.replace(/"/g, '&quot;').replace(/'/g, "\\'");
        return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
          <div class="match-details"><h3>${window.escapeHtml(m.match_name)}</h3><p>${m.match_date} | ${window.escapeHtml(m.match_location)}</p></div>
          <div class="card-actions"><p>${parseFloat(m.match_price).toFixed(2)} €</p><button class="btn-contact" onclick="handleContactClick('${m.seller_email}', '${cleanMatchName}', '${m.type}')">Kontakt</button></div>
        </div>`;
      }).join("");
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
  document.getElementById("chat-modal").style.display = "none";
}
window.closeChatSystem = closeChatSystem;

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
  if (!window.currentUser) {
    return alert(window.currentLang === "en" ? "Please log in to see your messages." : "Bitte logge dich ein, um deine Nachrichten zu sehen.");
  }
  
  const modal = document.getElementById("global-inbox-modal");
  if (!modal) return;
  
  if (modal.style.display === "flex") {
    modal.style.display = "none";
    return;
  }
  
  modal.style.display = "flex";

  window.lastChatCheckedTimestamp = new Date().toISOString();
  localStorage.setItem("lastChatChecked", window.lastChatCheckedTimestamp);
  updateHeaderChatBadge(); 

  const listContainer = document.getElementById("global-inbox-list");
  listContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Lade Gespräche...</p>`;

  const { data: allMsgs, error } = await window.supabaseClient
    .from("chat_messages")
    .select("*")
    .or(`sender_email.eq.${window.currentUser.email},receiver_email.eq.${window.currentUser.email}`)
    .order("created_at", { ascending: false });

  if (error || !allMsgs || allMsgs.length === 0) {
    listContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Keine aktiven Nachrichten gefunden.</p>`;
    return;
  }

  let uniqueChats = {};
  allMsgs.forEach(msg => {
    const partner = msg.sender_email.toLowerCase() === window.currentUser.email.toLowerCase() ? msg.receiver_email : msg.sender_email;
    const key = `${msg.match_id}_${partner.toLowerCase()}`;
    if (!uniqueChats[key]) {
      uniqueChats[key] = {
        matchId: msg.match_id,
        matchName: msg.match_name,
        partnerEmail: partner,
        lastMessage: msg.message
      };
    }
  });

  listContainer.innerHTML = Object.values(uniqueChats).map(c => {
    return `<div style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius); cursor: pointer; transition: border-color 0.15s;" 
                 onclick="document.getElementById('global-inbox-modal').style.display='none'; openChatSystem(${c.matchId}, '${c.partnerEmail}', '${c.matchName.replace(/'/g, "\\'")}')">
              <strong style="font-size: 13px; display: block; color: var(--accent-color);">${window.escapeHtml(c.matchName)}</strong>
              <span style="font-size: 11px; color: var(--text-muted); display: block; margin: 2px 0;">Mit: ${window.escapeHtml(c.partnerEmail)}</span>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.escapeHtml(c.lastMessage)}</p>
            </div>`;
  }).join("");
}
window.toggleGlobalInbox = toggleGlobalInbox;

function updateHeaderChatBadge() {
  if (!window.currentUser) return;
  window.supabaseClient
    .from("chat_messages")
    .select("id", { count: 'exact' })
    .eq("receiver_email", window.currentUser.email)
    .gt("created_at", window.lastChatCheckedTimestamp)
    .then(({ count, error }) => {
       const badge = document.getElementById("chat-badge-count");
       if (badge) {
         if (!error && count > 0) {
           badge.innerText = count;
           badge.style.display = "block";
         } else {
           badge.style.display = "none";
         }
       }
    });
}

setTimeout(() => {
  updateHeaderChatBadge();
  if (window.supabaseClient) {
    window.supabaseClient
      .channel('public:chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
          updateHeaderChatBadge();
          
          if (!window.activeChatRoom || !window.currentUser) return;

          if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
              loadChatMessages();
              return;
          }

          const newMsg = payload.new;
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
  document.getElementById("form-anchor").scrollIntoView({ behavior: "smooth" });
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
    const aliasInput = document.getElementById("settings-ipsc-alias");
    const rnInput = document.getElementById("settings-real-name");

    if (!aliasInput || !rnInput) {
        setTimeout(loadUserSettingsProfile, 100);
        return;
    }

    aliasInput.value = profile.ipsc_alias || "";
    rnInput.value = profile.real_name || "";
  }
}

const originalOnAuthChange = window.onAuthChange;
window.onAuthChange = (user) => {
  if (typeof originalOnAuthChange === "function") originalOnAuthChange(user);
  loadUserSettingsProfile();
};

enforceFutureDates();
checkPlannerImport();
fetchMatches();
