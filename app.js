let cachedMatches = [];
window.editingMatchId = null; 
window.activeChatRoom = null; // Speichert den aktiven Chat-Kontext

// Behebt den Badge-Zähler-Fehler: Filtert alte gelesene Nachrichten heraus
window.lastChatCheckedTimestamp = localStorage.getItem("lastChatChecked") || new Date().toISOString();

// Verhindert das Auswählen von Daten in der Vergangenheit
function enforceFutureDates() {
  const dateInput = document.getElementById("match-date");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
  }
}

// Lädt die aktiven Inserate für den Marktplatz (und holt sich Profil-Daten der Verkäufer dazu!)
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

// Zeichnet die Inserate in die HTML-Liste
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

        // Profilbild-Struktur definieren (Fallback auf Initialen-Placeholder, falls kein Bild vorhanden)
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
      // Sicherheitsanker: Falls Profil-Abfrage fehlschlägt, lade Inserate ohne Badge
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

// === NATIVER LIVE-CHAT LOGIK-BLOCK ===
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

  // Reset Editier-Eingabestatus bei Raumwechsel
  const editIdInput = document.getElementById("chat-edit-id");
  if (editIdInput) editIdInput.value = "";
  const msgInput = document.getElementById("chat-message-input");
  if (msgInput) msgInput.value = "";
  const sendBtn = document.getElementById("btn-chat-send");
  if (sendBtn) sendBtn.innerText = window.currentLang === "en" ? "Send" : "Senden";

  await loadChatMessages();
}
window.openChatSystem = openChatSystem;

// Ausgelagerte Render-Funktion für Chat-Nachrichten inkl. Inline-Aktionen (Bearbeiten, Löschen, Melden)
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

// Bereitet ein bestehendes Textfeld auf das Update vor
window.editChatMessage = function(id, text) {
  const editIdInput = document.getElementById("chat-edit-id");
  const msgInput = document.getElementById("chat-message-input");
  const sendBtn = document.getElementById("btn-chat-send");
  
  if (editIdInput) editIdInput.value = id;
  if (msgInput) { msgInput.value = text; msgInput.focus(); }
  if (sendBtn) sendBtn.innerText = window.currentLang === "en" ? "Save" : "Speichern";
};

// Führt ein physisches Löschen der Nachricht in Supabase aus
window.deleteChatMessage = async function(id) {
  if (!confirm(window.currentLang === "en" ? "Delete this message?" : "Möchtest du diese Nachricht wirklich löschen?")) return;
  const { error } = await window.supabaseClient.from("chat_messages").delete().eq("id", id);
  if (error) alert("Fehler: " + error.message);
  else await loadChatMessages();
};

// Generiert einen mailto-Report-Link zur Benachrichtigung des Admins
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

// Senden oder Aktualisieren einer Nachricht über dasselbe Formular
document.getElementById("chat-send-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.activeChatRoom || !window.currentUser) return;

  const input = document.getElementById("chat-message-input");
  const editIdInput = document.getElementById("chat-edit-id");
  const messageText = input.value.trim();
  if (!messageText) return;

  const editId = editIdInput ? editIdInput.value : "";

  if (editId) {
    // UPDATE Modus ausführen
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
    // Klassischer INSERT Modus
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

// Halb-automatischer E-Mail-Reminder aus dem Live-Chat heraus
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

// Öffnet oder schließt die Chat-Übersicht im Header
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

  // Fix für falsche Rote "1": Klick auf Inbox setzt den Gelesen-Zeitstempel auf JETZT
  window.lastChatCheckedTimestamp = new Date().toISOString();
  localStorage.setItem("lastChatChecked", window.lastChatCheckedTimestamp);
  updateHeaderChatBadge(); // Badge direkt visuell löschen

  const listContainer = document.getElementById("global-inbox-list");
  listContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Lade Gespräche...</p>`;

  // Hole alle Nachrichten, bei denen der Nutzer beteiligt ist
  const { data: allMsgs, error } = await window.supabaseClient
    .from("chat_messages")
    .select("*")
    .or(`sender_email.eq.${window.currentUser.email},receiver_email.eq.${window.currentUser.email}`)
    .order("created_at", { ascending: false });

  if (error || !allMsgs || allMsgs.length === 0) {
    listContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Keine aktiven Nachrichten gefunden.</p>`;
    return;
  }

  // Filtert doppelte Chats heraus, sodass jeder Match-Chat nur einmal auftaucht
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

// Live-Zähler im Header korrigiert: Holt nur ungesehene Nachrichten seit dem letzten Inbox-Klick
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

// ABONNEMENT DER SUPABASE REALTIME-SCHNITTSTELLE FÜR LIVE-UPDATES
setTimeout(() => {
  updateHeaderChatBadge();
  if (window.supabaseClient) {
    window.supabaseClient
      .channel('public:chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
          updateHeaderChatBadge();
          
          if (!window.activeChatRoom || !window.currentUser) return;

          // Bei Updates oder Löschvorgängen wird der Verlauf sofort für beide Anwesenden neu geladen
          if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
              loadChatMessages();
              return;
          }

          const newMsg = payload.new;
          // Prüfen, ob die empfangene Nachricht zum aktuell geöffneten Chatraum gehört
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
// =============================================

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
// NEU: AUTOMATISCHE LADEN & SPEICHERN LOGIK FÜR DEN ECHTEN CLAR-NAMEN
// =========================================================================
async function loadUserSettingsProfile() {
  if (!window.currentUser) return;
  const { data: profile, error } = await window.supabaseClient
    .from("profiles")
    .select("username, ipsc_alias, real_name")
    .eq("id", window.currentUser.id)
    .single();
  
  if (!error && profile) {
    if (document.getElementById("settings-username")) document.getElementById("settings-username").value = profile.username || "";
    if (document.getElementById("settings-ipsc-alias")) document.getElementById("settings-ipsc-alias").value = profile.ipsc_alias || "";
    if (document.getElementById("settings-real-name")) document.getElementById("settings-real-name").value = profile.real_name || "";
  }
}

// Bestehenden Auth-Hook erweitern, ohne die alte Logik zu überschreiben
const originalOnAuthChange = window.onAuthChange;
window.onAuthChange = () => {
  if (typeof originalOnAuthChange === "function") originalOnAuthChange();
  loadUserSettingsProfile();
};

// Event-Listener für das Absenden des Einstellungs-Formulars abfangen und wegschreiben
document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.currentUser) return;

  const username = document.getElementById("settings-username")?.value.trim();
  const ipscAlias = document.getElementById("settings-ipsc-alias")?.value.trim();
  const realName = document.getElementById("settings-real-name")?.value.trim();

  const { error } = await window.supabaseClient
    .from("profiles")
    .update({
      username: username,
      ipsc_alias: ipscAlias,
      real_name: realName
    })
    .eq("id", window.currentUser.id);

  if (error) {
    alert(window.currentLang === "en" ? "Error saving profile: " + error.message : "Fehler beim Speichern des Profils: " + error.message);
  } else {
    alert(window.currentLang === "en" ? "Profile updated successfully!" : "Profil erfolgreich aktualisiert!");
    if (window.currentUser.user_metadata) {
      window.currentUser.user_metadata.username = username;
      window.currentUser.user_metadata.ipsc_alias = ipscAlias;
    }
    fetchMatches();
  }
});

enforceFutureDates();
checkPlannerImport();
fetchMatches();
