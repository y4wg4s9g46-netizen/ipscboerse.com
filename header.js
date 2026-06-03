(function() {
    const injectHeader = () => {
        const header = document.querySelector('header');
        if (!header) return false;

        const path = window.location.pathname;
        let page = path.split("/").pop() || "index.html";
        if (page === "") page = "index.html";

        const savedLanguageSetting = localStorage.getItem("selectedLanguage") || "de";

        const links = [
            { href: "index.html", text: "Startseite" },
            { href: "marktplatz.html", text: "Marktplatz" },
            { href: "freie-matches.html", text: "Freie Match-Plätze" },
            { href: "mein-planer.html", text: "Mein Planer" },
            { href: "community.html", text: "Community" },
            { href: "ipsc-hub.html", text: "IPSC Hub" },
            { href: "tools.html", text: "Tools & Training" }
        ];

        let navHtml = "";
        links.forEach(link => {
            const isActive = (page === link.href);
            const className = isActive ? "active" : "inactive";
            navHtml += `<a href="${link.href}" class="${className}">${link.text}</a>`;
        });

        header.innerHTML = `
            <h1 data-txt="main-title">IPSC STARTPLATZ-BÖRSE</h1>
            <p style="color: var(--text-muted); margin: 5px 0 0 0; font-size: 13px;" data-txt="sub-title">Von Schützen für Schützen</p>
            
            <div class="header-controls">
                <button id="theme-toggle" class="theme-toggle-btn" onclick="toggleTheme()">🌓</button>

                <button id="header-chat-btn" class="theme-toggle-btn" onclick="toggleGlobalInbox()" style="position: relative; font-size: 18px;" title="Nachrichten">
                    💬
                    <span id="chat-badge-count" style="display: none; position: absolute; top: -4px; right: -4px; background: var(--danger-color); color: white; font-size: 10px; padding: 2px 5px; border-radius: 50%; font-weight: bold;">0</span>
                </button>

                <select id="language-select" class="lang-select lang-switch">
                    <option value="de" ${savedLanguageSetting === 'de' ? 'selected' : ''}>DE</option>
                    <option value="en" ${savedLanguageSetting === 'en' ? 'selected' : ''}>EN</option>
                </select>
                <div id="auth-status-container">
                    <button class="btn-auth" id="btn-open-login" data-txt="btn-login-reg">Login / Registrieren</button>
                </div>
            </div>

            <nav class="main-nav">
                ${navHtml}
            </nav>
        `;

        const style = document.createElement('style');
        style.innerHTML = `
            header { position: relative; }
            .main-nav { margin-top: 20px !important; display: flex !important; justify-content: center !important; gap: 8px !important; border-top: 1px solid var(--border-color) !important; padding-top: 15px !important; }
            .main-nav a { text-decoration: none !important; font-weight: 600 !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; padding: 8px 16px !important; border-radius: 20px !important; transition: all 0.2s ease !important; white-space: nowrap !important; }
            .main-nav a.active { color: #ffffff !important; background-color: var(--accent-color) !important; box-shadow: var(--shadow-sm) !important; }
            .main-nav a.inactive { color: var(--text-muted) !important; background-color: rgba(0, 0, 0, 0.03) !important; border: none !important; }
            html[data-theme="dark"] .main-nav a.inactive { background-color: rgba(255, 255, 255, 0.04) !important; color: var(--text-muted) !important; }
            .main-nav a.inactive:hover { color: var(--text-color) !important; background-color: rgba(0, 0, 0, 0.06) !important; }
            
            header .header-controls button.theme-toggle-btn { 
                width: 38px !important; height: 38px !important; display: flex !important; 
                align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; padding: 0 !important;
            }
            header .header-controls select.lang-select { width: auto !important; padding: 7px 10px !important; box-sizing: border-box !important; flex-shrink: 0 !important; }
            header .header-controls .btn-auth { width: auto !important; }
            header #auth-status-container { width: auto !important; display: flex !important; }

            .modal-content { 
                max-height: 85vh !important; 
                overflow-y: auto !important; 
                display: block !important;
                -webkit-overflow-scrolling: touch !important;
            }

            @media (max-width: 768px) {
                header { padding: 16px 12px 8px 12px !important; }
                header h1 { font-size: 20px !important; margin-bottom: 4px !important; }
                
                header .header-controls { 
                    position: static !important; display: flex !important; flex-direction: row !important; 
                    justify-content: center !important; align-items: center !important; gap: 8px !important; 
                    margin-top: 10px !important; width: 100% !important; transform: none !important; flex-wrap: wrap !important;
                }
                header #auth-status-container { display: flex !important; align-items: center !important; gap: 8px !important; width: auto !important; }
                header .btn-auth { padding: 6px 12px !important; font-size: 12px !important; width: auto !important; }
                
                header .main-nav { 
                    margin-top: 15px !important; padding: 10px 4px 4px 4px !important; justify-content: flex-start !important; 
                    flex-wrap: nowrap !important; overflow-x: auto !important; white-space: nowrap !important; 
                    gap: 8px !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important;
                    scroll-snap-type: x mandatory !important;
                }
                header .main-nav::-webkit-scrollbar { display: none !important; }
                header .main-nav a { padding: 8px 14px !important; font-size: 11px !important; scroll-snap-align: start !important; }
                
                .modal-content { 
                    padding: 24px 16px !important; 
                }
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
})();
