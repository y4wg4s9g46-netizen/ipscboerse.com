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

        // ==========================================
        // 1. LINKS DEFINIEREN (Für Desktop-Menü)
        // ==========================================
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
            const isActive = (page === link.href);
            const className = isActive ? "active" : "inactive";
            navHtml += `<a href="${link.href}" class="${className}" data-txt="${link.key}">${link.text}</a>`;
        });

        // ==========================================
        // 2. HEADER AUFBAUEN (inklusive Desktop-Nav)
        // ==========================================
        header.innerHTML = `
            <a href="index.html" class="header-logo-link" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 14px; cursor: pointer; transition: opacity 0.2s; text-align: left;" title="Zur Startseite">
                <img src="icon-192.png" width="38" height="44" alt="IPSC Logo" style="height: 44px; width: auto; object-fit: contain; flex-shrink: 0; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15)); border-radius: 4px;" />
                <div class="logo-text-group">
                    <h1 ${isVipPage ? '' : 'data-txt="main-title"'} class="${isVipPage ? 'vip-title' : ''}" style="margin: 0; line-height: 1.1;">${headerTitle}</h1>
                    <p style="color: ${isVipPage ? 'var(--accent-color)' : 'var(--text-muted)'}; margin: 3px 0 0 0; font-size: 12px;" ${isVipPage ? '' : 'data-txt="sub-title"'}>${headerSub}</p>
                </div>
            </a>
            
            <div class="header-controls">
                <button id="theme-toggle" class="theme-toggle-btn" onclick="toggleTheme()" title="Design umschalten">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>

                ${isVipPage ? '' : `
                <button id="header-chat-btn" class="theme-toggle-btn" onclick="toggleGlobalInbox()" style="position: relative;" title="Nachrichten">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span id="chat-badge-count" style="display: none; position: absolute; top: -4px; right: -4px; background: var(--danger-color); color: white; font-size: 10px; padding: 2px 5px; border-radius: 50%; font-weight: bold;">0</span>
                </button>

                <select id="language-select" class="lang-select lang-switch">
                    <option value="de" ${savedLanguageSetting === 'de' ? 'selected' : ''}>DE</option>
                    <option value="en" ${savedLanguageSetting === 'en' ? 'selected' : ''}>EN</option>
                </select>
                `}
                
                <div id="auth-status-container">
                    <button class="btn-auth" id="btn-open-login" ${isVipPage ? 'onclick="window.location.href=\'index.html\'"' : 'data-txt="btn-login-reg"'}>Login</button>
                </div>
            </div>

            <nav class="main-nav desktop-only">
                ${navHtml}
            </nav>
        `;

        // ==========================================
        // 3. MOBILE BOTTOM TAB BAR & MEHR-MENÜ
        // ==========================================
        if (!document.getElementById('bottom-tab-bar')) {
            const bottomBar = document.createElement('nav');
            bottomBar.id = 'bottom-tab-bar';
            bottomBar.className = 'mobile-only'; 
            
            bottomBar.innerHTML = `
                <a href="index.html" class="tab-item ${page === 'index.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>Start</span>
                </a>
                <a href="marktplatz.html" class="tab-item ${page === 'marktplatz.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    <span>Markt</span>
                </a>
                <a href="mein-planer.html" class="tab-item ${page === 'mein-planer.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>Planer</span>
                </a>
                <a href="community.html" class="tab-item ${page === 'community.html' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Comm</span>
                </a>
                <div class="tab-item" id="btn-more-menu" onclick="toggleMoreMenu()">
                    <svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    <span>Mehr</span>
                </div>
            `;
            document.body.appendChild(bottomBar);

            const moreMenu = document.createElement('div');
            moreMenu.id = 'more-menu-overlay';
            moreMenu.className = 'mobile-only'; 
            moreMenu.innerHTML = `
                <div class="more-menu-content" id="more-menu-list">
                    <a href="freie-matches.html" class="${page === 'freie-matches.html' ? 'active' : ''}">Freie Match-Plätze</a>
                    <a href="schiessbuch.html" class="${page === 'schiessbuch.html' ? 'active' : ''}">Schießbuch</a>
                    <a href="sg-timer-live.html" class="${page === 'sg-timer-live.html' ? 'active' : ''}">⏱️ SG-Timer Live</a>
                    <a href="tools.html" class="${page === 'tools.html' ? 'active' : ''}">Tools & Training</a>
                    <a href="analytics.html" class="${page === 'analytics.html' ? 'active' : ''}">Statistiken</a>
                    <a href="wiederladen.html" class="${page === 'wiederladen.html' ? 'active' : ''}">Wiederladen</a>
                    <a href="ipsc-hub.html" class="${page === 'ipsc-hub.html' ? 'active' : ''}">IPSC Hub</a>
                </div>
            `;
            document.body.appendChild(moreMenu);
        }

        // ==========================================
        // 4. CSS STYLING (Responsive!)
        // ==========================================
        if (isVipPage) {
            const vipStyle = document.createElement('style');
            vipStyle.innerHTML = `
                header { background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%) !important; border-bottom: 2px solid var(--accent-color) !important; border-radius: 0 0 15px 15px; padding-bottom: 20px !important; margin-bottom: 20px; box-shadow: 0 10px 20px rgba(255, 159, 67, 0.15) !important; }
                header .vip-title { background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 26px !important; letter-spacing: 1.5px; text-shadow: 0px 2px 4px rgba(0,0,0,0.4); }
                header .theme-toggle-btn, header .btn-auth, header .main-nav a.inactive { background: rgba(255, 255, 255, 0.1) !important; color: #ffffff !important; border-color: rgba(255, 255, 255, 0.2) !important; }
            `;
            document.head.appendChild(vipStyle);
        }

        const style = document.createElement('style');
        style.innerHTML = `
            /* --- ALLGEMEINER HEADER --- */
            header { position: sticky !important; top: 0 !important; z-index: 100 !important; display: flex; flex-direction: column; align-items: center; padding-top: 15px; }
            header .header-controls { position: absolute !important; top: calc(env(safe-area-inset-top) + 24px) !important; right: 20px !important; display: flex !important; align-items: center !important; gap: 10px !important; flex-direction: row !important; }
            header .theme-toggle-btn { width: 38px !important; height: 38px !important; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; box-shadow: var(--shadow-sm); }
            header .lang-select { height: 38px !important; padding: 0 10px !important; background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 8px; font-weight: 600; font-size: 13px; }
            header .btn-auth { height: 38px !important; padding: 0 16px !important; font-weight: 600; font-size: 13px; border-radius: 8px; cursor: pointer; background-color: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); }

            /* --- DESKTOP STANDARD (PC) --- */
            .mobile-only { display: none !important; } 
            
            header .main-nav { width: 100% !important; margin-top: 20px !important; display: flex !important; justify-content: center !important; gap: 8px !important; border-top: 1px solid var(--border-color) !important; padding-top: 15px !important; padding-bottom: 15px !important; flex-wrap: wrap !important; }
            header .main-nav a { text-decoration: none !important; font-weight: 600 !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; padding: 8px 16px !important; border-radius: 20px !important; transition: all 0.2s ease !important; white-space: nowrap !important; }
            header .main-nav a.active { color: #ffffff !important; background-color: var(--accent-color) !important; box-shadow: var(--shadow-sm) !important; }
            header .main-nav a.inactive { color: var(--text-muted) !important; background-color: rgba(0, 0, 0, 0.03) !important; }

            /* --- MOBILE & APP (Handy) --- */
            @media (max-width: 768px) {
                header .main-nav.desktop-only { display: none !important; } 
                .mobile-only { display: flex !important; }  
                
                /* 🔥 HEADER LAYOUT FIX FÜR HANDYS 🔥 */
                header { padding: calc(env(safe-area-inset-top) + 12px) 10px 12px 10px !important; align-items: center !important; }
                header .header-logo-link { justify-content: center !important; width: 100% !important; }
                
                /* Flex-Wrap erlaubt einen sauberen Umbruch in die zweite Zeile */
                header .header-controls { 
                    position: relative !important; 
                    top: auto !important; right: auto !important;
                    display: flex !important; 
                    flex-direction: row !important;
                    flex-wrap: wrap !important; 
                    justify-content: center !important; 
                    align-items: center !important; 
                    gap: 8px !important; 
                    margin-top: 15px !important; 
                    width: 100% !important; 
                }

                /* Container für Profilbild + Abmelden waagerecht fixieren */
                #auth-status-container {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                }

                /* Mobile Größenanpassung der Buttons, damit alles besser passt */
                header .btn-auth { height: 34px !important; padding: 0 12px !important; font-size: 11px !important; }
                header .lang-select { height: 34px !important; font-size: 11px !important; }
                header .theme-toggle-btn { width: 34px !important; height: 34px !important; }
                #auth-status-container img { width: 34px !important; height: 34px !important; }

                body { padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; }

                /* Styling für Bottom Tab Bar */
                #bottom-tab-bar {
                    position: fixed; bottom: 0; left: 0; width: 100%;
                    background: var(--card-bg); border-top: 1px solid var(--border-color);
                    justify-content: space-around; align-items: center;
                    padding-bottom: env(safe-area-inset-bottom);
                    height: 65px; z-index: 99999;
                    box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.08);
                    -webkit-transform: translateZ(0); transform: translateZ(0);
                }
                #bottom-tab-bar .tab-item {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    text-decoration: none; color: var(--text-muted); width: 20%; height: 100%; cursor: pointer;
                }
                #bottom-tab-bar .tab-item svg { width: 22px; height: 22px; margin-bottom: 4px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
                #bottom-tab-bar .tab-item span { font-size: 10px; font-weight: 600; }
                #bottom-tab-bar .tab-item.active { color: var(--accent-color); }
                
                /* Styling für das "Mehr" Overlay */
                #more-menu-overlay {
                    position: fixed; bottom: calc(65px + env(safe-area-inset-bottom)); left: 0; width: 100%;
                    background: var(--bg-color); border-radius: 20px 20px 0 0;
                    box-shadow: 0 -10px 25px rgba(0,0,0,0.1);
                    transform: translateY(120%); transition: transform 0.3s ease-in-out;
                    z-index: 99998; max-height: 70vh; overflow-y: auto; padding: 20px; box-sizing: border-box;
                    display: block !important;
                }
                #more-menu-overlay.show { transform: translateY(0); }
                #more-menu-list { display: flex; flex-direction: column; gap: 10px; }
                #more-menu-list a {
                    padding: 15px; text-decoration: none; color: var(--text-color); font-weight: 600;
                    background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color); text-align: center;
                }
                #more-menu-list a.active { background: var(--accent-color); color: #fff; border-color: var(--accent-color); }
                #more-menu-list a.vip-link { color: #ff9f43; border-color: rgba(255, 159, 67, 0.3); background: rgba(255, 159, 67, 0.05); }
            }
        `;
        document.head.appendChild(style);

        // Globaler Toggle für das Mehr-Menü
        window.toggleMoreMenu = function() {
            const menu = document.getElementById('more-menu-overlay');
            const btn = document.getElementById('btn-more-menu');
            if (menu.classList.contains('show')) {
                menu.classList.remove('show');
                btn.style.color = "var(--text-muted)";
            } else {
                menu.classList.add('show');
                btn.style.color = "var(--accent-color)";
            }
        };

        return true;
    };

    if (!injectHeader()) {
        document.addEventListener('DOMContentLoaded', injectHeader);
    }

    // ==========================================
    // 🎯 VIP-ZUGANG: IN BEIDE MENÜS INJIZIEREN
    // ==========================================
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

                // 1. VIP-Links in die Desktop-Leiste einfügen
                const desktopNav = document.querySelector('header .main-nav'); 
                if (desktopNav) {
                    if (!desktopNav.querySelector('a[href="doppel-aa.html"]')) {
                        const sniperLink = document.createElement('a');
                        sniperLink.href = 'doppel-aa.html'; 
                        sniperLink.innerText = '🎯 Double Alpha';
                        sniperLink.className = (page === "doppel-aa.html") ? "active" : "inactive";
                        if (page !== "doppel-aa.html") { sniperLink.style.color = '#ff9f43'; sniperLink.style.border = '1px solid rgba(255, 159, 67, 0.3)'; }
                        desktopNav.appendChild(sniperLink);
                    }
                    if (!desktopNav.querySelector('a[href="performance.html"]')) {
                        const performanceLink = document.createElement('a');
                        performanceLink.href = 'performance.html'; 
                        performanceLink.innerText = '📊 Performance-Check';
                        performanceLink.className = (page === "performance.html") ? "active" : "inactive";
                        if (page !== "performance.html") { performanceLink.style.color = '#ff9f43'; performanceLink.style.border = '1px solid rgba(255, 159, 67, 0.3)'; }
                        desktopNav.appendChild(performanceLink);
                    }
                }

                // 2. VIP-Links in das Mobile "Mehr" Menü einfügen
                const moreMenuList = document.getElementById('more-menu-list'); 
                if (moreMenuList) {
                    if (!moreMenuList.querySelector('a[href="performance.html"]')) {
                        const performanceLink = document.createElement('a');
                        performanceLink.href = 'performance.html'; 
                        performanceLink.innerText = '📊 Performance-Check';
                        performanceLink.className = (page === "performance.html") ? "active" : "vip-link";
                        moreMenuList.prepend(performanceLink);
                    }
                    if (!moreMenuList.querySelector('a[href="doppel-aa.html"]')) {
                        const sniperLink = document.createElement('a');
                        sniperLink.href = 'doppel-aa.html'; 
                        sniperLink.innerText = '🎯 Double Alpha';
                        sniperLink.className = (page === "doppel-aa.html") ? "active" : "vip-link";
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
