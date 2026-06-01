let cachedMatches = [];
window.editingMatchId = null; 

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

        return `<div class="match-card ${isWant ? "card-want" : "card-offer"}">
          <div class="match-details">
            <h3>
              ${window.escapeHtml(m.match_name)} 
              ${levelBadge} 
              ${squadBadge} 
              ${countryBadge}
              <span class="badge">${isWant ? window.translations[window.currentLang]["tag-want"] : window.translations[window.currentLang]["tag-offer"]}</span>
              ${trustedBadge}
            </h3>
            <p>${m.match_date} | ${window.escapeHtml(m.match_location)}</p>
          </div>
          <div class="card-actions">
            <p>${parseFloat(m.match_price).toFixed(2)} €</p>
            <button class="${contactBtnClass}" onclick="handleContactClick('${m.seller_email}', '${cleanMatchName}', '${m.type}')">${contactText}</button>
            <div class="action-buttons-group">
                <button class="btn-export" onclick="exportToIcs(${m.id})">${window.translations[window.currentLang]["btn-export"]}</button>
                <button class="btn-report" onclick="reportMatch(${m.id})">${window.translations[window.currentLang]["report-btn"]}</button>
            </div>
            ${canManage ? `
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
      return alert("Fehler: Unberechtigt."); 
  }
  
  const text = isAdmin && !isOwner 
    ? "Möchtest du diesen fremden Eintrag als ADMIN unwiderruflich löschen?" 
    : "Möchtest du diesen Eintrag wirklich unwiderruflich löschen?";
    
  if (!confirm(text)) return;
  
  await window.supabaseClient.from("matches").delete().eq("id", id);
  if (window.editingMatchId === id) resetFormState();
  fetchMatches();
}

document.getElementById("match-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.currentUser) return alert("Bitte melde dich an.");
  
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
  if (spamError) return alert("Fehler bei der Spam-Prüfung: " + spamError.message);
  if (duplicateEntries && duplicateEntries.length > 0) return alert(window.translations[window.currentLang]["spam-error"]);

  const matchData = {
    match_name: matchName,
    match_level: document.getElementById("match-level").value,
    match_date: inputDate,
    match_location: document.getElementById("match-location").value,
    match_country: document.getElementById("match-country").value,
    match_price: document.getElementById("match-price").value,
    seller_email: window.currentUser.email,
    type: document.getElementById("type-want").checked ? "want" : "offer"
  };
  
  matchData.match_squad = document.getElementById("match-squad").value || null;

  if (window.editingMatchId !== null) {
    const { error } = await window.supabaseClient.from("matches").update(matchData).eq("id", window.editingMatchId);
    if (error) alert("Fehler beim Aktualisieren: " + error.message);
  } else {
    const { error } = await window.supabaseClient.from("matches").insert([matchData]);
    if (error) alert("Fehler beim Erstellen: " + error.message);
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

window.onAuthChange = () => { fetchMatches(); };
window.onLanguageChanged = () => { if (cachedMatches.length > 0) { renderMatches(cachedMatches); } };

enforceFutureDates();
checkPlannerImport();
fetchMatches();
