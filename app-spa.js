/* V78 Unified Remote SPA Shell
   Purpose: keep ipscboerse.com as the browser/passkey origin while removing hard HTML page changes in the iOS app.
   Browser website remains unchanged; only app.html uses this router.
*/
(function IPSCUnifiedSpaV78(){
  if (window.__IPSC_UNIFIED_SPA_V78) return;
  window.__IPSC_UNIFIED_SPA_V78 = true;
  window.__IPSC_UNIFIED_SPA_ACTIVE = true;
  try { document.documentElement.classList.add('is-native-shell','is-app-spa-v78'); if (document.body) document.body.classList.add('page-native-shell'); } catch (_) {}

  const VERSION = '78b';
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
  const SHARED_SCRIPT_RE = /(?:^|\/)(?:header|auth|app|lang|native-shell|app-spa)\.js(?:\?|$)|@supabase\/supabase-js/i;
  const SKIP_INLINE_ID_RE = /native-shell-redirect|theme-instant|theme-prepaint|native-page-transition|native-app-experience|surface-bridge|prepaint/i;
  const SKIP_STYLE_ID_RE = /native-app-prepaint|native-page-transition|theme-prepaint|instant-bg|surface-bridge/i;
  const THIRD_PARTY_LOADED = new Set();

  const state = {
    activeFile: null,
    activeKey: null,
    activeEl: null,
    navSerial: 0,
    htmlCache: new Map(),
    fetchPromises: new Map(),
    originalBodyClass: document.body ? document.body.className : '',
    lastScrollByKey: new Map()
  };

  function isNativeApp(){
    try {
      return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    } catch (_) { return false; }
  }

  function getTheme(){
    let theme = 'light';
    try { theme = localStorage.getItem('selectedTheme') || localStorage.getItem('theme') || localStorage.getItem('ipsc_effective_theme') || 'light'; } catch (_) {}
    if (theme === 'auto') {
      try { theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (_) { theme = 'light'; }
    }
    return theme === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme){
    theme = theme === 'dark' ? 'dark' : 'light';
    const surface = theme === 'dark' ? '#0f172a' : '#f6f8fc';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.backgroundColor = surface;
    document.documentElement.style.colorScheme = theme;
    if (document.body) document.body.style.backgroundColor = surface;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', surface);
    try { localStorage.setItem('ipsc_effective_theme', theme); sessionStorage.setItem('ipsc_effective_theme', theme); } catch (_) {}
    window.__IPSC_ACTIVE_THEME_V78 = theme;
    window.__IPSC_ACTIVE_THEME_V76S = theme;
    window.__IPSC_ACTIVE_THEME_V74 = theme;
  }

  function normalizeView(raw){
    raw = String(raw || 'index.html').trim();
    try { raw = decodeURIComponent(raw); } catch (_) {}
    if (!raw || raw === '/' || raw === './') raw = 'index.html';
    let url;
    try { url = new URL(raw, window.location.origin + '/'); } catch (_) { url = new URL('index.html', window.location.origin + '/'); }
    let file = (url.pathname.split('/').pop() || 'index.html');
    if (!VIEW_MAP[file]) file = 'index.html';
    const search = url.search || '';
    const hash = url.hash || '';
    return { file, search, hash, key: file + search + hash, title: VIEW_MAP[file].title || file };
  }

  function appUrlFor(view){
    return 'app.html?shell=1&view=' + encodeURIComponent(view.file + (view.search || '') + (view.hash || ''));
  }

  function sourceUrlFor(view){
    const join = view.search ? '&' : '?';
    return view.file + (view.search || '') + join + 'spa=1&v=' + VERSION + (view.hash || '');
  }

  async function fetchViewHtml(view){
    const cacheKey = view.file + (view.search || '');
    if (state.htmlCache.has(cacheKey)) return state.htmlCache.get(cacheKey);
    if (state.fetchPromises.has(cacheKey)) return state.fetchPromises.get(cacheKey);
    const promise = fetch(sourceUrlFor(view), { credentials: 'same-origin', cache: 'force-cache' })
      .then(resp => {
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' für ' + view.file);
        return resp.text();
      })
      .then(html => { state.htmlCache.set(cacheKey, html); state.fetchPromises.delete(cacheKey); return html; })
      .catch(err => { state.fetchPromises.delete(cacheKey); throw err; });
    state.fetchPromises.set(cacheKey, promise);
    return promise;
  }

  function ensureLoader(){
    let loader = document.getElementById('spa-loader-v78');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'spa-loader-v78';
      loader.textContent = 'Lade …';
      document.body.appendChild(loader);
    }
    return loader;
  }

  function setLoading(on){
    const loader = ensureLoader();
    loader.classList.toggle('is-visible', !!on);
  }

  function safeTitle(view){
    return (VIEW_MAP[view.file]?.title || 'IPSC Börse') + ' | IPSC Börse';
  }

  function stripHeaderAndScripts(doc){
    const scripts = [];
    const styles = [];

    doc.querySelectorAll('style').forEach(style => {
      const id = style.id || '';
      if (SKIP_STYLE_ID_RE.test(id)) return;
      const css = style.textContent || '';
      if (!css.trim()) return;
      styles.push(css);
    });

    doc.querySelectorAll('script').forEach(script => {
      const id = script.id || '';
      const src = script.getAttribute('src') || '';
      if (SKIP_INLINE_ID_RE.test(id)) { script.remove(); return; }
      if (src && SHARED_SCRIPT_RE.test(src)) { script.remove(); return; }
      if (src && /sw\.js/i.test(src)) { script.remove(); return; }
      if (id && /native-app-experience/i.test(id)) { script.remove(); return; }
      scripts.push({ src, code: src ? '' : (script.textContent || ''), id });
      script.remove();
    });

    doc.querySelectorAll('header').forEach(h => h.remove());
    doc.querySelectorAll('#app-page-transition-cover,#native-page-curtain-v72,#native-page-curtain-v73,#native-page-curtain-v74,#ipsc-surface-bridge-v76s').forEach(el => el.remove());

    return {
      bodyClass: doc.body ? doc.body.className : '',
      html: doc.body ? doc.body.innerHTML : '',
      scripts,
      styles
    };
  }

  function setViewStyles(styles){
    let styleEl = document.getElementById('spa-view-styles-v78');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'spa-view-styles-v78';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = (styles || []).join('\n\n');
  }

  function transformScript(code){
    // The old pages were standalone documents. In the SPA they share one JS global scope.
    // Downgrade lexical top-level declarations so revisiting/switching pages does not crash with redeclare SyntaxErrors.
    return String(code || '')
      .replace(/\bconst\b/g, 'var')
      .replace(/\blet\b/g, 'var')
      .replace(/window\.location\.reload\s*\(\s*\)\s*;?/g, 'window.IPSCAppV78 && window.IPSCAppV78.refresh();')
      .replace(/location\.reload\s*\(\s*\)\s*;?/g, 'window.IPSCAppV78 && window.IPSCAppV78.refresh();');
  }

  function loadExternalScript(src){
    if (!src) return Promise.resolve();
    const clean = src.split('#')[0];
    const already = Array.from(document.scripts).some(s => (s.src || '').split('#')[0] === new URL(clean, window.location.href).href);
    if (already || THIRD_PARTY_LOADED.has(clean)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = clean;
      s.async = false;
      s.onload = () => { THIRD_PARTY_LOADED.add(clean); resolve(); };
      s.onerror = () => reject(new Error('Script konnte nicht geladen werden: ' + clean));
      document.head.appendChild(s);
    });
  }

  async function runPageScripts(scripts, view){
    const oldAdd = document.addEventListener;
    const pendingDomReady = [];
    document.addEventListener = function(type, listener, options){
      if (String(type).toLowerCase() === 'domcontentloaded' && typeof listener === 'function') {
        pendingDomReady.push(listener);
        return;
      }
      return oldAdd.call(document, type, listener, options);
    };

    try {
      for (const item of scripts) {
        if (item.src) {
          if (!SHARED_SCRIPT_RE.test(item.src)) await loadExternalScript(item.src);
          continue;
        }
        const code = transformScript(item.code || '');
        if (!code.trim()) continue;
        const s = document.createElement('script');
        s.setAttribute('data-spa-view', view.file);
        s.textContent = '\n;try{\n' + code + '\n}catch(e){console.error("SPA view script error ' + view.file.replace(/[^a-z0-9_.-]/gi,'') + '", e);}\n';
        document.body.appendChild(s);
      }
    } finally {
      document.addEventListener = oldAdd;
    }

    pendingDomReady.forEach(fn => {
      try { setTimeout(() => fn.call(document, new Event('DOMContentLoaded')), 0); } catch (e) { console.warn('DOMContentLoaded shim error', e); }
    });
  }

  function cloneOutgoing(){
    if (!state.activeEl) return null;
    const clone = state.activeEl.cloneNode(true);
    clone.id = 'spa-outgoing-clone-v78';
    clone.classList.add('spa-outgoing-clone-v78');
    clone.querySelectorAll('[id]').forEach((el, idx) => {
      el.setAttribute('data-old-id', el.id);
      el.removeAttribute('id');
    });
    clone.querySelectorAll('input, textarea, select, button, a').forEach(el => {
      try { el.tabIndex = -1; } catch (_) {}
    });
    return clone;
  }

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
        if (a.closest('#bottom-tab-bar, .main-nav, header nav')) a.classList.toggle('inactive', !active);
      });
      const moreBtn = document.getElementById('btn-more-menu');
      if (moreBtn) moreBtn.classList.toggle('active', MORE_PAGES.has(view.file));
      const menu = document.getElementById('more-menu-overlay');
      if (menu) menu.classList.remove('show');
      if (moreBtn) moreBtn.classList.remove('open');
    } catch (_) {}
  }

  function applyBodyClass(bodyClass){
    const keep = 'page-app-spa page-native-shell app-v78 app-v78-spa app-v78b';
    document.body.className = (keep + ' ' + (bodyClass || '')).replace(/\s+/g, ' ').trim();
  }

  async function notifyAuthAndLang(view){
    try { if (typeof window.applyTranslations === 'function') window.applyTranslations(); } catch (_) {}
    try { if (typeof window.syncHeaderAuthState === 'function') window.syncHeaderAuthState(); } catch (_) {}
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      window.currentUser = data?.session?.user || null;
      if (typeof window.updateAuthUI === 'function') window.updateAuthUI(window.currentUser);
      if (typeof window.onAuthChange === 'function') window.onAuthChange(window.currentUser);
    } catch (_) {
      try { if (typeof window.onAuthChange === 'function') window.onAuthChange(window.currentUser || null); } catch (_) {}
    }
    try { window.dispatchEvent(new CustomEvent('ipsc:spa-view-mounted', { detail: { file: view.file, key: view.key } })); } catch (_) {}
  }

  async function waitForPaint(el){
    let tries = 0;
    while (tries < 12) {
      tries++;
      const h = Math.max(el.scrollHeight || 0, el.offsetHeight || 0);
      const txt = (el.innerText || '').trim();
      if (h > 160 || txt.length > 20) break;
      await new Promise(r => setTimeout(r, 35));
    }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  async function navigate(raw, opts){
    opts = opts || {};
    const view = normalizeView(raw);
    if (!VIEW_MAP[view.file]) return false;
    if (state.activeKey === view.key && !opts.force) return true;
    const serial = ++state.navSerial;
    const main = document.getElementById('app-spa-view-v78');
    if (!main) return false;

    try {
      if (state.activeKey) state.lastScrollByKey.set(state.activeKey, window.scrollY || 0);
    } catch (_) {}

    setLoading(true);
    applyTheme(getTheme());

    const outgoing = cloneOutgoing();
    if (outgoing) document.body.appendChild(outgoing);

    try {
      const html = await fetchViewHtml(view);
      if (serial !== state.navSerial) return true;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const parsed = stripHeaderAndScripts(doc);
      setViewStyles(parsed.styles);
      applyBodyClass(parsed.bodyClass);
      updateChrome(view);

      main.classList.remove('is-ready');
      main.innerHTML = parsed.html;
      state.activeEl = main;
      state.activeFile = view.file;
      state.activeKey = view.key;

      await runPageScripts(parsed.scripts, view);
      await notifyAuthAndLang(view);
      await waitForPaint(main);

      if (serial !== state.navSerial) return true;
      main.classList.add('is-ready');
      if (!opts.replace && history.pushState) history.pushState({ view: view.file + (view.search || '') + (view.hash || '') }, '', appUrlFor(view));
      setTimeout(() => { if (outgoing) outgoing.classList.add('is-gone'); }, 20);
      setTimeout(() => { try { if (outgoing) outgoing.remove(); } catch (_) {} }, 260);
      setLoading(false);

      try {
        const y = opts.restoreScroll ? (state.lastScrollByKey.get(view.key) || 0) : 0;
        window.scrollTo({ top: y, behavior: 'instant' });
      } catch (_) { window.scrollTo(0, 0); }
      return true;
    } catch (err) {
      console.error('SPA navigation failed', view, err);
      setLoading(false);
      main.innerHTML = '<div class="container"><div class="info-box" style="border-left-color:#ef4444"><strong>Seite konnte nicht geladen werden.</strong><br>Bitte kurz zurück und erneut öffnen.<br><small>' + String(err.message || err).replace(/[<>&]/g, '') + '</small></div></div>';
      main.classList.add('is-ready');
      if (outgoing) setTimeout(() => outgoing.remove(), 400);
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
      const moreButton = ev.target && ev.target.closest && ev.target.closest('#btn-more-menu');
      if (moreButton && !moreButton.matches('a[href]')) return;
      const a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      const target = shouldHandleLink(a);
      if (!target) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      navigate(target);
    }, true);
  }

  function installPopstate(){
    window.addEventListener('popstate', function(){
      const p = new URLSearchParams(window.location.search || '');
      navigate(p.get('view') || 'index.html', { replace: true, restoreScroll: true });
    });
  }

  function prewarm(){
    ['index.html','marktplatz.html','mein-planer.html','community.html','freie-matches.html','schiessbuch.html','tools.html','wiederladen.html','analytics.html','performance.html'].forEach((file, i) => {
      setTimeout(() => fetchViewHtml(normalizeView(file)).catch(()=>{}), 300 + i * 220);
    });
  }

  async function init(){
    applyTheme(getTheme());
    interceptClicks();
    installPopstate();

    // Let header/auth initialize once, then route the first app view.
    const params = new URLSearchParams(window.location.search || '');
    const initial = params.get('view') || 'index.html';
    if (history.replaceState) history.replaceState({ view: initial }, '', appUrlFor(normalizeView(initial)));
    await navigate(initial, { replace: true });
    prewarm();
  }

  window.IPSCAppV78 = {
    navigate,
    refresh: () => navigate(state.activeKey || 'index.html', { force: true, replace: true }),
    getCurrentView: () => state.activeFile,
    version: VERSION
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
