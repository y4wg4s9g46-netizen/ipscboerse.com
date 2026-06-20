(function() {

    // V78D App-Frame Guard: pages displayed inside app.html iframe keep their original content/styles,
    // but do not build their own header/bottom navigation. Internal links are routed by the parent app shell.
    (function(){
      var qs = null;
      try { qs = new URLSearchParams(window.location.search || ""); } catch (_) { qs = null; }
      var isFrame = !!(qs && qs.get("appframe") === "1");
      if (!isFrame) return;
      window.__IPSC_APP_FRAME_V78D = true;
      try {
        document.documentElement.classList.add("ipsc-app-frame", "ipsc-app-frame-v78c", "ipsc-app-frame-v78d", "ipsc-app-frame-v78g", "ipsc-app-frame-v78h", "ipsc-app-frame-v78l", "ipsc-app-frame-v78m");
        if (document.body) document.body.classList.add("ipsc-app-frame-body");
      } catch (_) {}
      function cleanFrameChrome(){
        try {
          document.documentElement.classList.add("ipsc-app-frame", "ipsc-app-frame-v78c", "ipsc-app-frame-v78d", "ipsc-app-frame-v78g", "ipsc-app-frame-v78h", "ipsc-app-frame-v78l", "ipsc-app-frame-v78m");
          if (document.body) document.body.classList.add("ipsc-app-frame-body");
          document.querySelectorAll("#main-header, header#main-header, #bottom-tab-bar, #more-menu-overlay, .main-nav, .bottom-tab-bar").forEach(function(el){ el.remove(); });
        } catch (_) {}
      }
      cleanFrameChrome();
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", cleanFrameChrome, { once: true });
      else setTimeout(cleanFrameChrome, 0);
      document.addEventListener("click", function(ev){
        try {
          var settingsTarget = ev.target && ev.target.closest && ev.target.closest("#btn-open-settings, .header-avatar-btn, #header-avatar");
          if (settingsTarget && window.parent && window.parent !== window) {
            ev.preventDefault(); ev.stopImmediatePropagation();
            window.parent.postMessage({ type: "ipsc-open-settings-v78m" }, window.location.origin);
            return;
          }
          var closeTarget = ev.target && ev.target.closest && ev.target.closest(".modal-close-trigger, #btn-close-modal, button[onclick*='closePostModal']");
          if (closeTarget && window.parent && window.parent !== window) {
            setTimeout(function(){ window.parent.postMessage({ type: "ipsc-restore-chrome-v78l" }, window.location.origin); }, 80);
            setTimeout(function(){ window.parent.postMessage({ type: "ipsc-restore-chrome-v78l" }, window.location.origin); }, 260);
          }
          var loginTarget = ev.target && ev.target.closest && ev.target.closest("#btn-open-login, [data-auth-trigger], button[onclick*='auth-modal'], button[onclick*='toggleAuthView']");
          if (loginTarget && window.parent && window.parent !== window) {
            ev.preventDefault(); ev.stopImmediatePropagation();
            window.parent.postMessage({ type: "ipsc-open-login-v78h" }, window.location.origin);
            return;
          }
          var a = ev.target && ev.target.closest && ev.target.closest("a[href]");
          if (!a || a.hasAttribute("download")) return;
          var href = a.getAttribute("href") || "";
          if (!href || href === "#" || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
          var url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) return;
          var file = (url.pathname.split('/').pop() || 'index.html');
          var known = /^(index|marktplatz|mein-planer|community|freie-matches|schiessbuch|sg-timer-live|tools|analytics|wiederladen|ipsc-hub|doppel-aa|performance|impressum|reset|schiessbuch-confirm|schiessbuch-verify)\.html$/i.test(file);
          if (!known) return;
          ev.preventDefault(); ev.stopImmediatePropagation();
          window.parent.postMessage({ type: "ipsc-navigate-v78d", href: file + (url.search || "") + (url.hash || "") }, window.location.origin);
        } catch (_) {}
      }, true);

      function applyFrameThemeV78d(theme){
        theme = theme === "dark" ? "dark" : "light";
        var surface = theme === "dark" ? "#0f172a" : "#f6f8fc";
        try {
          document.documentElement.setAttribute("data-theme", theme);
          document.documentElement.style.backgroundColor = surface;
          document.documentElement.style.colorScheme = theme;
          if (document.body) document.body.style.backgroundColor = surface;
          localStorage.setItem("selectedTheme", theme);
          localStorage.setItem("theme", theme);
          localStorage.setItem("ipsc_effective_theme", theme);
          var meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.setAttribute("content", surface);
        } catch (_) {}
      }

      function applyFrameLanguageV78d(lang){
        lang = lang === "en" ? "en" : "de";
        try {
          localStorage.setItem("selectedLanguage", lang);
          window.currentLang = lang;
          var sel = document.getElementById("language-select");
          if (sel) sel.value = lang;
        } catch (_) {}
        function run(){
          try {
            if (typeof window.translatePortalPage === "function") window.translatePortalPage();
            else if (typeof window.applyLanguage === "function") window.applyLanguage(lang);
            else document.querySelectorAll("[data-txt]").forEach(function(el){
              var key = el.getAttribute("data-txt");
              var dict = (window.portalTranslations || window.translations || {})[lang] || {};
              if (dict[key]) el.innerHTML = dict[key];
            });
          } catch (_) {}
        }
        run(); setTimeout(run, 80); setTimeout(run, 350);
      }


      // V78L: after frame modals/composers close, tell the shell to restore the fixed header/bottom chrome.
      if (!window.__IPSC_FRAME_CLOSE_RESTORE_V78L) {
        window.__IPSC_FRAME_CLOSE_RESTORE_V78L = true;
        document.addEventListener("click", function(ev){
          try {
            var t = ev.target && ev.target.closest && ev.target.closest(".modal-close-trigger, .close, [data-close], button[onclick*='close'], button[onclick*='Post']");
            if (t && window.parent && window.parent !== window) {
              setTimeout(function(){ window.parent.postMessage({ type: "ipsc-restore-chrome-v78l" }, window.location.origin); }, 80);
              setTimeout(function(){ window.parent.postMessage({ type: "ipsc-restore-chrome-v78l" }, window.location.origin); }, 280);
            }
          } catch (_) {}
        }, true);
      }


      // V78M: ask parent shell for the current auth session immediately.
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "ipsc-request-auth-v78m" }, window.location.origin);
          setTimeout(function(){ window.parent.postMessage({ type: "ipsc-request-auth-v78m" }, window.location.origin); }, 250);
        }
      } catch (_) {}

      window.addEventListener("message", function(event){
        if (event.origin !== window.location.origin) return;
        var data = event.data || {};
        if (data.type === "ipsc-theme-v78c" || data.type === "ipsc-theme-v78d" || data.type === "ipsc-app-active-v78d") applyFrameThemeV78d(data.theme || localStorage.getItem("ipsc_effective_theme") || "light");
        if (data.type === "ipsc-language-v78d" || data.type === "ipsc-app-active-v78d") applyFrameLanguageV78d(data.lang || localStorage.getItem("selectedLanguage") || "de");
        if (data.type === "ipsc-auth-refresh-v78d") { try { if (window.supabaseClient && window.supabaseClient.auth) window.supabaseClient.auth.getSession().then(function(result){ var user = result && result.data && result.data.session && result.data.session.user; window.currentUser = user || null; if (typeof window.onAuthChange === "function") window.onAuthChange(window.currentUser || null); }); } catch (_) {} }
        if (data.type === "ipsc-auth-session-v78l" && data.user) { try { window.currentUser = data.user; if (typeof window.onAuthChange === "function") window.onAuthChange(window.currentUser); } catch (_) {} }
        if (data.type === "ipsc-auth-logout-v78d") { try { window.currentUser = null; if (typeof window.onAuthChange === "function") window.onAuthChange(null); } catch (_) {} }
      });
    })();
    if (typeof window !== "undefined" && window.__IPSC_APP_FRAME_V78D) return;
    // V76D DOUBLE AA RETRY FIX
    // V76C DOUBLE AA MENU GATE: club links are hidden until Supabase confirms profiles.is_doppel_aa === true
    const __headerLogoPreload = new Image();
    __headerLogoPreload.src = "icon-192.png";
    const HEADER_USER_CACHE_KEY = "headerUserCache";
    const HEADER_AVATAR_CACHE_KEY = "headerAvatar";
    const DEFAULT_HEADER_AVATAR = "icon-192.png";

    const escapeAttr = (value) => String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const getCachedHeaderUser = () => {
        try {
            const raw = localStorage.getItem(HEADER_USER_CACHE_KEY);
            if (!raw) return null;

            const cached = JSON.parse(raw);
            const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

            if (!cached || !cached.updated_at || Date.now() - cached.updated_at > maxAgeMs) {
                localStorage.removeItem(HEADER_USER_CACHE_KEY);
                localStorage.removeItem(HEADER_AVATAR_CACHE_KEY);
                return null;
            }

            return cached;
        } catch (err) {
            localStorage.removeItem(HEADER_USER_CACHE_KEY);
            localStorage.removeItem(HEADER_AVATAR_CACHE_KEY);
            return null;
        }
    };

    const bindHeaderAuthButtons = (isVipPage) => {
        const loginBtn = document.getElementById("btn-open-login");
        const profileBtn = document.getElementById("btn-open-settings");

        if (loginBtn && !loginBtn.dataset.headerBound) {
            loginBtn.dataset.headerBound = "1";

            loginBtn.addEventListener("click", () => {
                if (isVipPage) {
                    window.location.href = "index.html";
                    return;
                }

                if (typeof window.openLoginModal === "function") {
                    window.openLoginModal();
                    return;
                }
                const modal = document.getElementById("auth-modal");
                if (modal) {
                    modal.style.setProperty("display", "flex", "important");
                    modal.style.setProperty("visibility", "visible", "important");
                    modal.style.setProperty("opacity", "1", "important");
                    modal.style.setProperty("pointer-events", "auto", "important");
                    modal.removeAttribute("aria-hidden");
                    if (typeof window.toggleAuthView === "function") {
                        window.toggleAuthView("login");
                    }
                }
            });
        }

        if (profileBtn && !profileBtn.dataset.headerBound) {
            profileBtn.dataset.headerBound = "1";

            profileBtn.addEventListener("click", () => {
                if (typeof window.openSettingsModal === "function") {
                    window.openSettingsModal();
                    return;
                }

                const modal = document.getElementById("auth-modal");
                if (modal) {
                    modal.style.setProperty("display", "flex", "important");
                    modal.style.setProperty("visibility", "visible", "important");
                    modal.style.setProperty("opacity", "1", "important");
                    modal.style.setProperty("pointer-events", "auto", "important");
                    modal.removeAttribute("aria-hidden");
                    if (typeof window.toggleAuthView === "function") {
                        window.toggleAuthView("settings");
                    }
                }
            });
        }
    };

    const injectHeader = () => {
        const header = document.querySelector("header");
        if (!header) return false;

        const path = window.location.pathname;
        let page = path.split("/").pop() || "index.html";
        if (page === "") page = "index.html";
        // V76T virtual page for native shell: keep active nav state while native-shell.html hosts the content.
        if (page === "native-shell.html") {
            try {
                const viewParamV76t = new URLSearchParams(window.location.search || "").get("view") || sessionStorage.getItem("ipsc_native_shell_view_v76t") || "index.html";
                const viewUrlV76t = new URL(viewParamV76t, window.location.href);
                const viewPageV76t = viewUrlV76t.pathname.split("/").pop() || "index.html";
                if (viewPageV76t && viewPageV76t !== "native-shell.html") page = viewPageV76t;
            } catch (_) { page = "index.html"; }
        }

        const savedLanguageSetting = localStorage.getItem("selectedLanguage") || "de";
        const cachedHeaderUser = getCachedHeaderUser();
        const cachedAvatarUrl = escapeAttr(
            cachedHeaderUser?.avatar_url ||
            localStorage.getItem(HEADER_AVATAR_CACHE_KEY) ||
            DEFAULT_HEADER_AVATAR
        );

        const hasCachedLogin = !!cachedHeaderUser;
        const isVipPage = page === "doppel-aa.html" || page === "performance.html";
        const moreTabPagesV52 = ["freie-matches.html", "schiessbuch.html", "sg-timer-live.html", "tools.html", "analytics.html", "wiederladen.html", "ipsc-hub.html", "doppel-aa.html", "performance.html"];
        const isMoreTabActiveV52 = moreTabPagesV52.includes(page);

        const headerTitle = isVipPage
            ? "Double Alpha"
            : "IPSC STARTPLATZ-<span class='logo-accent'>BÖRSE</span>";

        const headerSub = isVipPage
            ? "Vereins-Bereich 🔒"
            : "Von Schützen für Schützen";

        const links = [
            { href: "index.html", text: "Startseite", key: "nav-startseite" },
            { href: "marktplatz.html", text: "Marktplatz", key: "card-title-market" },
            { href: "freie-matches.html", text: "Freie Match-Plätze", key: "card-title-free" },
            { href: "mein-planer.html", text: "Mein Planer", key: "card-title-planer" },
            { href: "community.html", text: "Community", key: "card-title-comm" },
            { href: "schiessbuch.html", text: "Schießbuch", key: "card-title-schießbuch" },
            { href: "sg-timer-live.html", text: "⏱️ SG-Timer Live", key: "nav-sgtimer" },
            { href: "tools.html", text: "Tools & Training", key: "card-title-tools" },
            { href: "analytics.html", text: "Statistiken", key: "nav-analytics" },
            { href: "wiederladen.html", text: "Wiederladen", key: "nav-wiederladen" },
            { href: "ipsc-hub.html", text: "IPSC Hub", key: "card-title-hub" }
        ];

        let navHtml = "";
        links.forEach(link => {
            const isActive = page === link.href;
            const className = isActive ? "active" : "inactive";
            navHtml += `<a href="${link.href}" class="${className}" data-txt="${link.key}">${link.text}</a>`;
        });

        header.innerHTML = `
            <a href="index.html" class="header-logo-link" title="Zur Startseite">
               <span class="header-logo-frame">

    <img src="icon-192.png" width="44" height="44" alt="IPSC Logo" class="header-logo-img">

</span>
                <div class="logo-text-group">
                    <h1 ${isVipPage ? "" : 'data-txt="main-title"'} class="${isVipPage ? "vip-title" : ""}">${headerTitle}</h1>
                    <p ${isVipPage ? "" : 'data-txt="sub-title"'}>${headerSub}</p>
                </div>
            </a>

            <div class="header-controls">
                <button id="theme-toggle" class="theme-toggle-btn" onclick="toggleTheme()" title="Design umschalten">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                </button>

                ${isVipPage ? "" : `
                    <button id="header-chat-btn" class="theme-toggle-btn header-chat-btn" onclick="toggleGlobalInbox()" title="Nachrichten" aria-label="Nachrichten öffnen">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span id="chat-badge-count">0</span>
                    </button>

                    <select id="language-select" class="lang-select lang-switch">
                        <option value="de" ${savedLanguageSetting === "de" ? "selected" : ""}>DE</option>
                        <option value="en" ${savedLanguageSetting === "en" ? "selected" : ""}>EN</option>
                    </select>
                `}

                <div id="auth-status-container" data-auth-state="${hasCachedLogin ? "in" : "out"}">
                    <button class="btn-auth" id="btn-open-login" style="${hasCachedLogin ? "display:none !important;" : ""}" ${isVipPage ? "" : 'data-txt="btn-login-reg"'}>Login</button>

                    <button id="btn-open-settings" class="theme-toggle-btn header-avatar-btn" style="${hasCachedLogin ? "" : "display:none !important;"}" title="Profil" aria-label="Profil öffnen">
                        <img id="header-avatar" src="${cachedAvatarUrl}" width="34" height="34" alt="Profilbild">
                    </button>

                    <button class="btn-auth" id="btn-logout" style="${hasCachedLogin ? "" : "display:none !important;"}" data-txt="btn-logout">Abmelden</button>
                </div>
            </div>

            <nav class="main-nav desktop-only">
                ${navHtml}
            </nav>
        `;

        if (!document.getElementById("bottom-tab-bar")) {
            const bottomBar = document.createElement("nav");
            bottomBar.id = "bottom-tab-bar";
            bottomBar.className = "mobile-only";

            bottomBar.innerHTML = `
                <a href="index.html" class="tab-item ${page === "index.html" ? "active" : ""}">
                    <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span data-txt="tab-start">Start</span>
                </a>

                <a href="marktplatz.html" class="tab-item ${page === "marktplatz.html" ? "active" : ""}">
                    <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    <span data-txt="tab-market">Markt</span>
                </a>

                <a href="mein-planer.html" class="tab-item ${page === "mein-planer.html" ? "active" : ""}">
                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span data-txt="tab-planner">Planer</span>
                </a>

                <a href="community.html" class="tab-item ${page === "community.html" ? "active" : ""}">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span data-txt="tab-comm">Comm</span>
                </a>

                <div class="tab-item ${isMoreTabActiveV52 ? "active" : ""}" id="btn-more-menu" onclick="toggleMoreMenu()">
                    <svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    <span data-txt="tab-more">Mehr</span>
                </div>
            `;

            document.body.appendChild(bottomBar);

            const moreMenu = document.createElement("div");
            moreMenu.id = "more-menu-overlay";
            moreMenu.className = "mobile-only";

            moreMenu.innerHTML = `
                <div class="more-menu-content" id="more-menu-list">
                    <div id="club-links-placeholder-v76c"></div>
                    <div class="more-scroll-hint-v76">${savedLanguageSetting === "en" ? "More sections below" : "Weitere Bereiche unten"}</div>
                    <a href="freie-matches.html" class="${page === "freie-matches.html" ? "active" : ""}" data-txt="card-title-free">Freie Match-Plätze</a>
                    <a href="schiessbuch.html" class="${page === "schiessbuch.html" ? "active" : ""}" data-txt="card-title-schiessbuch">Schießbuch</a>
                    <a href="sg-timer-live.html" class="${page === "sg-timer-live.html" ? "active" : ""}" data-txt="nav-sgtimer">⏱️ SG-Timer Live</a>
                    <a href="tools.html" class="${page === "tools.html" ? "active" : ""}" data-txt="card-title-tools">Tools & Training</a>
                    <a href="analytics.html" class="${page === "analytics.html" ? "active" : ""}" data-txt="nav-analytics">Statistiken</a>
                    <a href="wiederladen.html" class="${page === "wiederladen.html" ? "active" : ""}" data-txt="nav-wiederladen">Wiederladen</a>
                    <a href="ipsc-hub.html" class="${page === "ipsc-hub.html" ? "active" : ""}" data-txt="card-title-hub">IPSC Hub</a>
                </div>
            `;

            document.body.appendChild(moreMenu);
        }

        if (isVipPage && !document.getElementById("vip-header-style")) {
            const vipStyle = document.createElement("style");
            vipStyle.id = "vip-header-style";

            vipStyle.innerHTML = `
                header {
                    background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%) !important;
                    border-bottom: 2px solid var(--accent-color) !important;
                    border-radius: 0 0 15px 15px;
                    padding-bottom: 20px !important;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 20px rgba(255, 159, 67, 0.15) !important;
                }

                header .vip-title {
                    background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 26px !important;
                    letter-spacing: 1.5px;
                    text-shadow: 0px 2px 4px rgba(0,0,0,0.4);
                }

                header .theme-toggle-btn,
                header .btn-auth,
                header .main-nav a.inactive {
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: #ffffff !important;
                    border-color: rgba(255, 255, 255, 0.2) !important;
                }
            `;

            document.head.appendChild(vipStyle);
        }

        if (!document.getElementById("dynamic-header-style")) {
            const style = document.createElement("style");
            style.id = "dynamic-header-style";

            style.innerHTML = `
                header {
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 100 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    padding-top: 12px !important;
                }

                header:not(.auth-ready) .header-controls {
                    visibility: visible !important;
                }

                header.auth-ready .header-controls {
                    visibility: visible !important;
                }

                header .header-logo-link {
                    text-decoration: none !important;
                    color: inherit !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                    cursor: pointer !important;
                    transition: opacity 0.2s !important;
                    text-align: left !important;
                }

                header .header-logo-frame {
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;
    min-height: 48px !important;
    max-width: 48px !important;
    max-height: 48px !important;
    flex: 0 0 48px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
}

header .header-logo-img {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    min-height: 38px !important;
    max-width: 38px !important;
    max-height: 38px !important;
    object-fit: contain !important;
    flex: 0 0 38px !important;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15)) !important;
    border-radius: 4px !important;
    display: block !important;
    transition: none !important;
    transform: none !important;
}

                header .logo-text-group h1 {
                    margin: 0 !important;
                    line-height: 1.1 !important;
                }

                header .logo-text-group p {
                    color: var(--accent-color) !important;
                    margin: 3px 0 0 0 !important;
                    font-size: 12px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 2px !important;
                    font-weight: 700 !important;
                }

                header .header-controls {
                    position: absolute !important;
                    top: calc(env(safe-area-inset-top) + 24px) !important;
                    right: 20px !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                    flex-direction: row !important;
                    min-height: 42px !important;
                }

                header #auth-status-container {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-end !important;
                    flex-direction: row !important;
                    gap: 8px !important;
                    min-height: 42px !important;
                }

                header #auth-status-container[data-auth-state="in"] #btn-open-login {
                    display: none !important;
                }

                header #auth-status-container[data-auth-state="in"] #btn-open-settings,
                header #auth-status-container[data-auth-state="in"] #btn-logout {
                    display: inline-flex !important;
                }

                header #auth-status-container[data-auth-state="out"] #btn-open-login {
                    display: inline-flex !important;
                }

                header #auth-status-container[data-auth-state="out"] #btn-open-settings,
                header #auth-status-container[data-auth-state="out"] #btn-logout {
                    display: none !important;
                }

                header .theme-toggle-btn {
                    width: 38px !important;
                    height: 38px !important;
                    min-width: 38px !important;
                    min-height: 38px !important;
                    max-width: 38px !important;
                    max-height: 38px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    flex: 0 0 38px !important;
                    background: var(--card-bg) !important;
                    color: var(--text-color) !important;
                    border: 1px solid var(--border-color) !important;
                    border-radius: 8px !important;
                    cursor: pointer !important;
                    box-shadow: var(--shadow-sm) !important;
                    box-sizing: border-box !important;
                    padding: 0 !important;
                }


                header #header-chat-btn {
                    position: relative !important;
                    overflow: visible !important;
                    isolation: isolate !important;
                }

                header #chat-badge-count {
                    display: none;
                    position: absolute !important;
                    top: -7px !important;
                    right: -7px !important;
                    min-width: 18px !important;
                    height: 18px !important;
                    padding: 0 5px !important;
                    border-radius: 999px !important;
                    background: #ef4444 !important;
                    color: #ffffff !important;
                    font-size: 10px !important;
                    line-height: 18px !important;
                    font-weight: 800 !important;
                    text-align: center !important;
                    box-shadow: 0 0 0 2px var(--card-bg), 0 8px 16px rgba(239,68,68,.28) !important;
                    z-index: 5 !important;
                    pointer-events: none !important;
                }

                header #header-chat-btn.has-chat-unread #chat-badge-count {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                header #header-chat-btn.has-chat-unread {
                    border-color: rgba(239,68,68,.35) !important;
                }

                header .theme-toggle-btn svg {
                    display: block !important;
                    stroke: currentColor !important;
                }

                header .lang-select {
                    width: auto !important;
                    min-width: 54px !important;
                    max-width: 64px !important;
                    height: 38px !important;
                    padding: 0 10px !important;
                    flex: 0 0 auto !important;
                    background: var(--card-bg) !important;
                    color: var(--text-color) !important;
                    border: 1px solid var(--border-color) !important;
                    border-radius: 8px !important;
                    font-weight: 600 !important;
                    font-size: 13px !important;
                    box-sizing: border-box !important;
                }

                header .btn-auth {
                    width: auto !important;
                    height: 38px !important;
                    padding: 0 16px !important;
                    flex: 0 0 auto !important;
                    white-space: nowrap !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-weight: 600 !important;
                    font-size: 13px !important;
                    border-radius: 8px !important;
                    cursor: pointer !important;
                    background-color: var(--card-bg) !important;
                    color: var(--text-color) !important;
                    border: 1px solid var(--border-color) !important;
                    box-sizing: border-box !important;
                }

                header #btn-open-settings.header-avatar-btn {
                    width: 42px !important;
                    height: 42px !important;
                    min-width: 42px !important;
                    min-height: 42px !important;
                    max-width: 42px !important;
                    max-height: 42px !important;
                    flex: 0 0 42px !important;
                    padding: 0 !important;
                    overflow: visible !important;
                    border-radius: 50% !important;
                    transition: none !important;
                }

                header #btn-open-settings.header-avatar-btn img,
                header #header-avatar {
                    width: 36px !important;
                    height: 36px !important;
                    min-width: 36px !important;
                    min-height: 36px !important;
                    max-width: 36px !important;
                    max-height: 36px !important;
                    object-fit: cover !important;
                    border-radius: 50% !important;
                    display: block !important;
                    box-sizing: border-box !important;
                    transition: none !important;
                    flex: 0 0 36px !important;
                    border: 2px solid var(--accent-color) !important;
                    padding: 2px !important;
                    background: var(--card-bg) !important;
                    box-shadow: 0 4px 12px rgba(255, 159, 67, 0.2) !important;
                }

                header #btn-logout {
                    width: auto !important;
                    min-width: auto !important;
                    max-width: none !important;
                    flex: 0 0 auto !important;
                    white-space: nowrap !important;
                    background: rgba(239, 68, 68, 0.05) !important;
                    border: 1px solid rgba(239, 68, 68, 0.2) !important;
                    color: var(--danger-color) !important;
                    border-radius: 20px !important;
                    padding: 0 20px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    font-size: 11px !important;
                    transition: none !important;
                }

                #chat-badge-count {
                    display: none;
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: var(--danger-color);
                    color: white;
                    font-size: 10px;
                    padding: 2px 5px;
                    border-radius: 50%;
                    font-weight: bold;
                }

                .mobile-only {
                    display: none !important;
                }

                header .main-nav {
                    width: 100% !important;
                    margin-top: 20px !important;
                    display: flex !important;
                    justify-content: center !important;
                    gap: 8px !important;
                    border-top: 1px solid var(--border-color) !important;
                    padding-top: 12px !important;
                    padding-bottom: 15px !important;
                    flex-wrap: wrap !important;
                }

                header .main-nav a {
                    text-decoration: none !important;
                    font-weight: 600 !important;
                    font-size: 12px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.3px !important;
                    padding: 8px 16px !important;
                    border-radius: 20px !important;
                    transition: all 0.2s ease !important;
                    white-space: nowrap !important;
                }

                header .main-nav a.active {
                    color: #ffffff !important;
                    background-color: var(--accent-color) !important;
                    box-shadow: var(--shadow-sm) !important;
                }

                header .main-nav a.inactive {
                    color: var(--text-muted) !important;
                    background-color: rgba(0, 0, 0, 0.03) !important;
                }

                @media (max-width: 768px) {
                    header .main-nav.desktop-only {
                        display: none !important;
                    }

                    .mobile-only {
                        display: flex !important;
                    }

                    header {
                        padding: calc(env(safe-area-inset-top) + 12px) 10px 12px 10px !important;
                        align-items: center !important;
                    }

                    header .header-logo-link {
                        justify-content: center !important;
                        width: 100% !important;
                    }

                    header .header-controls {
                        position: relative !important;
                        top: auto !important;
                        right: auto !important;
                        display: flex !important;
                        flex-direction: row !important;
                        flex-wrap: wrap !important;
                        justify-content: center !important;
                        align-items: center !important;
                        gap: 8px !important;
                        margin-top: 10px !important;
                        width: 100% !important;
                    }

                    header #auth-status-container {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 8px !important;
                        min-height: 40px !important;
                        flex: 0 0 auto !important;
                    }

                    header .btn-auth {
                        width: auto !important;
                        height: 34px !important;
                        padding: 0 12px !important;
                        font-size: 11px !important;
                        flex: 0 0 auto !important;
                    }

                    header .lang-select {
                        width: auto !important;
                        min-width: 50px !important;
                        max-width: 58px !important;
                        height: 34px !important;
                        font-size: 11px !important;
                        flex: 0 0 auto !important;
                    }

                    header .theme-toggle-btn {
                        width: 34px !important;
                        height: 34px !important;
                        min-width: 34px !important;
                        min-height: 34px !important;
                        max-width: 34px !important;
                        max-height: 34px !important;
                        flex: 0 0 34px !important;
                    }

                    header #btn-open-settings.header-avatar-btn {
                        width: 40px !important;
                        height: 40px !important;
                        min-width: 40px !important;
                        min-height: 40px !important;
                        max-width: 40px !important;
                        max-height: 40px !important;
                        flex: 0 0 40px !important;
                    }

                    header #btn-open-settings.header-avatar-btn img,
                    header #header-avatar {
                        width: 34px !important;
                        height: 34px !important;
                        min-width: 34px !important;
                        min-height: 34px !important;
                        max-width: 34px !important;
                        max-height: 34px !important;
                    }



                    header .header-logo-frame {
                        width: 42px !important;
                        height: 42px !important;
                        min-width: 42px !important;
                        min-height: 42px !important;
                        max-width: 42px !important;
                        max-height: 42px !important;
                        flex: 0 0 42px !important;
                    }

                    header .header-logo-img {
                        width: 34px !important;
                        height: 34px !important;
                        min-width: 34px !important;
                        min-height: 34px !important;
                        max-width: 34px !important;
                        max-height: 34px !important;
                        flex: 0 0 34px !important;
                    }

                    header .logo-text-group h1 {
                        font-size: 19px !important;
                        line-height: 1.08 !important;
                        letter-spacing: 0.6px !important;
                    }

                    header .logo-text-group p {
                        font-size: 9.5px !important;
                        letter-spacing: 1.4px !important;
                        margin-top: 2px !important;
                    }

                    body {
                        padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
                    }

                    #bottom-tab-bar {
                        position: fixed !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        background: var(--card-bg) !important;
                        border-top: 1px solid var(--border-color) !important;
                        justify-content: space-around !important;
                        align-items: center !important;
                        padding-bottom: env(safe-area-inset-bottom) !important;
                        height: 58px !important;
                        z-index: 99999 !important;
                        box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.08) !important;
                        -webkit-transform: translateZ(0) !important;
                        transform: translateZ(0) !important;
                    }

                    #bottom-tab-bar .tab-item {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        text-decoration: none !important;
                        color: var(--text-muted) !important;
                        width: 20% !important;
                        height: 100% !important;
                        cursor: pointer !important;
                    }

                    #bottom-tab-bar .tab-item svg {
                        width: 22px !important;
                        height: 22px !important;
                        margin-bottom: 4px !important;
                        stroke: currentColor !important;
                        fill: none !important;
                        stroke-width: 2 !important;
                        stroke-linecap: round !important;
                        stroke-linejoin: round !important;
                    }

                    #bottom-tab-bar .tab-item span {
                        font-size: 10px !important;
                        font-weight: 600 !important;
                    }

                    #bottom-tab-bar .tab-item.active {
                        color: var(--accent-color) !important;
                    }

                    #more-menu-overlay {
                        position: fixed !important;
                        bottom: calc(58px + env(safe-area-inset-bottom)) !important;
                        left: 0 !important;
                        width: 100% !important;
                        background: var(--bg-color) !important;
                        border-radius: 20px 20px 0 0 !important;
                        box-shadow: 0 -10px 25px rgba(0,0,0,0.1) !important;
                        transform: translateY(120%) !important;
                        transition: transform 0.3s ease-in-out !important;
                        z-index: 99998 !important;
                        max-height: 70vh !important;
                        overflow-y: auto !important;
                        padding: 20px !important;
                        box-sizing: border-box !important;
                        display: block !important;
                    }

                    #more-menu-overlay.show {
                        transform: translateY(0) !important;
                    }

                    #more-menu-list {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 10px !important;
                    }

                    #more-menu-list a {
                        padding: 15px !important;
                        text-decoration: none !important;
                        color: var(--text-color) !important;
                        font-weight: 600 !important;
                        background: var(--card-bg) !important;
                        border-radius: 12px !important;
                        border: 1px solid var(--border-color) !important;
                        text-align: center !important;
                    }

                    #more-menu-list a.active {
                        background: var(--accent-color) !important;
                        color: #ffffff !important;
                        border-color: var(--accent-color) !important;
                    }

                    #more-menu-list a.vip-link {
                        color: #ff9f43 !important;
                        border-color: rgba(255, 159, 67, 0.3) !important;
                        background: rgba(255, 159, 67, 0.05) !important;
                    }
                }
            `;

            document.head.appendChild(style);
        }

        if (!document.getElementById("dynamic-header-polish-v12")) {
            const polishStyle = document.createElement("style");
            polishStyle.id = "dynamic-header-polish-v12";

            polishStyle.innerHTML = `
                @media (max-width: 768px) {
                    header {
                        padding: calc(env(safe-area-inset-top) + 14px) 12px 14px 12px !important;
                    }

                    header .header-logo-link {
                        gap: 11px !important;
                    }

                    header .header-logo-frame {
                        width: 50px !important;
                        height: 50px !important;
                        min-width: 50px !important;
                        min-height: 50px !important;
                        max-width: 50px !important;
                        max-height: 50px !important;
                        flex: 0 0 50px !important;
                    }

                    header .header-logo-img {
                        width: 42px !important;
                        height: 42px !important;
                        min-width: 42px !important;
                        min-height: 42px !important;
                        max-width: 42px !important;
                        max-height: 42px !important;
                    }

                    header .logo-text-group h1 {
                        font-size: 22px !important;
                        line-height: 1.08 !important;
                        letter-spacing: 0.7px !important;
                    }

                    header .logo-text-group p {
                        font-size: 10.5px !important;
                        line-height: 1.15 !important;
                        letter-spacing: 1.7px !important;
                    }

                    header .header-controls {
                        gap: 9px !important;
                        margin-top: 12px !important;
                    }

                    header .theme-toggle-btn {
                        width: 38px !important;
                        height: 38px !important;
                        min-width: 38px !important;
                        min-height: 38px !important;
                        max-width: 38px !important;
                        max-height: 38px !important;
                        flex: 0 0 38px !important;
                        border-radius: 11px !important;
                    }

                    header .lang-select {
                        height: 38px !important;
                        min-width: 58px !important;
                        max-width: 68px !important;
                        font-size: 13px !important;
                        border-radius: 11px !important;
                    }

                    header #btn-open-settings.header-avatar-btn {
                        width: 48px !important;
                        height: 48px !important;
                        min-width: 48px !important;
                        min-height: 48px !important;
                        max-width: 48px !important;
                        max-height: 48px !important;
                        flex: 0 0 48px !important;
                        border-radius: 50% !important;
                    }

                    header #btn-open-settings.header-avatar-btn img,
                    header #header-avatar {
                        width: 42px !important;
                        height: 42px !important;
                        min-width: 42px !important;
                        min-height: 42px !important;
                        max-width: 42px !important;
                        max-height: 42px !important;
                        border: 2px solid var(--accent-color) !important;
                        padding: 2px !important;
                        box-shadow: 0 6px 16px rgba(255, 159, 67, 0.28) !important;
                    }

                    header #btn-logout {
                        height: 38px !important;
                        min-height: 38px !important;
                        padding: 0 18px !important;
                        font-size: 11px !important;
                        border-radius: 999px !important;
                        letter-spacing: 0.8px !important;
                    }
                }
            `;

            document.head.appendChild(polishStyle);
        }


        if (!document.getElementById("dynamic-header-polish-v13")) {
            const polishStyleV13 = document.createElement("style");
            polishStyleV13.id = "dynamic-header-polish-v13";

            polishStyleV13.innerHTML = `
                #main-header {
                    min-height: 152px !important;
                    box-sizing: border-box !important;
                }

                header .header-logo-frame,
                header .header-logo-img,
                header #btn-open-settings.header-avatar-btn,
                header #header-avatar {
                    transition: none !important;
                    animation: none !important;
                }

                @media (max-width: 768px) {
                    #main-header {
                        min-height: 155px !important;
                    }

                    header {
                        padding: calc(env(safe-area-inset-top) + 14px) 12px 14px 12px !important;
                    }

                    header .header-logo-link {
                        gap: 11px !important;
                    }

                    header .header-logo-frame {
                        width: 52px !important;
                        height: 52px !important;
                        min-width: 52px !important;
                        min-height: 52px !important;
                        max-width: 52px !important;
                        max-height: 52px !important;
                        flex: 0 0 52px !important;
                    }

                    header .header-logo-img {
                        width: 44px !important;
                        height: 44px !important;
                        min-width: 44px !important;
                        min-height: 44px !important;
                        max-width: 44px !important;
                        max-height: 44px !important;
                        object-fit: contain !important;
                        transform: translateZ(0) !important;
                        backface-visibility: hidden !important;
                    }

                    header .logo-text-group h1 {
                        font-size: 22px !important;
                        line-height: 1.08 !important;
                        letter-spacing: 0.7px !important;
                    }

                    header .logo-text-group p {
                        font-size: 10.5px !important;
                        line-height: 1.15 !important;
                        letter-spacing: 1.7px !important;
                    }

                    header .header-controls {
                        gap: 9px !important;
                        margin-top: 12px !important;
                    }

                    header .theme-toggle-btn {
                        width: 38px !important;
                        height: 38px !important;
                        min-width: 38px !important;
                        min-height: 38px !important;
                        max-width: 38px !important;
                        max-height: 38px !important;
                        flex: 0 0 38px !important;
                        border-radius: 11px !important;
                    }

                    header .lang-select {
                        height: 38px !important;
                        min-width: 58px !important;
                        max-width: 68px !important;
                        font-size: 13px !important;
                        border-radius: 11px !important;
                    }

                    header #btn-open-settings.header-avatar-btn {
                        width: 48px !important;
                        height: 48px !important;
                        min-width: 48px !important;
                        min-height: 48px !important;
                        max-width: 48px !important;
                        max-height: 48px !important;
                        flex: 0 0 48px !important;
                        border-radius: 50% !important;
                    }

                    header #btn-open-settings.header-avatar-btn img,
                    header #header-avatar {
                        width: 42px !important;
                        height: 42px !important;
                        min-width: 42px !important;
                        min-height: 42px !important;
                        max-width: 42px !important;
                        max-height: 42px !important;
                        border: 2px solid var(--accent-color) !important;
                        padding: 2px !important;
                        box-shadow: 0 6px 16px rgba(255, 159, 67, 0.28) !important;
                    }

                    header #btn-logout {
                        height: 38px !important;
                        min-height: 38px !important;
                        padding: 0 18px !important;
                        font-size: 11px !important;
                        border-radius: 999px !important;
                        letter-spacing: 0.8px !important;
                    }
                }
            `;

            document.head.appendChild(polishStyleV13);
        }


        if (!document.getElementById("dynamic-header-polish-v14")) {
            const polishStyleV14 = document.createElement("style");
            polishStyleV14.id = "dynamic-header-polish-v14";

            polishStyleV14.innerHTML = `
                @media (max-width: 768px) {
                    #main-header {
                        min-height: 132px !important;
                    }

                    header {
                        padding: calc(env(safe-area-inset-top) + 12px) 12px 10px 12px !important;
                    }

                    header .header-logo-link {
                        gap: 10px !important;
                        margin-bottom: 0 !important;
                    }

                    header .logo-text-group p {
                        margin-top: 1px !important;
                        margin-bottom: 0 !important;
                    }

                    header .header-controls {
                        margin-top: 5px !important;
                        gap: 8px !important;
                    }

                    header .header-logo-frame {
                        width: 50px !important;
                        height: 50px !important;
                        min-width: 50px !important;
                        min-height: 50px !important;
                        max-width: 50px !important;
                        max-height: 50px !important;
                        flex: 0 0 50px !important;
                    }

                    header .header-logo-img {
                        width: 42px !important;
                        height: 42px !important;
                        min-width: 42px !important;
                        min-height: 42px !important;
                        max-width: 42px !important;
                        max-height: 42px !important;
                    }
                }
            `;

            document.head.appendChild(polishStyleV14);
        }


        if (!document.getElementById("premium-bottom-nav-v35")) {
            const navStyle = document.createElement("style");
            navStyle.id = "premium-bottom-nav-v35";
            navStyle.innerHTML = `
                @media (max-width: 768px) {
                    .bottom-tab-bar {
                        position: fixed !important;
                        left: 50% !important;
                        right: auto !important;
                        bottom: max(10px, env(safe-area-inset-bottom)) !important;
                        transform: translateX(-50%) !important;
                        width: calc(100% - 22px) !important;
                        max-width: 520px !important;
                        height: 72px !important;
                        padding: 7px 8px !important;
                        display: grid !important;
                        grid-template-columns: repeat(5, 1fr) !important;
                        align-items: center !important;
                        gap: 4px !important;
                        border-radius: 28px !important;
                        border: 1px solid rgba(148, 163, 184, 0.22) !important;
                        background:
                            linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78)) !important;
                        box-shadow:
                            0 18px 44px rgba(15, 23, 42, 0.14),
                            0 2px 8px rgba(15, 23, 42, 0.05),
                            inset 0 1px 0 rgba(255,255,255,0.78) !important;
                        backdrop-filter: blur(22px) saturate(1.6) !important;
                        -webkit-backdrop-filter: blur(22px) saturate(1.6) !important;
                        z-index: 99990 !important;
                    }

                    html[data-theme="dark"] .bottom-tab-bar {
                        background:
                            linear-gradient(180deg, rgba(31, 41, 55, 0.88), rgba(15, 23, 42, 0.78)) !important;
                        border-color: rgba(148, 163, 184, 0.18) !important;
                        box-shadow:
                            0 18px 46px rgba(0,0,0,0.36),
                            inset 0 1px 0 rgba(255,255,255,0.08) !important;
                    }

                    .bottom-tab-bar .tab-item {
                        position: relative !important;
                        height: 58px !important;
                        min-width: 0 !important;
                        padding: 5px 2px 4px !important;
                        border-radius: 22px !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 2px !important;
                        color: var(--text-muted) !important;
                        text-decoration: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                        touch-action: manipulation !important;
                        user-select: none !important;
                        transition:
                            transform 145ms cubic-bezier(.2,.8,.2,1),
                            background 145ms ease,
                            color 145ms ease,
                            box-shadow 145ms ease !important;
                    }

                    .bottom-tab-bar .tab-item::before {
                        content: "" !important;
                        position: absolute !important;
                        inset: 5px 7px !important;
                        border-radius: 20px !important;
                        background: transparent !important;
                        transform: scale(.86) !important;
                        opacity: 0 !important;
                        transition:
                            opacity 160ms ease,
                            transform 160ms cubic-bezier(.2,.8,.2,1),
                            background 160ms ease !important;
                        z-index: -1 !important;
                    }

                    .bottom-tab-bar .tab-item svg {
                        width: 24px !important;
                        height: 24px !important;
                        stroke-width: 2.35 !important;
                        margin: 0 !important;
                        transition:
                            transform 150ms cubic-bezier(.2,.8,.2,1),
                            stroke 150ms ease,
                            filter 150ms ease !important;
                    }

                    .bottom-tab-bar .tab-item span {
                        font-size: 11.5px !important;
                        line-height: 1 !important;
                        font-weight: 760 !important;
                        letter-spacing: -0.12px !important;
                        white-space: nowrap !important;
                        transition: transform 150ms ease, color 150ms ease !important;
                    }

                    .bottom-tab-bar .tab-item.active {
                        color: var(--accent-color) !important;
                    }

                    .bottom-tab-bar .tab-item.active::before {
                        opacity: 1 !important;
                        transform: scale(1) !important;
                        background:
                            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55), transparent 55%),
                            linear-gradient(135deg, rgba(255,159,67,0.18), rgba(255,128,8,0.09)) !important;
                        box-shadow:
                            inset 0 0 0 1px rgba(255,159,67,0.15),
                            0 8px 20px rgba(255,159,67,0.13) !important;
                    }

                    html[data-theme="dark"] .bottom-tab-bar .tab-item.active::before {
                        background:
                            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10), transparent 56%),
                            linear-gradient(135deg, rgba(255,159,67,0.22), rgba(255,128,8,0.10)) !important;
                        box-shadow:
                            inset 0 0 0 1px rgba(255,159,67,0.20),
                            0 8px 20px rgba(255,128,8,0.12) !important;
                    }

                    .bottom-tab-bar .tab-item.active svg {
                        transform: translateY(-1px) scale(1.06) !important;
                        filter: drop-shadow(0 5px 9px rgba(255,159,67,0.18)) !important;
                    }

                    .bottom-tab-bar .tab-item:active,
                    .bottom-tab-bar .tab-item.is-pressing {
                        transform: scale(.92) !important;
                    }

                    .bottom-tab-bar .tab-item:active::before,
                    .bottom-tab-bar .tab-item.is-pressing::before {
                        opacity: 1 !important;
                        transform: scale(.92) !important;
                        background: rgba(148, 163, 184, 0.12) !important;
                    }

                    .bottom-tab-bar .tab-item:active svg,
                    .bottom-tab-bar .tab-item.is-pressing svg {
                        transform: translateY(1px) scale(.94) !important;
                    }

                    body {
                        padding-bottom: calc(98px + env(safe-area-inset-bottom)) !important;
                    }

                    .more-menu-content {
                        bottom: calc(90px + env(safe-area-inset-bottom)) !important;
                        border-radius: 24px !important;
                        box-shadow: 0 22px 60px rgba(15, 23, 42, 0.22) !important;
                        backdrop-filter: blur(22px) saturate(1.4) !important;
                        -webkit-backdrop-filter: blur(22px) saturate(1.4) !important;
                    }
                }
            `;
            document.head.appendChild(navStyle);
        }

        // Premium Tap/Haptic Feedback v35:
        // Android/Chrome nutzt navigator.vibrate; iOS Safari ignoriert es, bekommt aber Press-Animation.
        if (!window.__premiumBottomNavFeedbackBound) {
            window.__premiumBottomNavFeedbackBound = true;

            const triggerNavFeedback = (el) => {
                if (!el) return;

                el.classList.add("is-pressing");
                window.setTimeout(() => el.classList.remove("is-pressing"), 145);

                try {
                    if (window.navigator && typeof window.navigator.vibrate === "function") {
                        window.navigator.vibrate(8);
                    }
                } catch (_) {}
            };

            document.addEventListener("pointerdown", (event) => {
                const item = event.target.closest?.(".bottom-tab-bar .tab-item");
                if (item) triggerNavFeedback(item);
            }, { passive: true });
        }





        // Page transition dark cover v50: verhindert weißen Blitz bei programmatischer Navigation
        if (!window.__pageTransitionCoverV50) {
            window.__pageTransitionCoverV50 = true;
            window.showPageTransitionCover = function(){ try { var t=document.documentElement.getAttribute("data-theme") || window.__IPSC_ACTIVE_THEME_V70 || "light"; document.documentElement.style.backgroundColor = (t === "dark") ? "#0f172a" : "#f6f8fc"; } catch(_){} };

            window.addEventListener("pageshow", () => {
                try { document.documentElement.classList.remove("is-page-leaving"); } catch (_) {}
            }, { passive: true });
        }

        // Native Shell Detection v49 (Capacitor/Xtools/WKWebView)
        if (!window.__nativeShellDetectionV49) {
            window.__nativeShellDetectionV49 = true;
            const markNativeShellV49 = () => {
                const isCapacitor =
                    !!window.Capacitor ||
                    !!window.webkit?.messageHandlers ||
                    location.protocol === "capacitor:" ||
                    location.protocol === "ionic:";

                document.body?.classList.toggle("is-app-shell", !!isCapacitor);
                document.documentElement.classList.toggle("is-native-shell", !!isCapacitor);
            };

            if (document.body) markNativeShellV49();
            else document.addEventListener("DOMContentLoaded", markNativeShellV49, { once: true });

            window.addEventListener("pageshow", markNativeShellV49, { passive: true });
        }

        // Browser/App Mode Detection v38:
        // Wichtig für Safari-Browser vs. spätere PWA/App-Ansicht.
        if (!window.__displayModeDetectionV38) {
            window.__displayModeDetectionV38 = true;

            const updateDisplayModeV38 = () => {
                const isStandalone =
                    window.matchMedia?.("(display-mode: standalone)")?.matches ||
                    window.navigator?.standalone === true;

                document.documentElement.classList.toggle("is-standalone-app", !!isStandalone);
                document.documentElement.classList.toggle("is-browser-mode", !isStandalone);
                document.documentElement.dataset.displayMode = isStandalone ? "standalone" : "browser";
            };

            updateDisplayModeV38();

            try {
                window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", updateDisplayModeV38);
            } catch (_) {}

            window.addEventListener("resize", updateDisplayModeV38, { passive: true });
            window.addEventListener("orientationchange", updateDisplayModeV38, { passive: true });
        }

        if (!document.getElementById("premium-bottom-nav-v37")) {
            const dockStyle = document.createElement("style");
            dockStyle.id = "premium-bottom-nav-v37";
            dockStyle.innerHTML = `
                @media (max-width: 768px) {
                    body {
                        padding-bottom: calc(104px + env(safe-area-inset-bottom)) !important;
                    }

                    #bottom-tab-bar {
                        position: fixed !important;
                        left: 50% !important;
                        right: auto !important;
                        bottom: max(12px, env(safe-area-inset-bottom)) !important;
                        transform: translateX(-50%) translateZ(0) !important;
                        width: calc(100% - 24px) !important;
                        max-width: 520px !important;
                        height: 72px !important;
                        padding: 7px 8px !important;
                        display: grid !important;
                        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        border-radius: 28px !important;
                        border: 1px solid rgba(148, 163, 184, 0.24) !important;
                        border-top: 1px solid rgba(148, 163, 184, 0.24) !important;
                        background:
                            linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.80)) !important;
                        box-shadow:
                            0 18px 44px rgba(15, 23, 42, 0.16),
                            0 2px 8px rgba(15, 23, 42, 0.05),
                            inset 0 1px 0 rgba(255,255,255,0.82) !important;
                        backdrop-filter: blur(22px) saturate(1.6) !important;
                        -webkit-backdrop-filter: blur(22px) saturate(1.6) !important;
                        z-index: 99990 !important;
                        overflow: hidden !important;
                    }

                    html[data-theme="dark"] #bottom-tab-bar {
                        background:
                            linear-gradient(180deg, rgba(31, 41, 55, 0.90), rgba(15, 23, 42, 0.80)) !important;
                        border-color: rgba(148, 163, 184, 0.18) !important;
                        box-shadow:
                            0 18px 46px rgba(0,0,0,0.38),
                            inset 0 1px 0 rgba(255,255,255,0.08) !important;
                    }

                    #bottom-tab-bar .tab-item {
                        position: relative !important;
                        width: auto !important;
                        height: 58px !important;
                        min-width: 0 !important;
                        padding: 5px 2px 4px !important;
                        border-radius: 22px !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 2px !important;
                        color: var(--text-muted) !important;
                        text-decoration: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                        touch-action: manipulation !important;
                        user-select: none !important;
                        transition:
                            transform 145ms cubic-bezier(.2,.8,.2,1),
                            color 145ms ease,
                            filter 145ms ease !important;
                    }

                    #bottom-tab-bar .tab-item::before {
                        content: "" !important;
                        position: absolute !important;
                        inset: 5px 6px !important;
                        border-radius: 20px !important;
                        background: transparent !important;
                        transform: scale(.86) !important;
                        opacity: 0 !important;
                        transition:
                            opacity 160ms ease,
                            transform 160ms cubic-bezier(.2,.8,.2,1),
                            background 160ms ease !important;
                        z-index: -1 !important;
                    }

                    #bottom-tab-bar .tab-item svg {
                        width: 24px !important;
                        height: 24px !important;
                        margin: 0 !important;
                        stroke-width: 2.35 !important;
                        stroke: currentColor !important;
                        fill: none !important;
                        stroke-linecap: round !important;
                        stroke-linejoin: round !important;
                        transition:
                            transform 150ms cubic-bezier(.2,.8,.2,1),
                            filter 150ms ease !important;
                    }

                    #bottom-tab-bar .tab-item span {
                        font-size: 11.5px !important;
                        line-height: 1 !important;
                        font-weight: 760 !important;
                        letter-spacing: -0.12px !important;
                        white-space: nowrap !important;
                    }

                    #bottom-tab-bar .tab-item.active {
                        color: var(--accent-color) !important;
                    }

                    #bottom-tab-bar .tab-item.active::before {
                        opacity: 1 !important;
                        transform: scale(1) !important;
                        background:
                            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.58), transparent 55%),
                            linear-gradient(135deg, rgba(255,159,67,0.18), rgba(255,128,8,0.09)) !important;
                        box-shadow:
                            inset 0 0 0 1px rgba(255,159,67,0.15),
                            0 8px 20px rgba(255,159,67,0.13) !important;
                    }

                    html[data-theme="dark"] #bottom-tab-bar .tab-item.active::before {
                        background:
                            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10), transparent 56%),
                            linear-gradient(135deg, rgba(255,159,67,0.22), rgba(255,128,8,0.10)) !important;
                    }

                    #bottom-tab-bar .tab-item.active svg {
                        transform: translateY(-1px) scale(1.06) !important;
                        filter: drop-shadow(0 5px 9px rgba(255,159,67,0.18)) !important;
                    }

                    #bottom-tab-bar .tab-item:active,
                    #bottom-tab-bar .tab-item.is-pressing {
                        transform: scale(.92) !important;
                    }

                    #bottom-tab-bar .tab-item:active::before,
                    #bottom-tab-bar .tab-item.is-pressing::before {
                        opacity: 1 !important;
                        transform: scale(.92) !important;
                        background: rgba(148, 163, 184, 0.12) !important;
                    }

                    #bottom-tab-bar .tab-item:active svg,
                    #bottom-tab-bar .tab-item.is-pressing svg {
                        transform: translateY(1px) scale(.94) !important;
                    }

                    .more-menu-content {
                        bottom: calc(96px + env(safe-area-inset-bottom)) !important;
                        border-radius: 24px !important;
                        box-shadow: 0 22px 60px rgba(15, 23, 42, 0.22) !important;
                        backdrop-filter: blur(22px) saturate(1.4) !important;
                        -webkit-backdrop-filter: blur(22px) saturate(1.4) !important;
                    }
                }
            `;
            document.head.appendChild(dockStyle);
        }

        if (!window.__premiumBottomNavFeedbackBoundV37) {
            window.__premiumBottomNavFeedbackBoundV37 = true;

            const triggerNavFeedbackV37 = (el) => {
                if (!el) return;
                el.classList.add("is-pressing");
                window.setTimeout(() => el.classList.remove("is-pressing"), 145);

                try {
                    if (window.navigator && typeof window.navigator.vibrate === "function") {
                        window.navigator.vibrate(8);
                    }
                } catch (_) {}
            };

            document.addEventListener("pointerdown", (event) => {
                const item = event.target.closest?.("#bottom-tab-bar .tab-item");
                if (item) triggerNavFeedbackV37(item);
            }, { passive: true });
        }


        if (!document.getElementById("premium-bottom-nav-v38")) {
            const dockStyleV38 = document.createElement("style");
            dockStyleV38.id = "premium-bottom-nav-v38";
            dockStyleV38.innerHTML = `
                @media (max-width: 768px) {
                    /* Browser-Safari: etwas flacher/leichter, damit es nicht so wuchtig wirkt */
                    html.is-browser-mode #bottom-tab-bar {
                        bottom: max(7px, env(safe-area-inset-bottom)) !important;
                        width: calc(100% - 30px) !important;
                        height: 64px !important;
                        padding: 6px 7px !important;
                        border-radius: 24px !important;
                        background:
                            linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.70)) !important;
                        box-shadow:
                            0 14px 34px rgba(15, 23, 42, 0.14),
                            0 1px 6px rgba(15, 23, 42, 0.05),
                            inset 0 1px 0 rgba(255,255,255,0.72) !important;
                    }

                    html[data-theme="dark"].is-browser-mode #bottom-tab-bar {
                        background:
                            linear-gradient(180deg, rgba(31,41,55,0.82), rgba(15,23,42,0.72)) !important;
                        box-shadow:
                            0 16px 38px rgba(0,0,0,0.34),
                            inset 0 1px 0 rgba(255,255,255,0.07) !important;
                    }

                    html.is-browser-mode #bottom-tab-bar .tab-item {
                        height: 52px !important;
                        border-radius: 19px !important;
                    }

                    html.is-browser-mode #bottom-tab-bar .tab-item::before {
                        inset: 4px 5px !important;
                        border-radius: 18px !important;
                    }

                    html.is-browser-mode #bottom-tab-bar .tab-item svg {
                        width: 22px !important;
                        height: 22px !important;
                    }

                    html.is-browser-mode #bottom-tab-bar .tab-item span {
                        font-size: 10.8px !important;
                        font-weight: 740 !important;
                    }

                    html.is-browser-mode #bottom-tab-bar .tab-item.active::before {
                        background:
                            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.42), transparent 55%),
                            linear-gradient(135deg, rgba(255,159,67,0.15), rgba(255,128,8,0.07)) !important;
                        box-shadow:
                            inset 0 0 0 1px rgba(255,159,67,0.13),
                            0 6px 15px rgba(255,159,67,0.10) !important;
                    }

                    /* App/PWA später: darf etwas kräftiger bleiben */
                    html.is-standalone-app #bottom-tab-bar {
                        bottom: max(12px, env(safe-area-inset-bottom)) !important;
                        height: 72px !important;
                        border-radius: 28px !important;
                    }

                    /* Mehr Luft, damit Inhalte im Browser nicht unter dem Dock kleben */
                    html.is-browser-mode body {
                        padding-bottom: calc(132px + env(safe-area-inset-bottom)) !important;
                    }

                    html.is-browser-mode .container,
                    html.is-browser-mode main,
                    html.is-browser-mode .main-container {
                        padding-bottom: calc(118px + env(safe-area-inset-bottom)) !important;
                    }

                    html.is-browser-mode .more-menu-content {
                        bottom: calc(82px + env(safe-area-inset-bottom)) !important;
                    }
                }
            `;
            document.head.appendChild(dockStyleV38);
        }


        // Final Mobile UI Fix v51: dock lower + real transition cover + Doppel-AA overflow safety
        if (!window.__finalMobileUiFixV51) {
            window.__finalMobileUiFixV51 = true;
            const ensureTransitionCoverV51 = () => {
                try {
                    if (!document.body) return;
                    if (!document.getElementById("app-page-transition-cover")) {
                        const cover = document.createElement("div");
                        cover.id = "app-page-transition-cover";
                        cover.setAttribute("aria-hidden", "true");
                        document.body.prepend(cover);
                    }
                } catch (_) {}
            };
            ensureTransitionCoverV51();
            document.addEventListener("DOMContentLoaded", ensureTransitionCoverV51, { once: true });
            window.addEventListener("pageshow", ensureTransitionCoverV51, { passive: true });
            const showCoverV51 = () => { /* V76R: no colored curtain; avoid wrong-color flash */ };
            window.showPageTransitionCover = showCoverV51;
            document.addEventListener("click", (event) => {
                const target = event.target?.closest?.("a[href]");
                if (!target) return;
                if (target.target && target.target !== "_self") return;
                if (target.hasAttribute("download")) return;
                const href = target.getAttribute("href") || "";
                if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
                try {
                    const url = new URL(href, window.location.href);
                    if (url.origin !== window.location.origin) return;
                    showCoverV51();
                } catch (_) {}
            }, true);
            window.addEventListener("pagehide", showCoverV51, { passive: true });
            window.addEventListener("beforeunload", showCoverV51);
            const finalStyleV51 = document.createElement("style");
            finalStyleV51.id = "final-mobile-ui-fix-v51";
            finalStyleV51.textContent = `
                html, body { background-color: #f6f8fc !important; }
                html[data-theme="light"], html[data-theme="light"] body { background-color: #f6f8fc !important; }
                html[data-theme="dark"], html[data-theme="dark"] body { background-color: #0f172a !important; }
                #app-page-transition-cover { position: fixed !important; inset: 0 !important; z-index: 2147483000 !important; pointer-events: none !important; opacity: 0 !important; background: #f6f8fc !important; transition: opacity 0ms linear !important; transform: translateZ(0) !important; will-change: opacity !important; }
                html[data-theme="light"] #app-page-transition-cover { background: #f6f8fc !important; }
                html.is-page-leaving #app-page-transition-cover { opacity: 1 !important; }
                /* V76P_NATIVE_LIGHT_DEFAULT_COVER: ohne data-theme nie dunkel vorblitzen */
                html:not([data-theme="dark"]) #app-page-transition-cover,
                html:not([data-theme="dark"]) #native-page-curtain-v74 { background: #f6f8fc !important; }

                @media (max-width: 768px) {
                    html.is-native-shell #bottom-tab-bar, html.is-standalone-app #bottom-tab-bar, body.is-app-shell #bottom-tab-bar { bottom: 0px !important; width: calc(100% - 16px) !important; max-width: 520px !important; height: 72px !important; border-radius: 28px !important; transform: translate3d(-50%, 0, 0) !important; }
                    html.is-browser-mode #bottom-tab-bar { bottom: 0px !important; width: calc(100% - 16px) !important; max-width: 520px !important; height: 64px !important; border-radius: 24px !important; transform: translate3d(-50%, 0, 0) !important; }
                    html.is-native-shell body, html.is-standalone-app body, body.is-app-shell { padding-bottom: calc(88px + env(safe-area-inset-bottom)) !important; }
                    html.is-native-shell .container, html.is-native-shell main, html.is-native-shell .main-container, html.is-standalone-app .container, html.is-standalone-app main, html.is-standalone-app .main-container, body.is-app-shell .container, body.is-app-shell main, body.is-app-shell .main-container { padding-bottom: calc(90px + env(safe-area-inset-bottom)) !important; }
                    html.is-browser-mode body { padding-bottom: calc(118px + env(safe-area-inset-bottom)) !important; }
                    html.is-browser-mode .container, html.is-browser-mode main, html.is-browser-mode .main-container { padding-bottom: calc(108px + env(safe-area-inset-bottom)) !important; }
                    body.page-doppel-aa .modal { padding: max(10px, env(safe-area-inset-top)) 12px calc(82px + env(safe-area-inset-bottom)) 12px !important; overflow-x: hidden !important; }
                    body.page-doppel-aa .modal-content { box-sizing: border-box !important; width: calc(100vw - 24px) !important; max-width: 470px !important; max-height: calc(100dvh - 118px - env(safe-area-inset-bottom)) !important; padding: 20px 18px 22px 18px !important; border-radius: 24px !important; overflow-x: hidden !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; }
                    body.page-doppel-aa #bot-submit-form, body.page-doppel-aa .form-row, body.page-doppel-aa .form-group, body.page-doppel-aa .checkbox-grid, body.page-doppel-aa .checkbox-group, body.page-doppel-aa .checkbox-group-terms { box-sizing: border-box !important; width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
                    body.page-doppel-aa .form-row { flex-direction: column !important; gap: 0 !important; }
                    body.page-doppel-aa .form-group input, body.page-doppel-aa .form-group select, body.page-doppel-aa input, body.page-doppel-aa select { box-sizing: border-box !important; width: 100% !important; max-width: 100% !important; min-width: 0 !important; height: 44px !important; min-height: 44px !important; border-radius: 16px !important; }
                    body.page-doppel-aa .radio-container, body.page-doppel-aa .checkbox-grid { display: grid !important; grid-template-columns: 1fr !important; gap: 12px !important; }
                    body.page-doppel-aa .radio-label, body.page-doppel-aa .checkbox-grid .checkbox-group, body.page-doppel-aa .checkbox-group-terms { display: flex !important; align-items: center !important; justify-content: flex-start !important; gap: 11px !important; text-align: left !important; white-space: normal !important; }
                    body.page-doppel-aa .radio-label input, body.page-doppel-aa .checkbox-grid .checkbox-group input, body.page-doppel-aa .checkbox-group-terms input { flex: 0 0 24px !important; width: 24px !important; height: 24px !important; min-width: 24px !important; min-height: 24px !important; margin: 0 !important; }
                    body.page-doppel-aa .checkbox-grid .checkbox-group label, body.page-doppel-aa .checkbox-group-terms label { flex: 1 1 auto !important; min-width: 0 !important; overflow-wrap: anywhere !important; line-height: 1.25 !important; }
                    body.page-doppel-aa #bot-submit-btn { width: 100% !important; height: 48px !important; min-height: 48px !important; border-radius: 18px !important; font-size: 15px !important; }
                }
            `;
            document.head.appendChild(finalStyleV51);
        }


        
        // Bottom Dock + More Menu Polish v52
        if (!document.getElementById("bottom-nav-more-polish-v52")) {
            const morePolishV52 = document.createElement("style");
            morePolishV52.id = "bottom-nav-more-polish-v52";
            morePolishV52.textContent = `
                @media (max-width: 768px) {
                    #bottom-tab-bar {
                        overflow: visible !important;
                    }

                    #bottom-tab-bar .tab-item.active,
                    #bottom-tab-bar .tab-item.open {
                        color: var(--accent-color) !important;
                    }

                    #btn-more-menu.active::before,
                    #btn-more-menu.open::before {
                        opacity: 1 !important;
                        transform: scale(1) !important;
                        background: linear-gradient(135deg, rgba(255,159,67,.20), rgba(255,128,8,.10)) !important;
                        box-shadow: inset 0 0 0 1px rgba(255,159,67,.17), 0 8px 22px rgba(255,159,67,.14) !important;
                    }

                    #more-menu-overlay {
                        position: fixed !important;
                        left: 50% !important;
                        right: auto !important;
                        width: calc(100% - 16px) !important;
                        max-width: 520px !important;
                        background: transparent !important;
                        border: 0 !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                        z-index: 99988 !important;
                        pointer-events: none !important;
                        opacity: 0 !important;
                        transform: translate3d(-50%, 14px, 0) scale(.985) !important;
                        transition: opacity .18s ease, transform .18s cubic-bezier(.2,.8,.2,1) !important;
                    }

                    #more-menu-overlay.show {
                        opacity: 1 !important;
                        pointer-events: auto !important;
                        transform: translate3d(-50%, 0, 0) scale(1) !important;
                    }

                    html.is-browser-mode #more-menu-overlay {
                        bottom: 63px !important;
                    }

                    html.is-native-shell #more-menu-overlay,
                    html.is-standalone-app #more-menu-overlay,
                    body.is-app-shell #more-menu-overlay {
                        bottom: 71px !important;
                    }

                    #more-menu-list.more-menu-content {
                        position: static !important;
                        box-sizing: border-box !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        display: grid !important;
                        grid-template-columns: 1fr !important;
                        gap: 8px !important;
                        padding: 12px !important;
                        border-radius: 26px 26px 18px 18px !important;
                        border: 1px solid rgba(148,163,184,.24) !important;
                        background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.84)) !important;
                        box-shadow: 0 -12px 34px rgba(15,23,42,.14), inset 0 1px 0 rgba(255,255,255,.70) !important;
                        backdrop-filter: blur(24px) saturate(1.45) !important;
                        -webkit-backdrop-filter: blur(24px) saturate(1.45) !important;
                        max-height: min(58vh, 410px) !important;
                        overflow-y: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }

                    html[data-theme="dark"] #more-menu-list.more-menu-content {
                        background: linear-gradient(180deg, rgba(31,41,55,.96), rgba(15,23,42,.89)) !important;
                        border-color: rgba(148,163,184,.20) !important;
                        box-shadow: 0 -14px 38px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.08) !important;
                    }

                    #more-menu-list a {
                        min-height: 46px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        padding: 0 14px !important;
                        border-radius: 17px !important;
                        text-decoration: none !important;
                        font-weight: 760 !important;
                        color: var(--text-color) !important;
                        background: rgba(255,255,255,.55) !important;
                        border: 1px solid rgba(148,163,184,.22) !important;
                    }

                    html[data-theme="dark"] #more-menu-list a {
                        background: rgba(15,23,42,.40) !important;
                        border-color: rgba(148,163,184,.18) !important;
                    }

                    #more-menu-list a.active {
                        color: #fff !important;
                        background: var(--accent-gradient) !important;
                        border-color: rgba(255,159,67,.44) !important;
                        box-shadow: 0 10px 24px rgba(255,128,8,.22) !important;
                    }

                    #more-menu-list a:active {
                        transform: scale(.985) !important;
                    }
                }
            `;
            document.head.appendChild(morePolishV52);

            const moreMenuScrollKeyV76k = "ipsc.moreMenu.scrollTop.v76k";
            const saveMoreMenuScrollV76k = () => {
                try {
                    const list = document.getElementById("more-menu-list");
                    if (list) localStorage.setItem(moreMenuScrollKeyV76k, String(list.scrollTop || 0));
                } catch (_) {}
            };

            document.addEventListener("scroll", (event) => {
                if (event.target?.id === "more-menu-list") saveMoreMenuScrollV76k();
            }, true);

            document.addEventListener("click", (event) => {
                const link = event.target?.closest?.("#more-menu-overlay a[href]");
                if (!link) return;
                saveMoreMenuScrollV76k();
                const menu = document.getElementById("more-menu-overlay");
                const btn = document.getElementById("btn-more-menu");
                if (menu) menu.classList.remove("show");
                if (btn) btn.classList.remove("open");
                if (!(window.__IPSC_UNIFIED_SPA_ACTIVE || document.body?.classList?.contains("page-app-spa")) && typeof window.showPageTransitionCover === "function") {
                    window.showPageTransitionCover();
                }
            }, true);

            document.addEventListener("click", (event) => {
                const menu = document.getElementById("more-menu-overlay");
                const btn = document.getElementById("btn-more-menu");
                if (!menu || !btn || !menu.classList.contains("show")) return;
                if (event.target?.closest?.("#more-menu-overlay") || event.target?.closest?.("#btn-more-menu")) return;
                menu.classList.remove("show");
                btn.classList.remove("open");
            }, true);
        }

window.toggleMoreMenu = function() {
            const menu = document.getElementById("more-menu-overlay");
            const btn = document.getElementById("btn-more-menu");

            if (!menu || !btn) return;

            const willOpen = !menu.classList.contains("show");
            menu.classList.toggle("show", willOpen);
            btn.classList.toggle("open", willOpen);

            if (willOpen) {
                requestAnimationFrame(() => {
                    try {
                        const list = document.getElementById("more-menu-list");
                        if (!list) return;
                        const inAppSpa = !!(window.__IPSC_UNIFIED_SPA_ACTIVE || document.body?.classList?.contains("page-app-spa") || document.documentElement?.classList?.contains("is-app-spa-v78"));
                        if (inAppSpa) {
                            list.scrollTop = 0;
                            return;
                        }
                        const storedScroll = Number(localStorage.getItem("ipsc.moreMenu.scrollTop.v76k") || "0");
                        const activeLink = list.querySelector("a.active");
                        if (storedScroll > 8) {
                            list.scrollTop = storedScroll;
                        } else if (activeLink) {
                            activeLink.scrollIntoView({ block: "center" });
                        }
                    } catch (_) {}
                });
            } else {
                try {
                    const list = document.getElementById("more-menu-list");
                    if (list) localStorage.setItem("ipsc.moreMenu.scrollTop.v76k", String(list.scrollTop || 0));
                } catch (_) {}
            }
        };

        bindHeaderAuthButtons(isVipPage);

        /*
          Header-Controls bleiben unsichtbar,
          bis auth.js den echten Login-Zustand geprüft hat.
        */
        header.classList.add("auth-ready");

        // translatePortalPage after header injection v16
        if (typeof window.translatePortalPage === "function") {
            window.translatePortalPage();
        }

        return true;
    };

    if (!injectHeader()) {
        document.addEventListener("DOMContentLoaded", injectHeader);
    }

    
    // V76D: robuste Double-Alpha-Menüprüfung.
    // v76c hat nur einmal sehr früh geprüft; wenn Supabase/Auth noch nicht fertig war,
    // blieben Startplatz-Bot und ELO-Vergleich trotz is_doppel_aa=true unsichtbar.
    const renderDoubleAAClubLinksV76d = (enabled) => {
        const path = window.location.pathname || "";
        const page = path.split("/").pop() || "index.html";
        const lang = localStorage.getItem("selectedLanguage") || window.currentLang || "de";

        const desktopNav = document.querySelector("header .main-nav");
        const clubPlaceholder = document.getElementById("club-links-placeholder-v76c");

        if (!enabled) {
            document.querySelectorAll('header .main-nav a[data-club-link-v76d="1"]').forEach(el => el.remove());
            if (clubPlaceholder) clubPlaceholder.innerHTML = "";
            return;
        }

        if (desktopNav) {
            if (!desktopNav.querySelector('a[href="doppel-aa.html"]')) {
                const botLink = document.createElement("a");
                botLink.href = "doppel-aa.html";
                botLink.dataset.clubLinkV76d = "1";
                botLink.innerText = lang === "en" ? "🎯 Slot Bot" : "🎯 Startplatz-Bot";
                botLink.className = page === "doppel-aa.html" ? "active" : "inactive";
                if (page !== "doppel-aa.html") {
                    botLink.style.color = "#ff9f43";
                    botLink.style.border = "1px solid rgba(255, 159, 67, 0.3)";
                }
                desktopNav.appendChild(botLink);
            }

            if (!desktopNav.querySelector('a[href="performance.html"]')) {
                const eloLink = document.createElement("a");
                eloLink.href = "performance.html";
                eloLink.dataset.clubLinkV76d = "1";
                eloLink.innerText = lang === "en" ? "📊 ELO Comparison" : "📊 ELO-Vergleich";
                eloLink.className = page === "performance.html" ? "active" : "inactive";
                if (page !== "performance.html") {
                    eloLink.style.color = "#ff9f43";
                    eloLink.style.border = "1px solid rgba(255, 159, 67, 0.3)";
                }
                desktopNav.appendChild(eloLink);
            }
        }

        if (clubPlaceholder) {
            const state = `${lang}|${page}`;
            if (clubPlaceholder.dataset.clubStateV76h === state && clubPlaceholder.dataset.clubVisibleV76h === "1") return;
            clubPlaceholder.dataset.clubStateV76h = state;
            clubPlaceholder.dataset.clubVisibleV76h = "1";
            clubPlaceholder.innerHTML = `
                <div class="club-links-v76 club-links-v76b club-links-v76c club-links-v76d club-links-v76h">
                    <div class="club-links-label-v76">Double Alpha e.V.</div>
                    <a href="doppel-aa.html" class="${page === "doppel-aa.html" ? "active" : "vip-link"}">${lang === "en" ? "🎯 Slot Bot" : "🎯 Startplatz-Bot"}</a>
                    <a href="performance.html" class="${page === "performance.html" ? "active" : "vip-link"}">${lang === "en" ? "📊 ELO Comparison" : "📊 ELO-Vergleich"}</a>
                </div>
            `;
        }
    };

    const checkVipStatus = () => {
        let tries = 0;
        const maxTries = 30;

        const run = async () => {
            tries += 1;

            try {
                if (!window.supabaseClient || !window.supabaseClient.auth) {
                    if (tries < maxTries) setTimeout(run, 400);
                    return;
                }

                let user = window.currentUser || null;

                if (!user) {
                    const { data: sessionData } = await window.supabaseClient.auth.getSession();
                    user = sessionData?.session?.user || null;
                }

                if (!user) {
                    if (tries < maxTries) setTimeout(run, 400);
                    return;
                }

                const { data: profile, error } = await window.supabaseClient
                    .from("profiles")
                    .select("is_doppel_aa")
                    .eq("id", user.id)
                    .maybeSingle();

                if (error) {
                    console.warn("Double Alpha Profilprüfung fehlgeschlagen:", error);
                    if (tries < maxTries) setTimeout(run, 700);
                    return;
                }

                const allowed = profile?.is_doppel_aa === true;
                renderDoubleAAClubLinksV76d(allowed);

                // Bei bestätigtem Zugriff noch einmal nach kurzer Zeit rendern,
                // falls das Mehr-Menü erst nachträglich aufgebaut wurde.
                if (allowed) setTimeout(() => renderDoubleAAClubLinksV76d(true), 800);
            } catch (err) {
                console.warn("Double Alpha Menüprüfung Fehler:", err);
                if (tries < maxTries) setTimeout(run, 700);
            }
        };

        run();

        try {
            if (window.supabaseClient?.auth?.onAuthStateChange && !window.__doubleAAAuthListenerV76d) {
                window.__doubleAAAuthListenerV76d = true;
                window.supabaseClient.auth.onAuthStateChange(() => {
                    tries = 0;
                    setTimeout(run, 150);
                });
            }
        } catch (_) {}

        // zusätzlicher Sicherheitslauf für langsame iOS/Safari-WebViews
        setTimeout(run, 1500);
        setTimeout(run, 3500);
        setTimeout(run, 6500);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", checkVipStatus);
    } else {
        checkVipStatus();
    }
})();

