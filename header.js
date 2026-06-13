(function() {
    const injectHeader = () => {
        const header = document.querySelector('header');
        if (!header) return false;

        const path = window.location.pathname;
        let page = path.split("/").pop() || "index.html";
        if (page === "") page = "index.html";

        const savedLanguageSetting = localStorage.getItem("selectedLanguage") || "de";

        // 🌟 Prüfen, ob wir auf einer der beiden VIP-Seiten sind
        const isVipPage = (page === "doppel-aa.html" || page === "performance.html");

        // 🌟 Dynamische Texte für den Header mit dem neuen BÖRSE-Highlight
        const headerTitle = isVipPage ? "Double Alpha" : "IPSC STARTPLATZ-<span class='logo-accent'>BÖRSE</span>";
        const headerSub = isVipPage ? "Vereins-Bereich 🔒" : "Von Schützen für Schützen";

        const links = [
            { href: "index.html", text: "Startseite", key: "nav-startseite" },
            { href: "marktplatz.html", text: "Marktplatz", key: "card-title-market" },
            { href: "freie-matches.html", text: "Freie Match-Plätze", key: "card-title-free" },
            { href: "mein-planer.html", text: "Mein Planer", key: "card-title-planer" },
            { href: "community.html", text: "Community", key: "card-title-comm" },
            { href: "ipsc-hub.html", text: "IPSC Hub", key: "card-title-hub" },
            { href: "tools.html", text: "Tools & Training", key: "card-title-tools" },
            { href: "analytics.html", text: "Statistiken", key: "nav-analytics" },
            { href: "wiederladen.html", text: "Wiederladen", key: "nav-wiederladen" }
        ];

        let navHtml = "";
        links.forEach(link => {
            const isActive = (page === link.href);
            const className = isActive ? "active" : "inactive";
            navHtml += `<a href="${link.href}" class="${className}" data-txt="${link.key}">${link.text}</a>`;
        });

        // 🌟 Aufbau des HTML mit deinem echten Double-Alpha PNG-Logo aus image_11.png
        header.innerHTML = `
            <a href="index.html" class="header-logo-link" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 14px; cursor: pointer; transition: opacity 0.2s; text-align: left;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'" title="Zur Startseite">
                
                <!-- 🆕 Dein echtes IPSC Classic Target aus image_11.png integriert -->
                <img src="image_11.png" alt="IPSC Logo" style="height: 44px; width: auto; object-fit: contain; flex-shrink: 0; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15)); border-radius: 4px;" />

                <div class="logo-text-group">
                    <h1 ${isVipPage ? '' : 'data-txt="main-title"'} class="${isVipPage ? 'vip-title' : ''}" style="margin: 0; line-height: 1.1;">${headerTitle}</h1>
                    <p style="color: ${isVipPage ? 'var(--accent-color)' : 'var(--text-muted)'}; margin: 3px 0 0 0; font-size: 12px;" ${isVipPage ? '' : 'data-txt="sub-title"'}>${headerSub}</p>
                </div>
            </a>
            
            <div class="header-controls">
                <!-- Taktisches Sun/Moon SVG Icon -->
                <button id="theme-toggle" class="theme-toggle-btn" onclick="toggleTheme()" title="Design umschalten">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                </button>

                ${isVipPage ? '' : `
                <!-- Taktisches Chat/Sprechblasen SVG Icon -->
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

            <nav class="main-nav">
                ${navHtml}
            </nav>
        `;

        // 🌟 Exklusives VIP-Styling nur für diese zwei Seiten injizieren
        if (isVipPage) {
            const vipStyle = document.createElement('style');
            vipStyle.innerHTML = `
                /* Dunkler VIP-Header mit edlem Verlauf */
                header {
                    background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%) !important;
                    border-bottom: 2px solid var(--accent-color) !important;
                    border-radius: 0 0 15px 15px;
                    padding-bottom: 20px !important;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 20px rgba(255, 159, 67, 0.15) !important;
                }
                
                /* Gold-Metallic-Effekt für die Überschrift */
                header .vip-title {
                    background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 26px !important;
                    letter-spacing: 1.5px;
                    text-shadow: 0px 2px 4px rgba(0,0,0,0.4);
                }

                /* Helle Controls im dunklen Header erzwingen */
                header .theme-toggle-btn, header .btn-auth, header .main-nav a.inactive {
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: #ffffff !important;
                    border-color: rgba(255, 255, 255, 0.2) !important;
                }
                
                /* VIP-Akzente für die Content-Boxen auf der restlichen Seite */
                .info-box {
                    background-color: rgba(255, 159, 67, 0.08) !important;
                    border: 1px solid rgba(255, 159, 67, 0.4) !important;
                    border-left: 4px solid var(--accent-color) !important;
                    color: var(--text-color) !important;
                }
                
                .match-card, .elo-stat-card, .filter-bar, .legend-box, .upload-zone {
                    border: 1px solid rgba(255, 159, 67, 0.3) !important;
                }

                /* Überschreibt die blauen Elemente im unteren Bereich! */
                #quick-analyze-section {
                    background: rgba(255, 159, 67, 0.05) !important;
                    border: 1px solid rgba(255, 159, 67, 0.4) !important;
                }
                #quick-analyze-section h4 {
                    color: var(--accent-color) !important;
                }
                #quick-analyze-buttons .archive-btn {
                    color: var(--accent-color) !important;
                    border-color: var(--accent-color) !important;
                    background-color: rgba(255, 159, 67, 0.05) !important;
                }
                
                /* Den dicken "Link abrufen" Button in den VIP-Look ziehen */
                .primary-btn {
                    background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%) !important;
                    border: 1px solid var(--accent-color) !important;
                    color: #ff9f43 !important;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2) !important;
                }
                .primary-btn:hover {
                    filter: brightness(1.2) !important;
                }
            `;
            document.head.appendChild(vipStyle);
        }

        const style = document.createElement('style');
        style.innerHTML = `
            header { position: relative; display: flex; flex-direction: column; align-items: center; }
            
            header .header-controls {
                position: absolute !important;
                top: 50% !important;
                right: 20px !important;
                transform: translateY(-50%) !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                flex-direction: row !important;
            }

            header .theme-toggle-btn { 
                width: 38px !important; 
                height: 38px !important; 
                display: flex !important; 
                align-items: center !important; 
                justify-content: center !important; 
                flex-shrink: 0 !important; 
                padding: 0 !important;
                background: var(--card-bg) !important;
                color: var(--text-color) !important;
                border: 1px solid var(--border-color) !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                box-shadow: var(--shadow-sm) !important;
                font-size: 16px !important;
            }
            header .theme-toggle-btn:hover {
                border-color: var(--text-muted) !important;
                background-color: var(--bg-color) !important;
            }

            header .lang-select { 
                width: auto !important; 
                height: 38px !important;
                padding: 0 10px !important; 
                box-sizing: border-box !important; 
                flex-shrink: 0 !important; 
                background: var(--card-bg) !important;
                color: var(--text-color) !important;
                border: 1px solid var(--border-color) !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                font-size: 13px !important;
                box-shadow: var(--shadow-sm) !important;
                cursor: pointer !important;
            }

            header #auth-status-container { 
                width: auto !important; 
                display: flex !important; 
                align-items: center !important;
                gap: 8px !important;
            }

            header .btn-auth { 
                width: auto !important; 
                height: 38px !important;
                padding: 0 16px !important;
                font-weight: 600 !important;
                font-size: 13px !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                box-shadow: var(--shadow-sm) !important;
                transition: all 0.2s !important;
                background-color: var(--card-bg) !important;
                color: var(--text-color) !important;
                border: 1px solid var(--border-color) !important;
                box-sizing: border-box !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            header .btn-auth:hover { 
                background-color: var(--bg-color) !important; 
                border-color: var(--text-muted) !important; 
            }

            header #btn-logout {
                border: 1px solid var(--danger-color) !important;
                color: var(--danger-color) !important;
                background: transparent !important;
            }
            header #btn-logout:hover {
                background-color: var(--danger-color) !important;
                color: #ffffff !important;
            }

            header #btn-open-settings img {
                width: 38px !important;
                height: 38px !important;
                border-radius: 50% !important;
                object-fit: cover !important;
                border: 2px solid var(--accent-color) !important;
                box-shadow: var(--shadow-sm) !important;
                display: block !important;
            }

            header .main-nav { 
                width: 100% !important;
                margin-top: 20px !important; 
                display: flex !important; 
                justify-content: center !important; 
                gap: 8px !important; 
                border-top: 1px solid var(--border-color) !important; 
                padding-top: 15px !important; 
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
                flex-shrink: 0 !important; 
                display: inline-block !important; 
                line-height: 1.4 !important; 
                box-sizing: border-box !important;
                border: 1px solid transparent !important;
            }
            header .main-nav a.active { 
                color: #ffffff !important; 
                background-color: var(--accent-color) !important; 
                box-shadow: var(--shadow-sm) !important; 
                border-color: var(--accent-color) !important;
            }
            header .main-nav a.inactive { 
                color: var(--text-muted) !important; 
                background-color: rgba(0, 0, 0, 0.03) !important; 
            }
            html[data-theme="dark"] header .main-nav a.inactive { 
                background-color: rgba(255, 255, 255, 0.04) !important; 
                color: var(--text-muted) !important; 
            }
            header .main-nav a.inactive:hover { 
                color: var(--text-color) !important; 
                background-color: rgba(0, 0, 0, 0.06) !important; 
            }

            .modal-content { 
                max-height: 85vh !important; 
                overflow-y: auto !important; 
                display: block !important;
                -webkit-overflow-scrolling: touch !important;
            }

            @media (max-width: 768px) {
                header { padding: 16px 12px 8px 12px !important; display: flex; flex-direction: column; align-items: center; }
                header .header-logo-link { justify-content: center !important; width: 100% !important; margin: 0 auto !important; }
                
                header .header-controls { 
                    position: static !important; 
                    display: flex !important; 
                    flex-direction: row !important; 
                    justify-content: center !important; 
                    align-items: center !important; 
                    gap: 8px !important; 
                    margin-top: 14px !important; 
                    width: 100% !important; 
                    transform: none !important; 
                    flex-wrap: wrap !important;
                }
                
                header .main-nav { 
                    margin-top: 15px !important; 
                    padding: 10px 4px 4px 4px !important; 
                    justify-content: flex-start !important; 
                    gap: 8px !important; 
                    -webkit-overflow-scrolling: touch !important; 
                    scrollbar-width: none !important;
                    scroll-snap-type: x mandatory !important; 
                    flex-wrap: nowrap !important;
                    overflow-x: auto !important; 
                    white-space: nowrap !important; 
                }
                header .main-nav::-webkit-scrollbar { display: none !important; }
                header .main-nav a { padding: 8px 14px !important; font-size: 11px !important; border-radius: 20px !important; scroll-snap-align: start !important; }
                
                .modal-content { padding: 24px 16px !important; }
            }
        `;
        document.head.appendChild(style);

        const activeLink = header.querySelector('.main-nav a.active');
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

    // ==========================================
    // 🎯 VIP-ZUGANG: DOUBLE ALPHA SNIPER & PERFORMANCE CHECK LINKS
    // ==========================================
    document.addEventListener("DOMContentLoaded", () => {
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
                const navContainer = document.querySelector('header .main-nav'); 
                
                if (navContainer) {
                    const path = window.location.pathname;
                    const page = path.split("/").pop() || "index.html";
                    
                    // 1. Link für den Bot-Sniper (doppel-aa.html)
                    const isSniperActive = (page === "doppel-aa.html");
                    const sniperLink = document.createElement('a');
                    sniperLink.href = 'doppel-aa.html'; 
                    sniperLink.innerText = '🎯 Double Alpha';
                    sniperLink.className = isSniperActive ? "active" : "inactive";
                    
                    if (!isSniperActive) {
                        sniperLink.style.color = '#ff9f43'; 
                        sniperLink.style.border = '1px solid rgba(255, 159, 67, 0.3)';
                    }
                    navContainer.appendChild(sniperLink);

                    // 2. Link für die Starterlisten-Analyse (performance.html)
                    const isPerformanceActive = (page === "performance.html");
                    const performanceLink = document.createElement('a');
                    performanceLink.href = 'performance.html'; 
                    performanceLink.innerText = '📊 Performance-Check';
                    performanceLink.className = isPerformanceActive ? "active" : "inactive";
                    
                    if (!isPerformanceActive) {
                        performanceLink.style.color = '#ff9f43'; 
                        performanceLink.style.border = '1px solid rgba(255, 159, 67, 0.3)';
                    }
                    navContainer.appendChild(performanceLink);

                    const newActiveLink = navContainer.querySelector('a.active');
                    if (newActiveLink) {
                        setTimeout(() => {
                            newActiveLink.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
                        }, 50);
                    }
                }
            }
        }, 600);
    });

})();
