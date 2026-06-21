// V78U final release polish: robust i18n + ELO planner quick matches
(function(){
  if (window.__IPSC_RELEASE_I18N_V78U) return;
  window.__IPSC_RELEASE_I18N_V78U = true;

  function lang(){
    var l = (localStorage.getItem('selectedLanguage') || window.currentLang || document.documentElement.lang || 'de').toLowerCase();
    return l === 'en' ? 'en' : 'de';
  }
  function isEn(){ return lang() === 'en'; }
  function esc(s){
    var d=document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML;
  }
  function norm(s){ return String(s || '').replace(/\s+/g,' ').trim(); }
  function t(key){
    var dict = I18N[lang()] || I18N.de;
    return dict[key] || (I18N.de && I18N.de[key]) || key;
  }

  var I18N = {
    de: {
      dashTitle:'Was möchtest du erledigen?', dashSub:'Die wichtigsten Bereiche direkt griffbereit.', dashboard:'Dashboard',
      plannerPast:'Vergangene Matches 2026', plannerDone:'✓ Erledigt', plannerDoneMark:'✓ Erledigt markieren', plannerList:'📢 Inserieren', plannerDelete:'Löschen', plannerNoOpen:'Keine offenen Matches.',
      mapsApple:' Karten', mapsGoogle:'Google Maps', accTitle:'🏨 Unterkunft / Übernachtung', accName:'Unterkunft', accAddress:'Adresse', accCheckIn:'Check-in', accCheckOut:'Check-out', accNotes:'Notizen', accBooked:'Unterkunft gebucht / erledigt', accSave:'In Cloud speichern', accHint:'Wird in deinem Account gespeichert.', accSaved:'✓ Gespeichert', accBookedStatus:'✓ Gebucht',
      logPdfHint:'PDF enthält bestätigte Einträge inkl. Finger-Unterschrift, Hashdaten und QR-Prüfcode.', hashOk:'Hash geprüft & gesperrt', hashLocal:'Lokal geprüft & gesperrt', confirmedBy:'Bestätigt durch', stamped:'✓ Bestätigt',
      timerArchiveTitle:'Timer-Archiv', timerArchiveDesc:'Lies den internen Speicher deines SG-Timers per Bluetooth aus und übernimm gespeicherte Durchgänge direkt in dein Trainingstagebuch.', timerArchiveBtn:'🔍 Timer-Archiv abrufen', randomPar:'Zufällig (1.0s - 4.0s) 🎲', currentRun:'🎯 Aktueller Durchgang', noShot:'Keine Schussdaten aktiv. Warte auf Signal...', split:'Splitzeit', total:'Gesamtzeit', shotNo:'Schuss-Nr.', save:'Speichern',
      eloUpcoming:'🎯 Deine anstehenden Matches (aus Mein Planer)', eloClick:'Klicken zum Analysieren', eloNoLink:'IPSCMatch-Link fehlt noch im Planer.', eloLoading:'Lade Planer-Matches...', eloArchived:'Bereits analysiert',
      loginNow:'Jetzt einloggen', notLogged:'Nicht angemeldet', cloudStorage:'Cloud-Speicher',
      licenseDesc:'Optional. Nicht öffentlich. Nur für interne Zuordnung und geschützte Vereinsfunktionen.'
    },
    en: {
      dashTitle:'What would you like to do?', dashSub:'Key sections ready at your fingertips.', dashboard:'Dashboard',
      plannerPast:'Past matches 2026', plannerDone:'✓ Done', plannerDoneMark:'✓ Mark done', plannerList:'📢 Create listing', plannerDelete:'Delete', plannerNoOpen:'No open matches.',
      mapsApple:' Apple Maps', mapsGoogle:'Google Maps', accTitle:'🏨 Accommodation / Overnight', accName:'Accommodation', accAddress:'Address', accCheckIn:'Check-in', accCheckOut:'Check-out', accNotes:'Notes', accBooked:'Accommodation booked / done', accSave:'Save to cloud', accHint:'Saved to your account.', accSaved:'✓ Saved', accBookedStatus:'✓ Booked',
      logPdfHint:'PDF contains confirmed entries incl. finger signature, hash data and QR verification code.', hashOk:'Hash verified & locked', hashLocal:'Locally verified & locked', confirmedBy:'Confirmed by', stamped:'✓ Stamped',
      timerArchiveTitle:'Timer archive', timerArchiveDesc:'Read your SG Timer’s internal memory via Bluetooth and import saved runs directly into your training log.', timerArchiveBtn:'🔍 Fetch timer archive', randomPar:'Random (1.0s - 4.0s) 🎲', currentRun:'🎯 Current run', noShot:'No shot data active. Waiting for signal...', split:'Split time', total:'Total time', shotNo:'Shot No.', save:'Save',
      eloUpcoming:'🎯 Your upcoming matches (from My Planner)', eloClick:'Click to analyze', eloNoLink:'IPSCMatch link is still missing in My Planner.', eloLoading:'Loading planner matches...', eloArchived:'Already analyzed',
      loginNow:'Log in now', notLogged:'Not logged in', cloudStorage:'Cloud storage',
      licenseDesc:'Optional. Not public. Only for internal matching and protected club functions.'
    }
  };

  function addPortalTranslations(){
    window.portalTranslations = window.portalTranslations || {de:{}, en:{}};
    window.portalTranslations.de = window.portalTranslations.de || {};
    window.portalTranslations.en = window.portalTranslations.en || {};
    Object.assign(window.portalTranslations.de, {
      'v76-elo-upcoming-title': I18N.de.eloUpcoming,
      'lbl-ipsc-alias-desc': I18N.de.licenseDesc,
      'planner-no-open': I18N.de.plannerNoOpen
    });
    Object.assign(window.portalTranslations.en, {
      'v76-elo-upcoming-title': I18N.en.eloUpcoming,
      'lbl-ipsc-alias-desc': I18N.en.licenseDesc,
      'planner-no-open': I18N.en.plannerNoOpen,
      'planner-title-my-matches':'My matches',
      'planner-subtitle-planned':'Planned matches',
      'planner-no-matches':'No matches added yet.',
      'planner-btn-export':'📅 Export to Calendar (.ics)',
      'v76-timer-tab-live':'Console',
      'v76-timer-tab-scores':'Leaderboards',
      'sg-timer-device-archive':'Timer archive',
      'sg-timer-current-run':'🎯 Current run',
      'tools-db-btn-save':'💾 Save recipe',
      'tools-th-name':'Shot No.',
      'tools-th-time':'Total time'
    });
    window.translations = window.translations || window.portalTranslations;
    window.translations.de = window.translations.de || window.portalTranslations.de;
    window.translations.en = window.translations.en || window.portalTranslations.en;
  }

  function setIfText(el, value){ if(el && norm(el.textContent) !== value) el.textContent = value; }
  function setHtml(el, value){ if(el && el.innerHTML !== value) el.innerHTML = value; }

  var exactPairs = [
    ['Was möchtest du erledigen?', 'What would you like to do?'],
    ['Die wichtigsten Bereiche direkt griffbereit.', 'Key sections ready at your fingertips.'],
    ['Meine Trainings', 'My trainings'], ['Meine Matches','My matches'], ['Geplante Matches','Planned matches'],
    ['PDF enthält bestätigte Einträge inkl. Finger-Unterschrift, Hashdaten und QR-Prüfcode.', 'PDF contains confirmed entries incl. finger signature, hash data and QR verification code.'],
    ['Hash geprüft & gesperrt', 'Hash verified & locked'], ['Lokal geprüft & gesperrt','Locally verified & locked'],
    ['Unterkunft / Übernachtung', 'Accommodation / Overnight'], ['✓ Erledigt markieren','✓ Mark done'], ['✓ Erledigt','✓ Done'], ['Inserieren','Create listing'], ['Löschen','Delete'],
    ['Karten','Apple Maps'], [' Karten',' Apple Maps'], ['In Cloud speichern','Save to cloud'], ['Wird in deinem Account gespeichert.','Saved to your account.'], ['Unterkunft gebucht / erledigt','Accommodation booked / done'],
    ['Vergangene Matches 2026', 'Past matches 2026'], ['Keine offenen Matches.', 'No open matches.'],
    ['Zufällig (1.0s - 4.0s) 🎲','Random (1.0s - 4.0s) 🎲'], ['Zufällig (1,0s - 4,0s) 🎲','Random (1.0s - 4.0s) 🎲'],
    ['Timer-Archiv', 'Timer archive'], ['Timer-Archiv abrufen','Fetch timer archive'], ['🔍 Timer-Archiv abrufen','🔍 Fetch timer archive'],
    ['Lies den internen Speicher deines SG-Timers per Bluetooth aus und übernimm gespeicherte Durchgänge direkt in dein Trainingstagebuch.', 'Read your SG Timer’s internal memory via Bluetooth and import saved runs directly into your training log.'],
    ['Aktueller Durchgang','Current run'], ['🎯 Aktueller Durchgang','🎯 Current run'], ['Keine Schussdaten aktiv. Warte auf Signal...','No shot data active. Waiting for signal...'],
    ['Splitzeit','Split time'], ['Gesamtzeit','Total time'], ['Schuss-Nr.','Shot No.'], ['Schütze','Shooter'], ['Platz','Rank'], ['Verifizierte Zeit','Verified time'],
    ['Deine anstehenden Matches (aus Mein Planer)', 'Your upcoming matches (from My Planner)'], ['Klicken zum Analysieren','Click to analyze'], ['IPSCMatch-Link fehlt noch im Planer.','IPSCMatch link is still missing in My Planner.'],
    ['Noch keine Match-Analysen gespeichert.','No match analyses saved yet.'], ['Bisherige Match-Analysen','Previous match analyses'], ['Analysiere Starterfeld...','Analyzing starter field...'], ['Texterkennung läuft und ELO-Datenbank wird abgefragt.','Text recognition is running and the ELO database is being checked.'],
    ['Nicht angemeldet','Not logged in'], ['Jetzt einloggen','Log in now'], ['Cloud-Speicher','Cloud storage']
  ];
  function reverseMap(){ var m={}; exactPairs.forEach(function(p){ m[p[1]]=p[0]; }); return m; }
  function forwardMap(){ var m={}; exactPairs.forEach(function(p){ m[p[0]]=p[1]; }); return m; }

  function replaceExactText(){
    var map = isEn() ? forwardMap() : reverseMap();
    var nodes = document.querySelectorAll('button,a,span,h1,h2,h3,h4,p,label,option,td,th,strong,em,div.dash-action,div.archive-empty,div.upload-title,div.upload-desc,div.locked-info,div.pdf-export-hint');
    nodes.forEach(function(el){
      if (!el || el.dataset && el.dataset.v78uKeep) return;
      var txt = norm(el.textContent || '');
      if (map[txt]) {
        if (el.children && el.children.length > 1 && !/^(button|a|span|label|option)$/i.test(el.tagName)) return;
        el.textContent = map[txt];
      }
    });
  }

  function polishIndex(){
    if (!document.body.classList.contains('page-index')) return;
    var heading = document.querySelector('.app-section-heading-v71');
    if (!heading) return;
    var span = heading.querySelector('span');
    var h3 = heading.querySelector('h3');
    var p = heading.querySelector('p');
    setIfText(span, t('dashboard'));
    setIfText(h3, t('dashTitle'));
    setIfText(p, t('dashSub'));
  }

  function polishPlanner(){
    if (!document.body.classList.contains('page-mein-planer')) return;
    document.querySelectorAll('.planner-complete-btn').forEach(function(btn){
      var done = btn.classList.contains('is-done') || /✓\s*(Erledigt|Done)$/i.test(norm(btn.textContent));
      btn.textContent = done ? t('plannerDone') : t('plannerDoneMark');
    });
    document.querySelectorAll('.planner-insert-btn').forEach(function(btn){ btn.textContent = t('plannerList'); });
    document.querySelectorAll('.planner-delete-btn,.delete-btn').forEach(function(btn){ if (/Löschen|Delete/i.test(btn.textContent)) btn.textContent = t('plannerDelete'); });
    document.querySelectorAll('.planner-map-btn.apple').forEach(function(btn){ btn.textContent = t('mapsApple'); });
    document.querySelectorAll('.planner-past-block > summary').forEach(function(s){
      var count = (s.textContent.match(/\((\d+)\)/)||[])[1] || '';
      s.textContent = t('plannerPast') + (count ? ' ('+count+')' : '');
    });
    document.querySelectorAll('.planner-accommodation-box-v78n summary span:first-child').forEach(function(s){ s.textContent=t('accTitle'); });
    document.querySelectorAll('.planner-accommodation-save-v78n').forEach(function(b){ b.textContent=t('accSave'); });
    document.querySelectorAll('.planner-accommodation-hint-v78n').forEach(function(s){ if(!/Fehler|error/i.test(s.textContent)) s.textContent=t('accHint'); });
    document.querySelectorAll('.planner-accommodation-booked-v78n').forEach(function(label){
      var input = label.querySelector('input'); label.innerHTML=''; if(input) label.appendChild(input); label.appendChild(document.createTextNode(' '+t('accBooked')));
    });
    var exportBtn = document.querySelector('[onclick="exportToCalendar()"]'); if(exportBtn) exportBtn.textContent = isEn() ? '📅 Export to Calendar (.ics)' : '📅 In Kalender exportieren (.ics)';
  }

  function polishSchiessbuch(){
    if (!document.body.classList.contains('page-schiessbuch')) return;
    document.querySelectorAll('.pdf-export-hint,#schiessbuch-pdf-hint-v57').forEach(function(el){ el.textContent = t('logPdfHint'); });
    document.querySelectorAll('.integrity-badge,.locked-info,.hash-status,.badge').forEach(function(el){
      var txt = norm(el.textContent);
      if (/Hash geprüft|Hash verified/.test(txt)) el.textContent = '✅ ' + t('hashOk');
      if (/Lokal geprüft|Locally verified/.test(txt)) el.textContent = '✅ ' + t('hashLocal');
      if (/Stamped|Bestätigt/.test(txt) && el.classList.contains('badge')) el.textContent = t('stamped');
    });
    document.querySelectorAll('.locked-info').forEach(function(el){
      if (isEn() && /Locked securely/.test(el.textContent)) el.textContent = el.textContent.replace('Locked securely', t('confirmedBy'));
      if (!isEn() && /Confirmed by/.test(el.textContent)) el.textContent = el.textContent.replace('Confirmed by', t('confirmedBy'));
    });
  }

  function polishTimer(){
    if (!document.body.classList.contains('page-sg-timer-live')) return;
    var title = Array.from(document.querySelectorAll('h2')).find(function(h){ return /Timer[- ]?Archiv|Timer archive/i.test(h.textContent); });
    if (title) title.textContent = t('timerArchiveTitle');
    document.querySelectorAll('p').forEach(function(p){
      var txt=norm(p.textContent);
      if (/internen Speicher deines SG-Timers|internal memory/i.test(txt)) p.textContent = t('timerArchiveDesc');
    });
    var fetchBtn = document.getElementById('btn-fetch-archive'); if(fetchBtn) fetchBtn.textContent = t('timerArchiveBtn');
    var stageTitle=document.getElementById('stage-card-title'); if(stageTitle) stageTitle.textContent=t('currentRun');
    var ph=document.getElementById('js-txt-table-placeholder'); if(ph) ph.textContent=t('noShot');
    document.querySelectorAll('th').forEach(function(th){
      var txt=norm(th.textContent);
      if(txt==='Splitzeit' || txt==='Split time') th.textContent=t('split');
      if(txt==='Gesamtzeit' || txt==='Total time') th.textContent=t('total');
      if(txt==='Schuss-Nr.' || txt==='Shot No.') th.textContent=t('shotNo');
    });
    document.querySelectorAll('option').forEach(function(o){ if(/Zufällig|Random/.test(o.textContent)) o.textContent=t('randomPar'); });
  }

  function polishSettings(){
    var modal = document.getElementById('auth-modal'); if(!modal) return;
    modal.querySelectorAll('label,p,small,span,div').forEach(function(el){
      var txt=norm(el.textContent);
      if(/Startplatz-Bot|Slot Bot/.test(txt) && /Lizenz|license|Mitglied|Member/i.test(txt)) el.textContent = t('licenseDesc');
    });
    modal.querySelectorAll('[data-txt="lbl-ipsc-alias-desc"]').forEach(function(el){ el.textContent=t('licenseDesc'); });
  }

  function patchPlannerSourceRuntime(){
    if (!document.body.classList.contains('page-mein-planer')) return;
    if (window.__IPSC_PLANNER_RUNTIME_V78U) return;
    window.__IPSC_PLANNER_RUNTIME_V78U = true;
    var oldRender = window.renderMatches;
    if (typeof oldRender === 'function') {
      window.renderMatches = function(){ oldRender.apply(this, arguments); setTimeout(polishPlanner,0); setTimeout(polishPlanner,80); };
    }
  }

  function normName(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
      .replace(/[^a-z0-9]+/g,' ').trim();
  }
  function getField(row, names){
    row=row||{}; for(var i=0;i<names.length;i++){ var k=names[i]; if(Object.prototype.hasOwnProperty.call(row,k) && row[k] != null && String(row[k]).trim() !== '') return row[k]; }
    return '';
  }
  function getUrlFromRow(row){
    var candidates = ['analysis_url','performance_url','match_url','ipscmatch_url','ipsc_match_url','match_link','link','url','source_url','registration_url','complist_url'];
    for(var i=0;i<candidates.length;i++){ var v=getField(row,[candidates[i]]); if(v) return String(v).trim(); }
    var id = getField(row,['ipscmatch_id','ipsc_match_id','external_match_id','matchsign_id','match_id','remote_match_id','external_id']);
    if(id && /^[A-Za-z0-9_-]{2,20}$/.test(String(id))) return 'https://ipscmatch.de/index.pl?lang=de&match=' + encodeURIComponent(String(id));
    return '';
  }
  function rowToPlanner(row){
    row = row || {};
    var copy = Object.assign({}, row);
    copy.match_name = getField(copy,['match_name','name','title','event_name','competition_name','match','match_title']) || 'Match';
    copy.match_date = getField(copy,['match_date','date','datum','event_date','start_date','starts_at','match_day']) || '';
    copy.match_location = getField(copy,['match_location','location','ort','venue','address','place','range']) || '';
    copy.status = getField(copy,['status','registration_status','approval_status','state','match_status']) || copy.status || '';
    copy.squad = getField(copy,['squad','squad_name','squad_number','squad_no','squad_id']) || copy.squad || '';
    copy.division = getField(copy,['division','match_division','ipsc_division','grepdiv','class']) || copy.division || '';
    copy.match_url = getUrlFromRow(copy);
    copy.__plannerRawV78u = row;
    return copy;
  }
  function dateOk(row){
    var v = getField(row,['match_date','date','datum','event_date','start_date','starts_at','match_day']);
    if(!v) return true;
    var d = new Date(v); if(isNaN(d.getTime())) return true;
    var today = new Date(); today.setHours(0,0,0,0); return d >= today;
  }
  function approved(row){
    var st = norm(getField(row,['status','registration_status','approval_status','state','match_status'])).toLowerCase();
    var squad = norm(getField(row,['squad','squad_name','squad_number','squad_no','squad_id'])).toLowerCase();
    if(/warteliste|waiting|waitlist|declined|cancel|abgesagt|99|wait/.test(st+' '+squad)) return false;
    if(/approved|bestätigt|bestaetigt|accepted|zugelassen|registered|angemeldet/.test(st)) return true;
    return !!(squad && !/tbd|wait|99/.test(squad));
  }
  function belongs(row, user, profile, strictPublic){
    row=row||{}; user=user||{}; profile=profile||{};
    var uid = getField(row,['user_id','profile_id','owner_id','created_by','created_by_id','account_id']);
    if(uid) return String(uid) === String(user.id || '');
    var email = String(user.email || '').toLowerCase();
    var rowEmail = String(getField(row,['email','user_email','shooter_email','account_email'])).toLowerCase();
    if(email && rowEmail && email === rowEmail) return true;
    var profileNames = [profile.real_name, profile.username, user.email && user.email.split('@')[0]].filter(Boolean).map(normName);
    var rowNames = [getField(row,['real_name','shooter_name','competitor_name','participant_name','member_name','name','full_name'])].filter(Boolean).map(normName);
    if(rowNames.length && profileNames.some(function(p){ return rowNames.some(function(r){ return r === p || r.includes(p) || p.includes(r); }); })) return true;
    return !strictPublic;
  }
  async function queryTable(table, user, profile, strictPublic){
    if(!window.supabaseClient) return [];
    var out=[];
    try {
      var q = window.supabaseClient.from(table).select('*');
      var res = await q;
      if(res && !res.error && Array.isArray(res.data)) out = res.data.filter(function(r){ return belongs(r,user,profile,strictPublic); });
    } catch(e) {}
    return out;
  }
  function dedupe(rows){
    var map=new Map();
    rows.map(rowToPlanner).forEach(function(m){
      if(!dateOk(m) || !approved(m)) return;
      var key = normName(m.match_name)+'|'+String(m.match_date||'')+'|'+normName(m.match_location||'');
      var old=map.get(key);
      if(!old || (m.match_url && !old.match_url)) map.set(key,m);
    });
    return Array.from(map.values()).sort(function(a,b){
      var da=new Date(a.match_date), db=new Date(b.match_date);
      return (isNaN(da)?9999999999999:da.getTime()) - (isNaN(db)?9999999999999:db.getTime());
    });
  }

  function renderEloQuick(matches){
    var section=document.getElementById('quick-analyze-section'), box=document.getElementById('quick-analyze-buttons');
    if(!section || !box) return;
    box.innerHTML='';
    var title=section.querySelector('[data-txt="v76-elo-upcoming-title"]') || section.querySelector('h4 span');
    if(title) title.textContent=t('eloUpcoming');
    if(!matches || !matches.length){ section.style.display='none'; return; }
    matches.forEach(function(m){
      var btn=document.createElement('button');
      btn.className='archive-btn planner-quick-btn-v76j planner-quick-btn-v78u';
      btn.style.width='100%'; btn.style.textAlign='left'; btn.style.padding='12px 15px';
      var label = (typeof window.plannedMatchLabelV76j === 'function') ? window.plannedMatchLabelV76j(m) : (esc(m.match_name || 'Match'));
      if(m.match_url){
        btn.innerHTML = '📊 ' + label + '<br><small>'+esc(t('eloClick'))+'</small>';
        btn.onclick = function(){
          try { if (typeof window.importPlannedMatch === 'function') return window.importPlannedMatch(m); } catch(e) { console.warn(e); }
          var inp=document.getElementById('match-url'); if(inp) inp.value=m.match_url;
          if(typeof window.importMatchFromUrl === 'function') window.importMatchFromUrl();
        };
      } else {
        btn.disabled=true;
        btn.innerHTML = '⏳ ' + label + '<br><small>'+esc(t('eloNoLink'))+'</small>';
      }
      box.appendChild(btn);
    });
    section.style.display='block';
  }

  async function loadPlannerForEloV78u(user, profile){
    var rows=[];
    async function addFrom(table, strictPublic){
      var r=await queryTable(table,user,profile,strictPublic); rows = rows.concat(r||[]);
    }
    await addFrom('user_matches', false);
    await addFrom('planner_matches', false);
    await addFrom('planned_matches', false);
    await addFrom('upcoming_matches', true);
    return dedupe(rows);
  }

  function patchPerformance(){
    if(!document.body.classList.contains('page-performance')) return;
    if(window.__IPSC_PERF_V78U_PATCHED) return;
    window.__IPSC_PERF_V78U_PATCHED=true;
    window.renderUpcomingPlannerMatchesV76j = function(matches){ renderEloQuick(dedupe(matches||[])); };
    var oldProcess = window.processUserProfile;
    if(typeof oldProcess === 'function'){
      window.processUserProfile = async function(user){
        var ret = await oldProcess.apply(this, arguments);
        try {
          if(user && window.userProfileData && window.hasDoppelAaAccess && window.hasDoppelAaAccess(window.userProfileData)){
            var matches = await loadPlannerForEloV78u(user, window.userProfileData);
            renderEloQuick(matches);
          }
        } catch(e){ console.warn('ELO Planner v78u failed', e); }
        return ret;
      };
    }
    setTimeout(async function(){
      try {
        var user = (typeof window.getCurrentAuthUser === 'function') ? await window.getCurrentAuthUser() : (window.currentUser || null);
        if(user){
          var profile = window.userProfileData || {};
          var matches = await loadPlannerForEloV78u(user, profile);
          renderEloQuick(matches);
        }
      } catch(e) {}
    }, 900);
  }

  function run(){
    addPortalTranslations();
    polishIndex(); polishPlanner(); polishSchiessbuch(); polishTimer(); polishSettings(); replaceExactText(); patchPlannerSourceRuntime(); patchPerformance();
  }
  var pending=false;
  function schedule(){ if(pending) return; pending=true; setTimeout(function(){ pending=false; run(); }, 30); }
  var oldLang=window.onLanguageChanged;
  window.onLanguageChanged=function(){ if(typeof oldLang==='function') oldLang.apply(this,arguments); schedule(); setTimeout(run,120); setTimeout(run,500); };
  document.addEventListener('change', function(e){ if(e.target && e.target.id==='language-select') schedule(); }, true);
  document.addEventListener('DOMContentLoaded', function(){ run(); setTimeout(run,100); setTimeout(run,600); });
  window.addEventListener('load', function(){ run(); setTimeout(run,250); setTimeout(run,1000); });
  try { new MutationObserver(schedule).observe(document.documentElement, {childList:true, subtree:true, characterData:true}); } catch(e) {}
  setTimeout(run,50); setTimeout(run,300); setTimeout(run,1200);
})();
