(function() {
    const injectHeader = () => {
        const header = document.querySelector('header');
        if (!header) return false;

        const path = window.location.pathname;
        let page = path.split("/").pop() || "index.html";
        if (page === "") page = "index.html";

        const savedLanguageSetting = localStorage.getItem("selectedLanguage") || "de";

        const isVipPage = (page === "doppel-aa.html" || page === "performance.html");

        const headerTitle = isVipPage ? "Double Alpha" : "IPSC STARTPLATZ-<span class='logo-accent'>BÖRSE</span>";
        const headerSub = isVipPage ? "Vereins-Bereich 🔒" : "Von Schützen für Schützen";

        const links = [
            { href: "index.html", text: "Startseite", key: "nav-startseite" },
            { href: "marktplatz.html", text: "Marktplatz", key: "card-title-market" },
            { href: "freie-matches.html", text: "Freie Match-Plätze", key: "card-title-free" },
            { href: "mein-planer.html", text: "Mein Planer", key: "card-title-planer" },
            { href: "community.html", text: "Community", key: "card-title-comm" },
            { href: "sg-timer-live.html", text: "⏱️ SG-Timer Live", key: "nav-sgtimer" }, 
            { href: "tools.html", text: "Tools & Training", key: "card-title-tools" },
            { href: "analytics.html", text: "Statistiken", key: "nav-analytics" },
            { href: "wiederladen.html", text: "Wiederladen", key: "nav-wiederladen" },
            { href: "ipsc-hub.html", text: "IPSC Hub", key: "card-title-hub" }
        ];

        let navHtml = "";
        links.forEach(link => {
            const isActive = (page === link.href);
            const className = isActive ? "active" : "inactive";
            navHtml += `<a href="${link.href}" class="${className}" data-txt="${link.key}">${link.text}</a>`;
        });

        // ✨ FIX: Kompaktes Layout, keine Navigation mehr im Header-Block!
        header.innerHTML = `
            <div class="header-container" style="display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 1000px; margin: 0 auto; flex-wrap: wrap; gap: 10px;">
                <a href="index.html" class="header-logo-link" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 10px; cursor: pointer; transition: opacity 0.2s;">
                    <img src="/image_11.png" alt="IPSC Logo" class="header-img-logo" style="height: 38px; width: auto; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15)); border-radius: 4px;" />
                    <div class="logo-text-group">
                        <h1 ${isVipPage ? '' : 'data-txt="main-title"'} class="header-h1-title ${isVipPage ? 'vip-title' : ''}" style="margin: 0; line-height: 1.1;">${headerTitle}</h1>
                        <p class="header-sub-title" style="margin: 2px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;" ${isVipPage ? '' : 'data-txt="sub-title"'}>${headerSub}</p>
                    </div>
                </a>
                
                <div class="header-controls" style="display: flex; align-items: center; gap: 8px;">
                    <button id="theme-toggle" class="theme-toggle-btn" onclick="toggleTheme()" title="Design umschalten">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    </button>

                    ${isVipPage ? '' : `
                    <button id="header-chat-btn" class="theme-toggle-btn" onclick="toggleGlobalInbox()" style="position: relative;" title="Nachrichten">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span id="chat-badge-count" style="display: none; position: absolute; top: -4px; right: -4px; background: var(--danger-color); color: white; font-size: 10px; padding: 2px 5px; border-radius: 50%; font-weight: bold;">0</span>
                    </button>

                    <select id="language-select" class="lang-select lang-switch">
                        <option value="de" ${savedLanguageSetting === 'de' ? 'selected' : ''}>DE</option>
                        <option value="en" ${savedLanguageSetting === 'en' ? 'selected' : ''}>EN</option>
                    </select>
                    `}
                    
                    <div id="auth-status-container">
                        <button class="btn-auth" id="btn-open-login" ${isVipPage ? 'onclick="window.location.href=\'index.html\'"' : 'data-txt="btn-login-reg"'}>Login / Registrieren</button>
                    </div>
                </div>
            </div>
        `;

        // ✨ FIX: Navigation wird DIREKT UNTER den Header gesetzt, nicht HINEIN! 
        // Das löst das Button-Klick-Problem auf dem iPhone sofort.
        let nav = document.querySelector('.main-nav');
        if (!nav) {
            nav = document.createElement('nav');
            nav.className = 'main-nav';
            header.after(nav); 
        }
        nav.innerHTML = navHtml;

        if (isVipPage) {
            const vipStyle = document.createElement('style');
            vipStyle.innerHTML = `
                header { background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%) !important; border-bottom: 2px solid var(--accent-color) !important; border-radius: 0 0 15px 15px; padding-bottom: 20px !important; margin-bottom: 20px; box-shadow: 0 10px 20px rgba(255, 159, 67, 0.15) !important; }
                header .vip-title { background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 26px !important; letter-spacing: 1.5px; text-shadow: 0px 2px 4px rgba(0,0,0,0.4); }
                header .theme-toggle-btn, header .btn-auth, .main-nav a.inactive { background: rgba(255, 255, 255, 0.1) !important; color: #ffffff !important; border-color: rgba(255, 255, 255, 0.2) !important; }
            `;
            document.head.appendChild(vipStyle);
        }

        const style = document.createElement('style');
        style.innerHTML = `
            header { position: sticky !important; top: 0 !important; z-index: 100 !important; background-color: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); padding: 15px 20px !important; border-bottom: 1px solid rgba(0,0,0,0.05) !important; box-shadow: var(--shadow-sm); }
            html[data-theme="dark"] header { background-color: rgba(30, 41, 59, 0.95); border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
            
            header .header-h1-title { font-size: 20px !important; font-weight: 900 !important; letter-spacing: -0.5px !important; color: var(--text-color); }
            header .header-sub-title { color: var(--accent-color) !important; font-weight: 700 !important; }
            
            header .theme-toggle-btn { width: 36px !important; height: 36px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; padding: 0 !important; background: var(--card-bg) !important; color: var(--text-color) !important; border: 1px solid var(--border-color) !important; border-radius: 8px !important; cursor: pointer !important; box-shadow: var(--shadow-sm) !important; }
            header .theme-toggle-btn:hover { border-color: var(--text-muted) !important; background-color: var(--bg-color) !important; }
            header .lang-select { width: auto !important; height: 36px !important; padding: 0 10px !important; flex-shrink: 0 !important; background: var(--card-bg) !important; color: var(--text-color) !important; border: 1px solid var(--border-color) !important; border-radius: 8px !important; font-weight: 600 !important; font-size: 13px !important; box-shadow: var(--shadow-sm) !important; cursor: pointer !important; }
            header .btn-auth { height: 36px !important; padding: 0 16px !important; font-weight: 600 !important; font-size: 13px !important; border-radius: 8px !important; cursor: pointer !important; box-shadow: var(--shadow-sm) !important; transition: all 0.2s !important; background-color: var(--card-bg) !important; color: var(--text-color) !important; border: 1px solid var(--border-color) !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
            header .btn-auth:hover { background-color: var(--bg-color) !important; border-color: var(--text-muted) !important; }
            header #btn-logout { border: 1px solid var(--danger-color) !important; color: var(--danger-color) !important; background: transparent !important; }
            header #btn-logout:hover { background-color: var(--danger-color) !important; color: #ffffff !important; }
            header #btn-open-settings img { width: 36px !important; height: 36px !important; border-radius: 50% !important; object-fit: cover !important; border: 2px solid var(--accent-color) !important; box-shadow: var(--shadow-sm) !important; display: block !important; }
            
            /* --- DESKTOP NAV --- */
            .main-nav { width: 100%; display: flex; justify-content: center; gap: 8px; border-bottom: 1px solid var(--border-color); padding: 15px 20px; flex-wrap: wrap; background: var(--bg-color); }
            .main-nav a { text-decoration: none; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.3px; padding: 10px 18px; border-radius: 20px; transition: all 0.2s ease; white-space: nowrap; flex-shrink: 0; display: inline-block; line-height: 1.4; border: 1px solid transparent; }
            .main-nav a.active { color: #ffffff; background-color: var(--accent-color); box-shadow: var(--shadow-sm); }
            .main-nav a.inactive { color: var(--text-muted); background-color: rgba(0, 0, 0, 0.04); }
            html[data-theme="dark"] .main-nav a.inactive { background-color: rgba(255, 255, 255, 0.04); color: var(--text-muted); }
            .main-nav a.inactive:hover { color: var(--text-color); background-color: rgba(0, 0, 0, 0.08); }

            /* --- MOBILE / TABLET NAV & HEADER FIX --- */
            @media (max-width: 1024px) {
                /* Header schlanker und zentriert */
                header { padding: calc(env(safe-area-inset-top) + 12px) 12px 12px 12px !important; }
                .header-container { justify-content: center !important; }
                
                /* Logo & Text drastisch verkleinert für perfekte Optik */
                .header-img-logo { height: 32px !important; }
                header .header-h1-title { font-size: 17px !important; }
                header .header-sub-title { font-size: 9px !important; }
                
                /* Controls kompakter nebeneinander */
                header .header-controls { justify-content: center; width: 100%; gap: 8px !important; margin-top: 4px; }
                header .theme-toggle-btn { width: 34px !important; height: 34px !important; }
                header .lang-select { height: 34px !important; font-size: 12px !important; padding: 0 8px !important; }
                header .btn-auth { height: 34px !important; font-size: 12px !important; padding: 0 12px !important; }
                header #btn-open-settings img { width: 34px !important; height: 34px !important; }

                /* NATIVE BOTTOM BAR (Fixed am Bildschirmrand) */
                .main-nav {
                    position: fixed !important;
                    top: auto !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    margin: 0 !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(15px) !important;
                    border-top: 1px solid rgba(0,0,0,0.1) !important;
                    border-bottom: none !important;
                    padding: 12px 10px calc(env(safe-area-inset-bottom) + 12px) 10px !important;
                    justify-content: flex-start !important;
                    gap: 10px !important;
                    -webkit-overflow-scrolling: touch !important;
                    scrollbar-width: none !important;
                    scroll-snap-type: x mandatory !important;
                    flex-wrap: nowrap !important;
                    overflow-x: auto !important;
                    white-space: nowrap !important;
                    z-index: 999999 !important;
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.08) !important;
                }
                html[data-theme="dark"] .main-nav { background: rgba(15, 23, 42, 0.95) !important; border-top: 1px solid rgba(255,255,255,0.05) !important; }
                .main-nav::-webkit-scrollbar { display: none !important; }
                .main-nav a { padding: 12px 20px !important; font-size: 14px !important; border-radius: 24px !important; scroll-snap-align: start !important; }
                
                /* Platz machen, damit kein Text hinter der Leiste verschwindet */
                body { padding-bottom: calc(env(safe-area-inset-bottom) + 80px) !important; }
            }
        `;
        document.head.appendChild(style);

        const activeLink = document.querySelector('.main-nav a.active');
        if (activeLink) {
            setTimeout(() => {
                activeLink.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
            }, 150);
        }

        return true;
    };

    if (!injectHeader()) {
        document.addEventListener('DOMContentLoaded', injectHeader);
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
                const navContainer = document.querySelector('.main-nav'); 
                
                if (navContainer) {
                    const path = window.location.pathname;
                    const page = path.split("/").pop() || "index.html";
                    
                    const isSniperActive = (page === "doppel-aa.html");
                    if (!navContainer.querySelector('a[href="doppel-aa.html"]')) {
                        const sniperLink = document.createElement('a');
                        sniperLink.href = 'doppel-aa.html'; 
                        sniperLink.innerText = '🎯 Double Alpha';
                        sniperLink.className = isSniperActive ? "active" : "inactive";
                        if (!isSniperActive) {
                            sniperLink.style.color = '#ff9f43'; 
                            sniperLink.style.border = '1px solid rgba(255, 159, 67, 0.3)';
                        }
                        navContainer.appendChild(sniperLink);
                    }

                    const isPerformanceActive = (page === "performance.html");
                    if (!navContainer.querySelector('a[href="performance.html"]')) {
                        const performanceLink = document.createElement('a');
                        performanceLink.href = 'performance.html'; 
                        performanceLink.innerText = '📊 Performance-Check';
                        performanceLink.className = isPerformanceActive ? "active" : "inactive";
                        if (!isPerformanceActive) {
                            performanceLink.style.color = '#ff9f43'; 
                            performanceLink.style.border = '1px solid rgba(255, 159, 67, 0.3)';
                        }
                        navContainer.appendChild(performanceLink);
                    }

                    const newActiveLink = navContainer.querySelector('a.active');
                    if (newActiveLink) {
                        setTimeout(() => {
                            newActiveLink.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
                        }, 50);
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