/* V76O Native light-mode transition guard: App-only anti-flash navigation */
(function () {
    if (window.__IPSC_NATIVE_LIGHT_TRANSITION_V76O) return;
    window.__IPSC_NATIVE_LIGHT_TRANSITION_V76O = true;

    var LIGHT_SURFACE = "#f6f8fc";
    var DARK_SURFACE = "#0f172a";
    var navTimer = null;
    var SOFT_NAV_DELAY_V76Q = 135;

    function activeThemeV76o() {
        var t = document.documentElement.getAttribute("data-theme") || window.__IPSC_ACTIVE_THEME_V76S || window.__IPSC_ACTIVE_THEME_V74 || window.__IPSC_ACTIVE_THEME_V70; if (!t) { try { t = localStorage.getItem("selectedTheme") || localStorage.getItem("theme") || localStorage.getItem("ipsc_effective_theme") || sessionStorage.getItem("ipsc_effective_theme") || "light"; } catch (_) { t = "light"; } }
        if (t === "auto") {
            try { t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (_) { t = "light"; }
        }
        return t === "dark" ? "dark" : "light";
    }

    function isNativeLikeV76o() {
        try {
            return !!window.Capacitor ||
                location.protocol === "capacitor:" ||
                location.protocol === "ionic:" ||
                document.documentElement.classList.contains("is-native-shell") ||
                document.documentElement.classList.contains("is-standalone-app") ||
                document.body?.classList.contains("is-app-shell") ||
                window.navigator?.standalone === true;
        } catch (_) {
            return false;
        }
    }

    function ensureCoverV76o() {
        var body = document.body;
        if (!body) return null;

        var cover = document.getElementById("app-page-transition-cover");
        if (!cover) {
            cover = document.createElement("div");
            cover.id = "app-page-transition-cover";
            cover.setAttribute("aria-hidden", "true");
            body.prepend(cover);
        }

        var curtain = document.getElementById("native-page-curtain-v74");
        if (!curtain) {
            curtain = document.createElement("div");
            curtain.id = "native-page-curtain-v74";
            curtain.setAttribute("aria-hidden", "true");
            body.prepend(curtain);
        }

        return cover;
    }

    function paintSurfaceV76o() {
        var theme = activeThemeV76o();
        var surface = theme === "dark" ? DARK_SURFACE : LIGHT_SURFACE;
        var root = document.documentElement;
        root.setAttribute("data-theme", theme);
        root.style.backgroundColor = surface;
        root.style.colorScheme = theme;
        if (document.body) document.body.style.backgroundColor = surface;
        try {
            var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute("content", surface);
        } catch (_) {}
        ["app-page-transition-cover", "native-page-curtain-v74"].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.style.backgroundColor = surface;
            el.style.background = surface;
            if (theme === "light") el.style.transition = "none";
        });
    }

    window.showPageTransitionCover = function () {
        return; // V76R: curtain disabled to prevent white/dark flash
        ensureCoverV76o();
        paintSurfaceV76o();
        try {
            var theme = activeThemeV76o();
            sessionStorage.setItem("ipsc_effective_theme", theme);
            localStorage.setItem("ipsc_effective_theme", theme);
        } catch (_) {}
        try {
            document.documentElement.classList.add("is-page-leaving", "is-native-navigating-v74", "is-native-navigating-v76o");
            ["app-page-transition-cover", "native-page-curtain-v74"].forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                el.style.transition = "opacity .15s ease";
                el.style.opacity = "1";
            });
        } catch (_) {}
    };

    function clearArrivingV76o() {
        try {
            ["app-page-transition-cover", "native-page-curtain-v74"].forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                el.style.transition = "opacity .18s ease";
                el.style.opacity = "0";
            });
            document.documentElement.classList.remove("is-page-leaving", "is-native-navigating-v74", "is-native-navigating-v76o");
        } catch (_) {}
        paintSurfaceV76o();
    }

    document.addEventListener("DOMContentLoaded", function () {
        ensureCoverV76o();
        paintSurfaceV76o();
        setTimeout(clearArrivingV76o, 90);
    }, { once: true });

    window.addEventListener("pageshow", function () {
        ensureCoverV76o();
        setTimeout(clearArrivingV76o, 90);
    }, { passive: true });

    document.addEventListener("click", function (event) {
        if (event.__ipscNativeNavV76o) return;
        var link = event.target && event.target.closest && event.target.closest(
            "#bottom-tab-bar a[href], #more-menu-overlay a[href], header nav a[href], .main-nav a[href], a.header-logo-link[href], .bottom-nav a[href], .nav-pill[href]"
        );
        if (!link) return;
        return; // V76R: disable delayed curtain navigation; use normal stable page change
        if (!isNativeLikeV76o()) return;
        if (link.target && link.target !== "_self") return;
        if (link.hasAttribute("download")) return;

        var href = link.getAttribute("href") || "";
        if (!href || href.indexOf("#") === 0 || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;

        var url;
        try { url = new URL(href, window.location.href); } catch (_) { return; }
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;

        event.__ipscNativeNavV76o = true;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.showPageTransitionCover();

        if (navTimer) clearTimeout(navTimer);
        navTimer = setTimeout(function () {
            window.location.href = url.href;
        }, SOFT_NAV_DELAY_V76Q);
    }, true);
})();



