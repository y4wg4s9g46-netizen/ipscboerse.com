(function() {
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

                const modal = document.getElementById("auth-modal");
                if (modal) {
                    modal.style.display = "flex";

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
                    modal.style.display = "flex";

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

        const savedLanguageSetting = localStorage.getItem("selectedLanguage") || "de";
        const cachedHeaderUser = getCachedHeaderUser();
        const cachedAvatarUrl = escapeAttr(
            cachedHeaderUser?.avatar_url ||
            localStorage.getItem(HEADER_AVATAR_CACHE_KEY) ||
            DEFAULT_HEADER_AVATAR
        );

        const hasCachedLogin = !!cachedHeaderUser;
        const isVipPage = page === "doppel-aa.html" || page === "performance.html";

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
                <img src="icon-192.png" width="38" height="44" alt="IPSC Logo" class="header-logo-img">
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
                    <button id="header-chat-btn" class="theme-toggle-btn" onclick="toggleGlobalInbox()" title="Nachrichten">
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

                    <button class="btn-auth" id="btn-logout" style="${hasCachedLogin ? "" : "display:none !important;"}" data-txt="btn-logout">Logout</button>
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
                    <span>Start</span>
                </a>

                <a href="marktplatz.html" class="tab-item ${page === "marktplatz.html" ? "active" : ""}">
                    <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    <span>Markt</span>
                </a>

                <a href="mein-planer.html" class="tab-item ${page === "mein-planer.html" ? "active" : ""}">
                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>Planer</span>
                </a>

                <a href="community.html" class="tab-item ${page === "community.html" ? "active" : ""}">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Comm</span>
                </a>

                <div class="tab-item" id="btn-more-menu" onclick="toggleMoreMenu()">
                    <svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    <span>Mehr</span>
                </div>
            `;

            document.body.appendChild(bottomBar);

            const moreMenu = document.createElement("div");
            moreMenu.id = "more-menu-overlay";
            moreMenu.className = "mobile-only";

            moreMenu.innerHTML = `
                <div class="more-menu-content" id="more-menu-list">
                    <a href="freie-matches.html" class="${page === "freie-matches.html" ? "active" : ""}">Freie Match-Plätze</a>
                    <a href="schiessbuch.html" class="${page === "schiessbuch.html" ? "active" : ""}">Schießbuch</a>
                    <a href="sg-timer-live.html" class="${page === "sg-timer-live.html" ? "active" : ""}">⏱️ SG-Timer Live</a>
                    <a href="tools.html" class="${page === "tools.html" ? "active" : ""}">Tools & Training</a>
                    <a href="analytics.html" class="${page === "analytics.html" ? "active" : ""}">Statistiken</a>
                    <a href="wiederladen.html" class="${page === "wiederladen.html" ? "active" : ""}">Wiederladen</a>
                    <a href="ipsc-hub.html" class="${page === "ipsc-hub.html" ? "active" : ""}">IPSC Hub</a>
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
                    padding-top: 15px !important;
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
                    gap: 14px !important;
                    cursor: pointer !important;
                    transition: opacity 0.2s !important;
                    text-align: left !important;
                }

                header .header-logo-img {
                    height: 44px !important;
                    width: auto !important;
                    object-fit: contain !important;
                    flex-shrink: 0 !important;
                    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15)) !important;
                    border-radius: 4px !important;
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
                    padding-top: 15px !important;
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
                        margin-top: 15px !important;
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

                    body {
                        padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important;
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
                        height: 65px !important;
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
                        bottom: calc(65px + env(safe-area-inset-bottom)) !important;
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

        window.toggleMoreMenu = function() {
            const menu = document.getElementById("more-menu-overlay");
            const btn = document.getElementById("btn-more-menu");

            if (!menu || !btn) return;

            if (menu.classList.contains("show")) {
                menu.classList.remove("show");
                btn.style.color = "var(--text-muted)";
            } else {
                menu.classList.add("show");
                btn.style.color = "var(--accent-color)";
            }
        };

        bindHeaderAuthButtons(isVipPage);

        /*
          Header-Controls bleiben unsichtbar,
          bis auth.js den echten Login-Zustand geprüft hat.
        */
        header.classList.add("auth-ready");

        return true;
    };

    if (!injectHeader()) {
        document.addEventListener("DOMContentLoaded", injectHeader);
    }

    const checkVipStatus = () => {
        setTimeout(async () => {
            if (!window.supabaseClient) return;

            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) return;

            const { data: profile } = await window.supabaseClient
                .from("profiles")
                .select("is_doppel_aa")
                .eq("id", session.user.id)
                .single();

            if (profile && profile.is_doppel_aa === true) {
                const path = window.location.pathname;
                const page = path.split("/").pop() || "index.html";

                const desktopNav = document.querySelector("header .main-nav");

                if (desktopNav) {
                    if (!desktopNav.querySelector('a[href="doppel-aa.html"]')) {
                        const sniperLink = document.createElement("a");
                        sniperLink.href = "doppel-aa.html";
                        sniperLink.innerText = "🎯 Double Alpha";
                        sniperLink.className = page === "doppel-aa.html" ? "active" : "inactive";

                        if (page !== "doppel-aa.html") {
                            sniperLink.style.color = "#ff9f43";
                            sniperLink.style.border = "1px solid rgba(255, 159, 67, 0.3)";
                        }

                        desktopNav.appendChild(sniperLink);
                    }

                    if (!desktopNav.querySelector('a[href="performance.html"]')) {
                        const performanceLink = document.createElement("a");
                        performanceLink.href = "performance.html";
                        performanceLink.innerText = "📊 Performance-Check";
                        performanceLink.className = page === "performance.html" ? "active" : "inactive";

                        if (page !== "performance.html") {
                            performanceLink.style.color = "#ff9f43";
                            performanceLink.style.border = "1px solid rgba(255, 159, 67, 0.3)";
                        }

                        desktopNav.appendChild(performanceLink);
                    }
                }

                const moreMenuList = document.getElementById("more-menu-list");

                if (moreMenuList) {
                    if (!moreMenuList.querySelector('a[href="performance.html"]')) {
                        const performanceLink = document.createElement("a");
                        performanceLink.href = "performance.html";
                        performanceLink.innerText = "📊 Performance-Check";
                        performanceLink.className = page === "performance.html" ? "active" : "vip-link";
                        moreMenuList.prepend(performanceLink);
                    }

                    if (!moreMenuList.querySelector('a[href="doppel-aa.html"]')) {
                        const sniperLink = document.createElement("a");
                        sniperLink.href = "doppel-aa.html";
                        sniperLink.innerText = "🎯 Double Alpha";
                        sniperLink.className = page === "doppel-aa.html" ? "active" : "vip-link";
                        moreMenuList.prepend(sniperLink);
                    }
                }
            }
        }, 600);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", checkVipStatus);
    } else {
        checkVipStatus();
    }
})();