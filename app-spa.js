/* V78F Full-Page Frame SPA Shell
   Goal: keep the browser website exactly as-is while the iOS app gets zero-flash navigation.
   Instead of extracting/replaying page DOM, every app view is the original page inside a same-origin iframe.
   This preserves layout, translations, data loading and page-specific scripts from the backup line.
*/
(function IPSCAppFrameSpaV78F(){
  if (window.__IPSC_APP_FRAME_SPA_V78F) return;
  window.__IPSC_APP_FRAME_SPA_V78F = true;
  window.__IPSC_UNIFIED_SPA_ACTIVE = true;

  const VERSION = '78f';
  const VIEW_MAP = {
    'index.html': { title: 'Start' },
    'marktplatz.html': { title: 'Marktplatz' },
    'mein-planer.html': { title: 'Mein Planer' },
    'community.html': { title: 'Community' },
    'freie-matches.html': { title: 'Freie Match-Plätze' },
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
  const MORE_PAGES = new Set(['freie-matches.html','schiessbuch.html','sg-timer-live.html','tools.html','analytics.html','wiederladen.html','ipsc-hub.html','doppel-aa.html','performance.html']);
  const CORE_PRELOAD = ['index.html','marktplatz.html','mein-planer.html','community.html','freie-matches.html','schiessbuch.html','tools.html','wiederladen.html'];

  const state = {
    activeFile: null,
    activeKey: null,
    activeFrame: null,
    frames: new Map(),
    pending: new Map(),
    navSerial: 0,
    booted: false
  };

  function markApp(){
    try {
      document.documentElement.classList.add('is-native-shell','is-app-spa-v78','is-app-spa-v78f');
      document.body.classList.add('page-native-shell','page-app-spa','app-v78','app-v78f');
      document.body.classList.remove('app-v78b','app-v78c','app-v78d','app-v78e');
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
      if (typeof window.onAuthChange === 'function') window.onAuthChange(null);
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
      document.querySelectorAll('header a[href], #bottom-tab-bar a[href], #more-menu-overlay a[href], .main-nav a[href]').forEach(a => {
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
    } catch (_) {}
  }

  function ensureRoot(){
    markApp();
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
    frame.className = 'app-frame-layer-v78c app-frame-layer-v78d app-frame-layer-v78f';
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
    return frame;
  }

  function getFrame(view){
    const existing = state.frames.get(view.key);
    if (existing && existing.isConnected) return existing;
    return createFrame(view);
  }

  async function navigate(raw, opts){
    opts = opts || {};
    const view = normalizeView(raw);
    if (state.activeKey === view.key && !opts.force) return true;
    const serial = ++state.navSerial;
    const frame = getFrame(view);
    if (!frame) return false;

    applyTheme(getTheme());
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
      frame.classList.add('is-active');
      frame.classList.remove('is-previous');
      if (previous && previous !== frame) {
        setTimeout(() => previous.classList.remove('is-previous'), 180);
      }
      state.activeFile = view.file;
      state.activeKey = view.key;
      state.activeFrame = frame;
      if (!opts.replace && history.pushState) history.pushState({ view: view.file + (view.search || '') + (view.hash || '') }, '', appUrlFor(view));
      try { frame.contentWindow && frame.contentWindow.postMessage({ type: 'ipsc-app-active-v78d', view: view.file, theme: getTheme(), lang: getLang() }, window.location.origin); } catch (_) {}
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
      const modal = document.getElementById('auth-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.removeAttribute('aria-hidden');
        if (typeof window.toggleAuthView === 'function') window.toggleAuthView('login');
      }
    } catch (_) {}
  }

  function listenMessages(){
    window.addEventListener('message', function(event){
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if ((data.type === 'ipsc-navigate-v78c' || data.type === 'ipsc-navigate-v78d') && data.href) navigate(data.href);
      if (data.type === 'ipsc-open-login-v78c' || data.type === 'ipsc-open-login-v78d') openLogin();
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
    CORE_PRELOAD.forEach((file, i) => {
      setTimeout(() => {
        const view = normalizeView(file);
        if (!state.frames.has(view.key)) {
          const frame = createFrame(view);
          if (frame) frame.classList.add('is-previous');
        }
      }, 250 + i * 350);
    });
  }

  function refresh(){
    try {
      if (state.activeFrame && state.activeFrame.contentWindow) state.activeFrame.contentWindow.location.reload();
    } catch (_) {}
    updateChrome(normalizeView(state.activeKey || state.activeFile || 'index.html'));
  }

  async function init(){
    markApp();
    applyTheme(getTheme());
    interceptClicks();
    listenMessages();
    installPopstate();
    window.addEventListener('storage', () => { applyTheme(getTheme()); syncLanguage(getLang()); });
    window.addEventListener('ipsc:oauth-login-complete', function(e){
      try { if (typeof window.closeAuthModalAfterLoginV78e === 'function') window.closeAuthModalAfterLoginV78e(e && e.detail && e.detail.user); } catch (_) {}
      broadcast({ type: 'ipsc-auth-refresh-v78d' });
    });
    window.addEventListener('ipsc:auth-logout-v78d', handleLogout);
    window.addEventListener('ipsc:theme-change-v78d', function(e){ applyTheme((e && e.detail && e.detail.theme) || getTheme()); });
    document.addEventListener('change', function(e){ if (e.target && e.target.id === 'language-select') setTimeout(function(){ syncLanguage(e.target.value || getLang()); }, 0); }, true);
    wrapShellControls();
    const params = new URLSearchParams(window.location.search || '');
    const initial = params.get('view') || 'index.html';
    if (history.replaceState) history.replaceState({ view: initial }, '', appUrlFor(normalizeView(initial)));
    await navigate(initial, { replace: true, force: true });
    prewarm();
  }

  window.IPSCAppV78 = { navigate, refresh, getCurrentView: () => state.activeFile, version: VERSION, applyTheme, syncLanguage, broadcastAuth: function(){ broadcast({ type: 'ipsc-auth-refresh-v78d' }); }, handleLogout };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