// V76R_SAFE_NAV_NO_OVERLAY: keep theme background stable, but never show a colored reload curtain.
(function () {
    try {
        window.showPageTransitionCover = function () {
            try {
                var root = document.documentElement;
                var theme = root.getAttribute("data-theme") || window.__IPSC_ACTIVE_THEME_V70 || localStorage.getItem("ipsc_effective_theme") || localStorage.getItem("selectedTheme") || "light";
                theme = theme === "dark" ? "dark" : "light";
                var surface = theme === "dark" ? "#0f172a" : "#f6f8fc";
                try { sessionStorage.setItem("ipsc_effective_theme", theme); localStorage.setItem("ipsc_effective_theme", theme); } catch (_) {}
                root.setAttribute("data-theme", theme);
                root.style.backgroundColor = surface;
                root.style.colorScheme = theme;
                if (document.body) {
                    document.body.style.backgroundColor = surface;
                    document.body.style.opacity = "1";
                }
                root.classList.remove("is-page-leaving", "is-native-navigating-v72", "is-native-navigating-v73", "is-native-navigating-v74", "is-native-navigating-v76o");
            } catch (_) {}
        };

        var cleanup = function () {
            try {
                var root = document.documentElement;
                root.classList.remove("is-page-leaving", "is-native-navigating-v72", "is-native-navigating-v73", "is-native-navigating-v74", "is-native-navigating-v76o", "is-native-arriving-v72", "is-native-arriving-v73", "is-native-arriving-v74", "is-native-arriving-v76o");
                if (document.body) document.body.style.opacity = "1";
            } catch (_) {}
        };
        cleanup();
        window.addEventListener("pageshow", cleanup, { passive: true });
        document.addEventListener("visibilitychange", cleanup, { passive: true });
    } catch (_) {}
})();


