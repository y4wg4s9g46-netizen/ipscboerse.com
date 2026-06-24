/* V78F Full-Page Frame SPA Shell
   Goal: keep the browser website exactly as-is while the iOS app gets zero-flash navigation.
   Instead of extracting/replaying page DOM, every app view is the original page inside a same-origin iframe.
   This preserves layout, translations, data loading and page-specific scripts from the backup line.
*/
(function IPSCAppFrameSpaV78X(){
  if (window.__IPSC_APP_FRAME_SPA_V78X) return;
  window.__IPSC_APP_FRAME_SPA_V78X = true;
  window.__IPSC_UNIFIED_SPA_ACTIVE = true;

  const VERSION = '79x';
  const VIEW_MAP = {
    'index.html': { title: 'Start' },
    'marktplatz.html': { title: 'Marktplatz' },
    'mein-planer.html': { title: 'Mein Planer' },
    'community.html': { title: 'Community' },
    'freie-matches.html': { title: 'Matches' },
    'schiessbuch.html': { title: 'Schießbuch' },
    'sg-timer-live.html': { title: 'SG-Timer Live' },
    'tools.html': { title: 'Tools & Training' },
    'analytics.html': { title: 'Statistiken' },
    'wiederladen.html': { title: 'Wiederladen' },
    'ipsc-hub.html': { title: 'IPSC Hub' },
    'doppel-aa.html': { title: 'Startplatz-Bot' },
    'performance.html': { title: 'ELO-Vergleich' },
    'impressum.html': { title: 'Impressum' },
    'reset.html': { title: 'Passwort zurücksetzen' },
    'schiessbuch-confirm.html': { title: 'Schießbuch bestätigen' },
    'schiessbuch-verify.html': { title: 'Schießbuch prüfen' }
  };
  const CLUB_PAGES = new Set(['doppel-aa.html','performance.html']);
  const MORE_PAGES = new Set(['freie-matches.html','schiessbuch.html','sg-timer-live.html','tools.html','analytics.html','wiederladen.html','ipsc-hub.html','doppel-aa.html','performance.html']);
  const clubAccessV78v = { allowed: false, checked: false, checking: false };
  const CORE_PRELOAD = []; // v78x: kein Hintergrund-Preload; Seiten laden erst bei echtem Tap und bleiben dann gecacht

  const SIDEBAR_SECTIONS = [
    { title: { de: 'Hauptbereiche', en: 'Main' }, items: [
      { file: 'index.html', icon: '🏠', de: 'Startseite', en: 'Home' },
      { file: 'marktplatz.html', icon: '🛒', de: 'Marktplatz', en: 'Market' },
      { file: 'freie-matches.html', icon: '🎟️', de: 'Matches', en: 'Matches' },
      { file: 'mein-planer.html', icon: '📅', de: 'Mein Planer', en: 'Planner' },
      { file: 'community.html', icon: '👥', de: 'Community', en: 'Community' }
    ]},
    { title: { de: 'Training & Analyse', en: 'Training & Analytics' }, items: [
      { file: 'schiessbuch.html', icon: '📋', de: 'Schießbuch', en: 'Shooting Log' },
      { file: 'sg-timer-live.html', icon: '⏱️', de: 'SG-Timer Live', en: 'SG-Timer Live' },
      { file: 'tools.html', icon: '🛠️', de: 'Tools & Training', en: 'Tools & Training' },
      { file: 'analytics.html', icon: '📊', de: 'Statistiken', en: 'Statistics' },
      { file: 'wiederladen.html', icon: '📦', de: 'Wiederladen', en: 'Reloading' }
    ]},
    { title: { de: 'Extras', en: 'Extras' }, items: [
      { file: 'ipsc-hub.html', icon: '⭐', de: 'IPSC Hub', en: 'IPSC Hub' },
      { file: 'doppel-aa.html', icon: '🎯', de: 'Startplatz-Bot', en: 'Slot Bot', club: true },
      { file: 'performance.html', icon: '📈', de: 'ELO-Vergleich', en: 'ELO Compare', club: true }
    ]}
  ];

  function buildIpadSidebarV78p(){
    try {
      const sidebar = document.getElementById('ipad-sidebar-v78p');
      if (!sidebar || sidebar.__ipscBuiltV78p) return;
      sidebar.__ipscBuiltV78p = true;
      const visibleSections = SIDEBAR_SECTIONS.map(function(section){
        const visibleItems = section.items.filter(function(item){ return !item.club || clubAccessV78v.allowed; });
        return { title: section.title, items: visibleItems };
      }).filter(function(section){ return section.items.length > 0; });
      sidebar.innerHTML = visibleSections.map(function(section, sectionIndex){
        const items = section.items.map(function(item){
          return '<a class="ipad-sidebar-link-v78p" href="' + item.file + '" data-file="' + item.file + '"' + (item.club ? ' data-club-link-v78v="1"' : '') + '>' +
            '<span class="ipad-sidebar-icon-v78p">' + item.icon + '</span>' +
            '<span class="ipad-sidebar-label-v78p" data-de="' + item.de.replace(/"/g,'&quot;') + '" data-en="' + item.en.replace(/"/g,'&quot;') + '">' + item.de + '</span>' +
          '</a>';
        }).join('');
        return '<section class="ipad-sidebar-section-v78p">' +
          '<div class="ipad-sidebar-title-v78p" data-de="' + section.title.de + '" data-en="' + section.title.en + '">' + section.title.de + '</div>' +
          items +
        '</section>' + (sectionIndex < visibleSections.length - 1 ? '<div class="ipad-sidebar-divider-v78p"></div>' : '');
      }).join('');
      updateSidebarLanguageV78p(getLang());
      updateSidebarActiveV78p(state.activeFile || 'index.html');
    } catch (_) {}
  }

  function updateSidebarLanguageV78p(lang){
    try {
      lang = lang === 'en' ? 'en' : 'de';
      document.querySelectorAll('#ipad-sidebar-v78p [data-de][data-en]').forEach(function(el){
        el.textContent = el.getAttribute(lang === 'en' ? 'data-en' : 'data-de') || el.textContent;
      });
    } catch (_) {}
  }

  function updateSidebarActiveV78p(file){
    try {
      document.querySelectorAll('#ipad-sidebar-v78p a[data-file]').forEach(function(a){
        const active = a.getAttribute('data-file') === file;
        a.classList.toggle('active', active);
        if (active) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    } catch (_) {}
  }

  function isDoubleAAValueV78v(value){
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes';
  }

  function rebuildSidebarAfterClubCheckV78v(){
    try {
      const sidebar = document.getElementById('ipad-sidebar-v78p');
      if (sidebar) sidebar.__ipscBuiltV78p = false;
      buildIpadSidebarV78p();
      updateSidebarActiveV78p(state.activeFile || 'index.html');
    } catch (_) {}
  }

  function setClubAccessV78v(allowed){
    allowed = !!allowed;
    const changed = clubAccessV78v.allowed !== allowed;
    clubAccessV78v.allowed = allowed;
    clubAccessV78v.checked = true;
    if (changed) rebuildSidebarAfterClubCheckV78v();
    try {
      document.documentElement.classList.toggle('ipsc-club-access-v78v', allowed);
      document.body && document.body.classList.toggle('ipsc-club-access-v78v', allowed);
    } catch (_) {}
    if (!allowed && CLUB_PAGES.has(state.activeFile || '')) {
      setTimeout(function(){ navigate('index.html', { replace: true, force: true }); }, 0);
    }
  }

  async function checkClubAccessV78v(){
    if (clubAccessV78v.checking) return clubAccessV78v.allowed;
    clubAccessV78v.checking = true;
    try {
      if (!window.supabaseClient || !window.supabaseClient.auth) { setClubAccessV78v(false); return false; }
      const sessionResult = await window.supabaseClient.auth.getSession();
      const user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
      if (!user) { setClubAccessV78v(false); return false; }
      const result = await window.supabaseClient.from('profiles').select('is_doppel_aa').eq('id', user.id).maybeSingle();
      const allowed = !result.error && result.data && isDoubleAAValueV78v(result.data.is_doppel_aa);
      setClubAccessV78v(allowed);
      return !!allowed;
    } catch (err) {
      console.warn('Double Alpha App-Shell Prüfung fehlgeschlagen:', err);
      setClubAccessV78v(false);
      return false;
    } finally {
      clubAccessV78v.checking = false;
    }
  }

  async function ensureClubRouteAllowedV78v(view){
    if (!CLUB_PAGES.has(view.file)) return true;
    if (clubAccessV78v.allowed) return true;
    return await checkClubAccessV78v();
  }


  const state = {
    activeFile: null,
    activeKey: null,
    activeFrame: null,
    frames: new Map(),
    frameAccess: new Map(),
    pending: new Map(),
    navSerial: 0,
    booted: false
  };

  const MAX_CACHED_FRAMES_V78X = 4;
  function touchFrameV78x(view){
    try { state.frameAccess.set(view.key, Date.now()); } catch (_) {}
  }
  function pruneFramesV78x(){
    try {
      const activeKey = state.activeKey;
      const entries = Array.from(state.frames.entries()).filter(function(entry){ return entry[0] !== activeKey; });
      if (state.frames.size <= MAX_CACHED_FRAMES_V78X) return;
      entries.sort(function(a,b){ return (state.frameAccess.get(a[0]) || 0) - (state.frameAccess.get(b[0]) || 0); });
      while (state.frames.size > MAX_CACHED_FRAMES_V78X && entries.length) {
        const entry = entries.shift();
        const key = entry[0];
        const frame = entry[1];
        if (key === activeKey) continue;
        try { frame.remove(); } catch (_) {}
        state.frames.delete(key);
        state.pending.delete(key);
        state.frameAccess.delete(key);
      }
    } catch (_) {}
  }

  function installMoreMenuGuardV78x(){
    try {
      let lastToggle = 0;
      window.toggleMoreMenu = function(ev){
        try { if (ev && ev.preventDefault) ev.preventDefault(); if (ev && ev.stopPropagation) ev.stopPropagation(); } catch (_) {}
        const now = Date.now();
        if (now - lastToggle < 260) return false;
        lastToggle = now;
        const menu = document.getElementById('more-menu-overlay');
        const btn = document.getElementById('btn-more-menu');
        if (!menu || !btn) return false;
        const willOpen = !menu.classList.contains('show');
        menu.classList.toggle('show', willOpen);
        btn.classList.toggle('open', willOpen);
        btn.classList.toggle('active', willOpen || document.body.classList.contains('is-more-view'));
        if (willOpen) {
          requestAnimationFrame(function(){
            try {
              const list = document.getElementById('more-menu-list');
              if (list) list.scrollTop = 0;
            } catch (_) {}
          });
        }
        return false;
      };
      const btn = document.getElementById('btn-more-menu');
      if (btn && !btn.__ipscMoreGuardV78x) {
        btn.__ipscMoreGuardV78x = true;
        btn.onclick = window.toggleMoreMenu;
      }
    } catch (_) {}
  }

  function showShellAuthModalV78h(view){
    try {
      const modal = document.getElementById('auth-modal');
      if (!modal) return false;
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('visibility', 'visible', 'important');
      modal.style.setProperty('opacity', '1', 'important');
      modal.style.setProperty('pointer-events', 'auto', 'important');
      modal.removeAttribute('aria-hidden');
      modal.classList.add('show', 'is-open');
      document.body.classList.add('auth-open', 'modal-open');
      document.documentElement.classList.add('auth-open', 'modal-open');
      if (typeof window.resetAuthProviderButtonsV78e === 'function') window.resetAuthProviderButtonsV78e();
      if (typeof window.toggleAuthView === 'function') window.toggleAuthView(view || 'login');
      return true;
    } catch (_) { return false; }
  }


  function closeShellModalV78m(which){
    try {
      const ids = which === 'chat' ? ['chat-modal','global-inbox-modal'] : ['auth-modal','chat-modal','global-inbox-modal'];
      ids.forEach(function(id){
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.style.setProperty('display', 'none', 'important');
        modal.style.setProperty('visibility', 'hidden', 'important');
        modal.style.setProperty('opacity', '0', 'important');
        modal.style.setProperty('pointer-events', 'none', 'important');
        modal.classList.remove('open','active','show','is-open');
        modal.setAttribute('aria-hidden','true');
      });
      document.body.classList.remove('auth-open','modal-open','chat-open');
      document.documentElement.classList.remove('auth-open','modal-open','chat-open');
      restoreShellChrome();
      return true;
    } catch (_) { return false; }
  }

  function restoreShellChrome(){
    try {
      document.documentElement.classList.add('is-native-shell','is-app-spa-v78','is-app-spa-v78h','is-app-spa-v78l','is-app-spa-v78m','is-app-spa-v78n','is-app-spa-v78p','is-app-spa-v78x');
      document.body.classList.add('page-native-shell','page-app-spa','app-v78','app-v78h','app-v78l','app-v78m','app-v78n','app-v78o','app-v78p','app-v78x');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const root = document.getElementById('app-shell-root-v78');
      const header = document.getElementById('main-header');
      const main = document.getElementById('app-spa-view-v78');
      if (root) { root.style.transform = ''; root.style.opacity = ''; root.style.visibility = ''; }
      if (header) {
        header.style.transform = '';
        header.style.opacity = '';
        header.style.visibility = '';
        header.style.display = '';
        header.classList.remove('is-hidden','is-collapsed','hide','hidden');
      }
      if (main) main.scrollTop = 0;
    } catch (_) {}
  }

  function fillSettingsFromUserV79t(user){
    try {
      user = user || window.currentUser || null;
      const settingsPublicAlias = document.getElementById('settings-public-alias');
      if (settingsPublicAlias && user) settingsPublicAlias.value = user.user_metadata?.username || '';
      const settingsIpsc = document.getElementById('settings-ipsc-alias');
      if (settingsIpsc && user) settingsIpsc.value = user.user_metadata?.ipsc_alias || '';
      const settingsRealName = document.getElementById('settings-real-name');
      if (settingsRealName && user) settingsRealName.value = user.user_metadata?.real_name || '';
      const previewImg = document.getElementById('settings-avatar-preview');
      const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.profile_picture || '';
      if (previewImg && avatar) { previewImg.src = avatar; previewImg.style.display = 'block'; }
    } catch (_) {}
  }

  function openShellSettings(){
    try {
      showShellAuthModalV78h('settings');
      fillSettingsFromUserV79t(window.currentUser || null);
      try {
        if (window.supabaseClient?.auth?.getSession) {
          window.supabaseClient.auth.getSession().then(function(result){
            const user = result && result.data && result.data.session && result.data.session.user;
            if (user) window.currentUser = user;
            showShellAuthModalV78h('settings');
            fillSettingsFromUserV79t(user || window.currentUser || null);
            setTimeout(restoreShellChrome, 0);
          }).catch(function(){});
        }
      } catch (_) {}
      setTimeout(function(){ showShellAuthModalV78h('settings'); fillSettingsFromUserV79t(window.currentUser || null); restoreShellChrome(); }, 60);
      return true;
    } catch (_) { return false; }
  }

  function markApp(){
    try {
      document.documentElement.classList.add('is-native-shell','is-app-spa-v78','is-app-spa-v78h','is-app-spa-v78l','is-app-spa-v78m','is-app-spa-v78n','is-app-spa-v78p','is-app-spa-v78x');
      document.body.classList.add('page-native-shell','page-app-spa','app-v78','app-v78h','app-v78l','app-v78m','app-v78n','app-v78o','app-v78p','app-v78x');
      document.body.classList.remove('app-v78b','app-v78c','app-v78d','app-v78e','app-v78f','app-v78g');
    } catch (_) {}
  }

  function getTheme(){
    let theme = 'light';
    try { theme = localStorage.getItem('selectedTheme') || localStorage.getItem('theme') || localStorage.getItem('ipsc_effective_theme') || 'light'; } catch (_) {}
    if (theme === 'auto') {
      try { theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (_) { theme = 'light'; }
    }
    return theme === 'dark' ? 'dark' : 'light';
  }


  function getLang(){
    try { return localStorage.getItem('selectedLanguage') || window.currentLang || 'de'; } catch (_) { return 'de'; }
  }

  function setFrameTheme(frame, theme){
    if (!frame) return;
    theme = theme === 'dark' ? 'dark' : 'light';
    const surface = theme === 'dark' ? '#0f172a' : '#f6f8fc';
    try {
      const doc = frame.contentDocument;
      if (doc && doc.documentElement) {
        doc.documentElement.setAttribute('data-theme', theme);
        doc.documentElement.style.backgroundColor = surface;
        doc.documentElement.style.colorScheme = theme;
        if (doc.body) doc.body.style.backgroundColor = surface;
        const meta = doc.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', surface);
      }
      frame.style.backgroundColor = surface;
      frame.contentWindow && frame.contentWindow.postMessage({ type: 'ipsc-theme-v78d', theme }, window.location.origin);
    } catch (_) {}
  }

  function setFrameLang(frame, lang){
    if (!frame) return;
    lang = lang === 'en' ? 'en' : 'de';
    try {
      frame.contentWindow && frame.contentWindow.postMessage({ type: 'ipsc-language-v78d', lang }, window.location.origin);
      const win = frame.contentWindow;
      if (win) {
        try { win.localStorage.setItem('selectedLanguage', lang); } catch (_) {}
        win.currentLang = lang;
        if (typeof win.translatePortalPage === 'function') win.translatePortalPage();
        else if (typeof win.applyLanguage === 'function') win.applyLanguage(lang);
      }
    } catch (_) {}
  }

  function broadcastTheme(theme){
    state.frames.forEach(frame => setFrameTheme(frame, theme));
    broadcast({ type: 'ipsc-theme-v78d', theme });
  }

  function syncLanguage(lang){
    lang = lang === 'en' ? 'en' : 'de';
    try {
      localStorage.setItem('selectedLanguage', lang);
      window.currentLang = lang;
      const selector = document.getElementById('language-select');
      if (selector) selector.value = lang;
    } catch (_) {}
    updateSidebarLanguageV78p(lang);
    state.frames.forEach(frame => setFrameLang(frame, lang));
    broadcast({ type: 'ipsc-language-v78d', lang });
    try { updateChrome(normalizeView(state.activeKey || state.activeFile || 'index.html')); } catch (_) {}
  }

  function handleLogout(){
    try {
      window.currentUser = null;
      localStorage.removeItem('headerUserCache');
      localStorage.removeItem('headerAvatar');
      const modal = document.getElementById('auth-modal');
      if (modal) modal.style.display = 'none';
      const c = document.getElementById('auth-status-container');
      const login = document.getElementById('btn-open-login');
      const settings = document.getElementById('btn-open-settings');
      const logout = document.getElementById('btn-logout');
      if (c) c.dataset.authState = 'out';
      if (login) { login.style.setProperty('display','inline-flex','important'); login.disabled = false; login.removeAttribute('aria-disabled'); }
      if (settings) settings.style.setProperty('display','none','important');
      if (logout) logout.style.setProperty('display','none','important');
      if (typeof window.resetAuthProviderButtonsV78e === 'function') window.resetAuthProviderButtonsV78e();
      if (typeof window.onAuthChange === 'function') window.onAuthChange(null);
      setClubAccessV78v(false);
    } catch (_) {}
    broadcast({ type: 'ipsc-auth-logout-v78d' });
    setTimeout(function(){
      try { if (state.activeFrame && state.activeFrame.contentWindow) state.activeFrame.contentWindow.location.reload(); } catch (_) {}
    }, 80);
  }

  function wrapShellControls(){
    try {
      if (typeof window.toggleTheme === 'function' && !window.toggleTheme.__ipscV78dWrapped) {
        const originalToggleTheme = window.toggleTheme;
        window.toggleTheme = function(){
          const result = originalToggleTheme.apply(this, arguments);
          setTimeout(function(){ applyTheme(getTheme()); }, 0);
          return result;
        };
        window.toggleTheme.__ipscV78dWrapped = true;
      }
    } catch (_) {}
  }

  function applyTheme(theme){
    theme = theme === 'dark' ? 'dark' : 'light';
    const surface = theme === 'dark' ? '#0f172a' : '#f6f8fc';
    try {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.backgroundColor = surface;
      document.documentElement.style.colorScheme = theme;
      document.body.style.backgroundColor = surface;
      localStorage.setItem('ipsc_effective_theme', theme);
      sessionStorage.setItem('ipsc_effective_theme', theme);
      window.__IPSC_ACTIVE_THEME_V78 = theme;
      window.__IPSC_ACTIVE_THEME_V76S = theme;
      window.__IPSC_ACTIVE_THEME_V74 = theme;
    } catch (_) {}
    let meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', surface);
    broadcastTheme(theme);
  }

  function normalizeView(raw){
    raw = String(raw || 'index.html').trim();
    try { raw = decodeURIComponent(raw); } catch (_) {}
    if (!raw || raw === '/' || raw === './') raw = 'index.html';
    let url;
    try { url = new URL(raw, window.location.origin + '/'); } catch (_) { url = new URL('index.html', window.location.origin + '/'); }
    let file = (url.pathname.split('/').pop() || 'index.html');
    if (!VIEW_MAP[file]) file = 'index.html';
    return { file, search: url.search || '', hash: url.hash || '', key: file + (url.search || '') + (url.hash || ''), title: VIEW_MAP[file].title || file };
  }


  function scrollFrameToTop(frame){
    try {
      if (!frame || !frame.contentWindow) return;
      const win = frame.contentWindow;
      win.scrollTo(0, 0);
      const doc = frame.contentDocument;
      if (doc) {
        if (doc.scrollingElement) doc.scrollingElement.scrollTop = 0;
        if (doc.documentElement) doc.documentElement.scrollTop = 0;
        if (doc.body) doc.body.scrollTop = 0;
      }
    } catch (_) {}
  }

  function broadcastAuthRefresh(){
    try { broadcast({ type: 'ipsc-auth-refresh-v78d' }); } catch (_) {}
    try {
      if (window.supabaseClient && window.supabaseClient.auth) {
        window.supabaseClient.auth.getSession().then(function(result){
          const session = result && result.data && result.data.session;
          const user = session && session.user;
          if (user) {
            window.currentUser = user;
            const payloadUser = { id: user.id, email: user.email, user_metadata: user.user_metadata || {} };
            window.__IPSC_SHELL_USER_V78M = payloadUser;
            broadcast({ type: 'ipsc-auth-session-v78l', user: payloadUser });
            setTimeout(checkClubAccessV78v, 50);
          } else {
            window.__IPSC_SHELL_USER_V78M = null;
            broadcast({ type: 'ipsc-auth-logout-v78d' });
            setClubAccessV78v(false);
          }
        });
      }
    } catch (_) {}
  }

  function appUrlFor(view){
    return 'app.html?shell=1&view=' + encodeURIComponent(view.file + (view.search || '') + (view.hash || ''));
  }

  function frameUrlFor(view){
    const params = new URLSearchParams(view.search || '');
    params.set('appframe', '1');
    params.set('shell', '1');
    params.set('v', VERSION);
    return view.file + '?' + params.toString() + (view.hash || '');
  }

  function safeTitle(view){ return (VIEW_MAP[view.file]?.title || 'IPSC Börse') + ' | IPSC Börse'; }

  function updateChrome(view){
    try {
      document.title = safeTitle(view);
      document.documentElement.dataset.appView = view.file;
      document.body.dataset.appView = view.file;
      document.body.classList.toggle('is-more-view', MORE_PAGES.has(view.file));
      document.querySelectorAll('header a[href], #bottom-tab-bar a[href], #more-menu-overlay a[href], .main-nav a[href], #ipad-sidebar-v78p a[href]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const target = normalizeView(href).file;
        const active = target === view.file;
        a.classList.toggle('active', active);
        a.classList.toggle('inactive', !active);
      });
      const moreBtn = document.getElementById('btn-more-menu');
      if (moreBtn) moreBtn.classList.toggle('active', MORE_PAGES.has(view.file));
      const menu = document.getElementById('more-menu-overlay');
      if (menu) menu.classList.remove('show');
      if (moreBtn) moreBtn.classList.remove('open');
      updateSidebarActiveV78p(view.file);
    } catch (_) {}
  }

  function ensureRoot(){
    markApp();
    buildIpadSidebarV78p();
    const main = document.getElementById('app-spa-view-v78');
    if (!main) return null;
    main.classList.add('is-ready');
    return main;
  }

  function waitFrameLoaded(frame, view){
    const existing = state.pending.get(view.key);
    if (existing) return existing;
    const promise = new Promise((resolve, reject) => {
      let done = false;
      const timeout = setTimeout(() => finish(true), 9000);
      function finish(fromTimeout){
        if (done) return;
        done = true;
        clearTimeout(timeout);
        frame.removeEventListener('load', onload);
        // If a heavy page takes long, still resolve: outgoing view remains until the frame has a real paint cycle.
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(frame)));
      }
      function onload(){ finish(false); }
      frame.addEventListener('load', onload, { once: true });
      // cached frames may already be ready
      try {
        const doc = frame.contentDocument;
        if (doc && doc.readyState && doc.readyState !== 'loading') finish(false);
      } catch (_) {}
    }).finally(() => state.pending.delete(view.key));
    state.pending.set(view.key, promise);
    return promise;
  }

  function createFrame(view){
    const main = ensureRoot();
    if (!main) return null;
    const frame = document.createElement('iframe');
    frame.className = 'app-frame-layer-v78c app-frame-layer-v78d app-frame-layer-v78f app-frame-layer-v78g app-frame-layer-v78h app-frame-layer-v78l app-frame-layer-v78m';
    frame.setAttribute('title', view.title);
    frame.setAttribute('data-view', view.file);
    frame.setAttribute('data-key', view.key);
    frame.setAttribute('allow', 'publickey-credentials-get *; publickey-credentials-create *; clipboard-read; clipboard-write; fullscreen');
    frame.src = frameUrlFor(view);
    frame.addEventListener('load', function(){
      const theme = getTheme();
      setFrameTheme(frame, theme);
      setFrameLang(frame, getLang());
    });
    main.appendChild(frame);
    state.frames.set(view.key, frame);
    touchFrameV78x(view);
    return frame;
  }

  function getFrame(view){
    const existing = state.frames.get(view.key);
    if (existing && existing.isConnected) { touchFrameV78x(view); return existing; }
    return createFrame(view);
  }

  async function navigate(raw, opts){
    opts = opts || {};
    let view = normalizeView(raw);
    if (CLUB_PAGES.has(view.file) && !(await ensureClubRouteAllowedV78v(view))) {
      view = normalizeView('index.html');
      opts.replace = true;
    }
    if (state.activeKey === view.key && !opts.force) return true;
    const serial = ++state.navSerial;
    const frame = getFrame(view);
    if (!frame) return false;

    applyTheme(getTheme());
    restoreShellChrome();
    updateChrome(view);

    const previous = state.activeFrame;
    if (previous && previous !== frame) {
      previous.classList.add('is-previous');
      previous.classList.remove('is-active');
    }

    try {
      await waitFrameLoaded(frame, view);
      if (serial !== state.navSerial) return true;
      setFrameTheme(frame, getTheme());
      setFrameLang(frame, getLang());
      if (!view.hash) { scrollFrameToTop(frame); try { const main = document.getElementById('app-spa-view-v78'); if (main) main.scrollTop = 0; window.scrollTo(0,0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch (_) {} setTimeout(function(){ scrollFrameToTop(frame); }, 120); setTimeout(function(){ scrollFrameToTop(frame); }, 420); }
      frame.classList.add('is-active');
      frame.classList.remove('is-previous');
      if (previous && previous !== frame) {
        setTimeout(() => previous.classList.remove('is-previous'), 180);
      }
      state.activeFile = view.file;
      state.activeKey = view.key;
      state.activeFrame = frame;
      touchFrameV78x(view);
      setTimeout(pruneFramesV78x, 250);
      setTimeout(installMoreMenuGuardV78x, 0);
      restoreShellChrome();
      if (!opts.replace && history.pushState) history.pushState({ view: view.file + (view.search || '') + (view.hash || '') }, '', appUrlFor(view));
      try { frame.contentWindow && frame.contentWindow.postMessage({ type: 'ipsc-app-active-v78d', view: view.file, theme: getTheme(), lang: getLang() }, window.location.origin); } catch (_) {}
      setTimeout(broadcastAuthRefresh, 40);
      return true;
    } catch (err) {
      console.error('v78d navigation failed', view, err);
      if (previous) previous.classList.add('is-active');
      return false;
    }
  }

  function shouldHandleLink(a){
    if (!a || !a.getAttribute) return null;
    const href = a.getAttribute('href') || '';
    if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
    if (a.hasAttribute('download')) return null;
    let url;
    try { url = new URL(href, window.location.href); } catch (_) { return null; }
    if (url.origin !== window.location.origin) return null;
    const file = (url.pathname.split('/').pop() || 'index.html');
    if (!VIEW_MAP[file]) return null;
    return file + (url.search || '') + (url.hash || '');
  }

  function interceptClicks(){
    document.addEventListener('click', function(ev){
      const closeBtn = ev.target && ev.target.closest && ev.target.closest('#btn-close-modal, #btn-close-chat, .modal-close-trigger, [data-modal-close]');
      if (closeBtn) {
        closeShellModalV78m();
        try { if (typeof ev.preventDefault === 'function') ev.preventDefault(); if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation(); } catch (_) {}
        return;
      }
      const modalBg = ev.target && ev.target.id && ['auth-modal','chat-modal','global-inbox-modal'].includes(ev.target.id) ? ev.target : null;
      if (modalBg) { closeShellModalV78m(); try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch (_) {} return; }
      const loginBtn = ev.target && ev.target.closest && ev.target.closest('#btn-open-login, [data-native-login]');
      if (loginBtn) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        openLogin();
        return;
      }
      const settingsBtn = ev.target && ev.target.closest && ev.target.closest('#btn-open-settings, .header-avatar-btn, #header-avatar, #auth-status-container[data-auth-state="in"]');
      if (settingsBtn) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        openShellSettings();
        return;
      }
      const a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      const target = shouldHandleLink(a);
      if (!target) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      navigate(target);
    }, true);
  }

  function openLogin(){
    try {
      if (typeof window.resetAuthProviderButtonsV78e === 'function') window.resetAuthProviderButtonsV78e();
      showShellAuthModalV78h('login');
      setTimeout(function(){ showShellAuthModalV78h('login'); restoreShellChrome(); }, 60);
      setTimeout(restoreShellChrome, 0);
    } catch (_) {}
  }

  function listenMessages(){
    window.addEventListener('message', function(event){
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if ((data.type === 'ipsc-navigate-v78c' || data.type === 'ipsc-navigate-v78d') && data.href) navigate(data.href);
      if (data.type === 'ipsc-open-login-v78c' || data.type === 'ipsc-open-login-v78d' || data.type === 'ipsc-open-login-v78h') openLogin();
      if (data.type === 'ipsc-open-settings-v78g' || data.type === 'ipsc-open-settings-v78h' || data.type === 'ipsc-open-settings-v78l' || data.type === 'ipsc-open-settings-v78m') openShellSettings();
      if (data.type === 'ipsc-close-shell-modal-v78m') closeShellModalV78m(data.which);
      if (data.type === 'ipsc-request-auth-v78m') broadcastAuthRefresh();
      if (data.type === 'ipsc-restore-chrome-v78g' || data.type === 'ipsc-restore-chrome-v78h' || data.type === 'ipsc-restore-chrome-v78l') restoreShellChrome();
    });
  }

  function installPopstate(){
    window.addEventListener('popstate', function(){
      const p = new URLSearchParams(window.location.search || '');
      navigate(p.get('view') || 'index.html', { replace: true });
    });
  }

  function broadcast(payload){
    state.frames.forEach(frame => {
      try { frame.contentWindow && frame.contentWindow.postMessage(payload, window.location.origin); } catch (_) {}
    });
  }

  function prewarm(){
    // v78x: bewusst deaktiviert. Das Vorladen mehrerer Live-Seiten hat auf iPhone/iPad CPU, Netzwerk und UI blockiert.
    return;
  }

  function refresh(){
    try {
      if (state.activeFrame && state.activeFrame.contentWindow) state.activeFrame.contentWindow.location.reload();
    } catch (_) {}
    updateChrome(normalizeView(state.activeKey || state.activeFile || 'index.html'));
  }

  async function init(){
    markApp();
    restoreShellChrome();
    applyTheme(getTheme());
    interceptClicks();
    listenMessages();
    installPopstate();
    window.addEventListener('storage', () => { applyTheme(getTheme()); syncLanguage(getLang()); });
    window.addEventListener('ipsc:oauth-login-complete', function(e){
      try { if (typeof window.closeAuthModalAfterLoginV78e === 'function') window.closeAuthModalAfterLoginV78e(e && e.detail && e.detail.user); } catch (_) {}
      broadcastAuthRefresh();
    });
    window.addEventListener('ipsc:auth-logout-v78d', handleLogout);
    window.addEventListener('ipsc:theme-change-v78d', function(e){ applyTheme((e && e.detail && e.detail.theme) || getTheme()); });
    document.addEventListener('change', function(e){ if (e.target && e.target.id === 'language-select') setTimeout(function(){ syncLanguage(e.target.value || getLang()); }, 0); }, true);
    wrapShellControls();
    const params = new URLSearchParams(window.location.search || '');
    const initial = params.get('view') || 'index.html';
    if (history.replaceState) history.replaceState({ view: initial }, '', appUrlFor(normalizeView(initial)));
    await checkClubAccessV78v();
    await navigate(initial, { replace: true, force: true });
    installMoreMenuGuardV78x();
    setTimeout(installMoreMenuGuardV78x, 250);
    // prewarm() bleibt in v78x deaktiviert
  }


  async function sharePdfFromChildV78q(payload, sourceWindow){
    const reply = (ok, error) => {
      try { sourceWindow && sourceWindow.postMessage({ type: 'ipsc-share-pdf-v78q-result', ok: !!ok, error: error || '' }, '*'); } catch (_) {}
    };
    try {
      const filenameRaw = String(payload && payload.filename || 'IPSC_Schiessbuch.pdf');
      const filename = filenameRaw.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
      const title = String(payload && payload.title || 'Schießbuch PDF');
      let base64 = String(payload && payload.base64 || '');
      base64 = base64.replace(/^data:application\/pdf(?:;[^,]*)?;base64,/i, '').replace(/\s/g, '');
      if (!base64) throw new Error('Keine PDF-Daten empfangen.');

      const plugins = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins : null;
      const Filesystem = plugins && (plugins.Filesystem || plugins.FilesystemPlugin || plugins.CapacitorFilesystem);
      const Share = plugins && (plugins.Share || plugins.SharePlugin || plugins.CapacitorShare);

      if (Filesystem && Share && typeof Filesystem.writeFile === 'function' && typeof Share.share === 'function') {
        let lastError = null;
        const dirs = ['CACHE', 'DOCUMENTS'];
        const path = `ipsc-share/${Date.now()}_${filename}`;
        for (const dir of dirs) {
          try {
            const result = await Filesystem.writeFile({ path, data: base64, directory: dir, recursive: true });
            let shareUrl = result && result.uri ? result.uri : undefined;
            if (!shareUrl && typeof Filesystem.getUri === 'function') {
              try { const uriResult = await Filesystem.getUri({ path, directory: dir }); shareUrl = uriResult && uriResult.uri ? uriResult.uri : undefined; } catch (_) {}
            }
            if (!shareUrl) throw new Error('PDF-Datei geschrieben, aber keine Datei-URI erhalten.');
            await Share.share({ title, text: 'PDF wurde erstellt.', url: shareUrl, dialogTitle: title });
            reply(true); return;
          } catch (e) { lastError = e; console.warn('PDF share attempt failed for directory', dir, e); }
        }
        throw lastError || new Error('PDF konnte nicht geteilt werden.');
      }
      throw new Error('Native Share/Filesystem ist nicht verfügbar.');
    } catch (err) { console.warn('Parent PDF share failed', err); reply(false, err && err.message ? err.message : String(err)); }
  }

  function isKnownAppFrameV79w(sourceWindow) {
    try { if (!sourceWindow) return false; for (const frame of state.frames.values()) { if (frame && frame.contentWindow === sourceWindow) return true; } } catch (_) {}
    return false;
  }

  window.addEventListener('message', function(event){
    try {
      const data = event.data || {};
      if (data.type === 'ipsc-share-pdf-v78q') {
        if (event.origin !== window.location.origin && !isKnownAppFrameV79w(event.source)) return;
        sharePdfFromChildV78q(data, event.source);
      }
    } catch (_) {}
  });

  window.IPSCAppV78 = { navigate, refresh, getCurrentView: () => state.activeFile, version: VERSION, applyTheme, syncLanguage, broadcastAuth: broadcastAuthRefresh, handleLogout, restoreShellChrome, openShellSettings, openLogin, showAuthModal: showShellAuthModalV78h, closeModal: closeShellModalV78m, buildIpadSidebar: buildIpadSidebarV78p, checkClubAccess: checkClubAccessV78v };
  window.openSettingsModal = openShellSettings;
  window.openLoginModal = openLogin;
  window.showAuthModalV78h = showShellAuthModalV78h;
  window.closeShellModalV78m = closeShellModalV78m;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();


// V79V: robust auth/settings opener after logout and in native app shell.
(function ipscAuthUiHardFixV79v(){
  if (window.__IPSC_AUTH_UI_HARD_FIX_V79V) return;
  window.__IPSC_AUTH_UI_HARD_FIX_V79V = true;
  function modal(){ return document.getElementById('auth-modal'); }
  function show(view){
    try{
      var m = modal();
      if (!m) return false;
      m.style.setProperty('display','flex','important');
      m.style.setProperty('visibility','visible','important');
      m.style.setProperty('opacity','1','important');
      m.style.setProperty('pointer-events','auto','important');
      m.removeAttribute('aria-hidden');
      m.classList.add('show','is-open','open');
      document.documentElement.classList.add('auth-open','modal-open');
      if (document.body) document.body.classList.add('auth-open','modal-open');
      try { if (typeof window.resetAuthProviderButtonsV78e === 'function') window.resetAuthProviderButtonsV78e(); } catch(_){ }
      try { if (typeof window.toggleAuthView === 'function') window.toggleAuthView(view || 'login'); } catch(_){ }
      if (view === 'settings') {
        try { if (typeof window.fillSettingsFromUserV79t === 'function') window.fillSettingsFromUserV79t(window.currentUser || null); } catch(_){ }
      }
      return true;
    }catch(_){ return false; }
  }
  function resetOut(){
    try{
      var c=document.getElementById('auth-status-container'), login=document.getElementById('btn-open-login'), settings=document.getElementById('btn-open-settings'), logout=document.getElementById('btn-logout');
      if(c) c.dataset.authState='out';
      if(login){ login.style.setProperty('display','inline-flex','important'); login.disabled=false; login.removeAttribute('disabled'); login.removeAttribute('aria-disabled'); login.style.setProperty('pointer-events','auto','important'); login.style.setProperty('visibility','visible','important'); login.style.setProperty('opacity','1','important'); }
      if(settings){ settings.style.setProperty('display','none','important'); }
      if(logout){ logout.style.setProperty('display','none','important'); }
    }catch(_){ }
  }
  function resetIn(){
    try{
      var c=document.getElementById('auth-status-container'), login=document.getElementById('btn-open-login'), settings=document.getElementById('btn-open-settings'), logout=document.getElementById('btn-logout');
      if(c) c.dataset.authState='in';
      if(login) login.style.setProperty('display','none','important');
      if(settings){ settings.style.setProperty('display','inline-flex','important'); settings.style.setProperty('pointer-events','auto','important'); settings.style.setProperty('visibility','visible','important'); settings.style.setProperty('opacity','1','important'); }
      if(logout) logout.style.setProperty('display','inline-flex','important');
    }catch(_){ }
  }
  var oldOpenLogin = window.openLoginModal;
  window.openLoginModal = function(){ return show('login') || (typeof oldOpenLogin === 'function' ? oldOpenLogin() : false); };
  var oldOpenSettings = window.openSettingsModal;
  window.openSettingsModal = function(){ return show('settings') || (typeof oldOpenSettings === 'function' ? oldOpenSettings() : false); };
  window.showAuthModalV79v = show;
  window.addEventListener('ipsc:auth-logout-v78d', function(){ resetOut(); setTimeout(resetOut,80); setTimeout(resetOut,350); });
  window.addEventListener('ipsc-auth-changed', function(e){ if(e.detail && e.detail.user) resetIn(); else resetOut(); });
  window.addEventListener('ipsc:auth-changed-v79t', function(e){ if(e.detail && e.detail.user) resetIn(); else resetOut(); });
  document.addEventListener('click', function(ev){
    try{
      var login = ev.target && ev.target.closest && ev.target.closest('#btn-open-login, [data-native-login]');
      if(login){ ev.preventDefault(); ev.stopImmediatePropagation(); show('login'); return; }
      var settings = ev.target && ev.target.closest && ev.target.closest('#btn-open-settings, .header-avatar-btn, #header-avatar');
      if(settings){ ev.preventDefault(); ev.stopImmediatePropagation(); show('settings'); return; }
    }catch(_){ }
  }, true);
  setTimeout(function(){ try{ if(window.currentUser) resetIn(); else window.supabaseClient?.auth?.getSession().then(function(r){ if(r?.data?.session?.user){ window.currentUser=r.data.session.user; resetIn(); } else resetOut(); }); }catch(_){ } }, 600);
})();