// ========================================================================== 
// V76S SAME-SURFACE PAGE BRIDGE
// Uses the currently visible theme color during HTML page changes so Light->Light
// and Dark->Dark do not flash to the opposite background.
// ========================================================================== 
(function sameSurfaceNavigationBridgeV76s() {
    if (window.__IPSC_SAME_SURFACE_NAV_V76S) return;
    window.__IPSC_SAME_SURFACE_NAV_V76S = true;

    var LIGHT_SURFACE = "#f6f8fc";
    var DARK_SURFACE = "#0f172a";
    var NAV_DELAY_MS = 22;

    function currentTheme() {
        var t = document.documentElement.getAttribute("data-theme") || window.__IPSC_ACTIVE_THEME_V76S || window.__IPSC_ACTIVE_THEME_V74 || window.__IPSC_ACTIVE_THEME_V70;
        if (!t || t === "auto") {
            try { t = localStorage.getItem("selectedTheme") || localStorage.getItem("theme") || localStorage.getItem("ipsc_effective_theme") || "light"; } catch (_) { t = "light"; }
        }
        if (t === "auto") {
            try { t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light"; } catch (_) { t = "light"; }
        }
        return t === "dark" ? "dark" : "light";
    }

    function applySurface(theme) {
        var surface = theme === "dark" ? DARK_SURFACE : LIGHT_SURFACE;
        var root = document.documentElement;
        root.setAttribute("data-theme", theme);
        root.style.background = surface;
        root.style.backgroundColor = surface;
        root.style.colorScheme = theme;
        if (document.body) {
            document.body.style.background = surface;
            document.body.style.backgroundColor = surface;
        }
        try {
            localStorage.setItem("ipsc_effective_theme", theme);
            sessionStorage.setItem("ipsc_effective_theme", theme);
            sessionStorage.setItem("ipsc_nav_theme_v76s", theme);
        } catch (_) {}
        try {
            var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute("content", surface);
            var cs = document.querySelector('meta[name="color-scheme"]');
            if (cs) cs.setAttribute("content", theme);
        } catch (_) {}
        window.__IPSC_ACTIVE_THEME_V76S = theme;
        window.__IPSC_ACTIVE_THEME_V74 = theme;
        window.__IPSC_ACTIVE_THEME_V70 = theme;
        return surface;
    }

    function showBridge() {
        var theme = currentTheme();
        var surface = applySurface(theme);
        var bridge = document.getElementById("ipsc-surface-bridge-v76s");
        if (!bridge) {
            bridge = document.createElement("div");
            bridge.id = "ipsc-surface-bridge-v76s";
            bridge.setAttribute("aria-hidden", "true");
            (document.body || document.documentElement).appendChild(bridge);
        }
        bridge.style.position = "fixed";
        bridge.style.inset = "0";
        bridge.style.zIndex = "2147483646";
        bridge.style.pointerEvents = "none";
        bridge.style.background = surface;
        bridge.style.backgroundColor = surface;
        bridge.style.opacity = "1";
        bridge.style.transition = "none";
        bridge.style.transform = "translateZ(0)";
        bridge.style.display = "block";
        return bridge;
    }

    window.showPageTransitionCover = showBridge;

    function shouldBridgeLink(link) {
        // V78B: unified SPA owns routing; never use old bridge/hard reload in app.html.
        try { if (window.__IPSC_UNIFIED_SPA_ACTIVE || document.body?.classList?.contains("page-app-spa")) return false; } catch (_) {}
        // V76T: native shell owns routing; no colored bridge or hard reload while inside shell/embedded frames.
        try { if (new URLSearchParams(window.location.search || "").get("shell") === "1") return false; } catch (_) {}
        if (document.body && document.body.classList && document.body.classList.contains("page-native-shell")) return false;
        if (!link) return false;
        if (link.target && link.target !== "_self") return false;
        if (link.hasAttribute("download")) return false;
        var href = link.getAttribute("href") || "";
        if (!href || href.indexOf("#") === 0 || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return false;
        var url;
        try { url = new URL(href, window.location.href); } catch (_) { return false; }
        if (url.origin !== window.location.origin) return false;
        if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
        return url;
    }

    document.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.__ipscBridgeV76s) return;
        var link = event.target && event.target.closest && event.target.closest(
            "#bottom-tab-bar a[href], #more-menu-overlay a[href], header nav a[href], .main-nav a[href], a.header-logo-link[href], .bottom-nav a[href], .nav-pill[href]"
        );
        var url = shouldBridgeLink(link);
        if (!url) return;

        // Desktop/browser still works normally; the bridge is only visible for one frame.
        event.__ipscBridgeV76s = true;
        event.preventDefault();
        event.stopImmediatePropagation();
        showBridge();
        setTimeout(function () { window.location.href = url.href; }, NAV_DELAY_MS);
    }, true);

    window.addEventListener("pageshow", function () {
        try {
            var theme = currentTheme();
            applySurface(theme);
            var bridge = document.getElementById("ipsc-surface-bridge-v76s");
            if (bridge) bridge.remove();
        } catch (_) {}
    }, { passive: true });
})();
