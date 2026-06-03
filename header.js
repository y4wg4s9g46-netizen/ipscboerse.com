(function() {
    const injectHeader = () => {
        const header = document.querySelector('header');
        if (!header) return false;[span_9](start_span)[span_9](end_span)

        const path = window.location.pathname;[span_10](start_span)[span_10](end_span)
        let page = path.split("/").pop() || "index.html";[span_11](start_span)[span_11](end_span)
        if (page === "") page = "index.html";[span_12](start_span)[span_12](end_span)

        const savedLanguageSetting = localStorage.getItem("selectedLanguage") || "de";[span_13](start_span)[span_13](end_span)

        const links = [
            { href: "index.html", text: "Startseite" },
            { href: "marktplatz.html", text: "Marktplatz" },
            { href: "freie-matches.html", text: "Freie Match-Plätze" },
            { href: "mein-planer.html", text: "Mein Planer" },
            { href: "community.html", text: "Community" },
            { href: "ipsc-hub.html", text: "IPSC Hub" },
            { href: "tools.html", text: "Tools & Training" }
        ];[span_14](start_span)[span_14](end_span)

        let navHtml = "";[span_15](start_span)[span_15](end_span)
        links.forEach(link => {
            const isActive = (page === link.href);[span_16](start_span)[span_16](end_span)
            const className = isActive ? "active" : "inactive";[span_17](start_span)[span_17](end_span)
            navHtml += `<a href="${link.href}" class="${className}">${link.text}</a>`;[span_18](start_span)[span_18](end_span)
        });[span_19](start_span)[span_19](end_span)

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
        `;[span_20](start_span)[span_20](end_span)

        const style = document.createElement('style');[span_21](start_span)[span_21](end_span)
        style.innerHTML = `
            header { position: relative; }
            /* ERZWINGT DIE EXAKTE TOOLS-OPTIK AUF ALLEN SEITEN */
            .main-nav { margin-top: 20px !important; display: flex !important; justify-content: center !important; gap: 12px !important; border-top: 1px solid var(--border-color) !important; padding-top: 15px !important; flex-wrap: nowrap !important; }
            .main-nav a { text-decoration: none !important; font-weight: 600 !important; font-size: 13px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; padding: 8px 16px !important; border-radius: 8px !important; transition: all 0.2s ease !important; white-space: nowrap !important; flex-shrink: 0 !important; display: inline-block !important; line-height: 1.4 !important; box-sizing: border-box !important; }
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
            header #auth-status-container { width: auto !important; display: flex !important; }[span_22](start_span)[span_22](end_span)

            .modal-content { 
                max-height: 85vh !important; 
                overflow-y: auto !important; 
                display: block !important;
                -webkit-overflow-scrolling: touch !important;
            }[span_23](start_span)[span_23](end_span)

            @media (max-width: 768px) {
                header { padding: 16px 12px 8px 12px !important; }[span_24](start_span)[span_24](end_span)
                header h1 { font-size: 20px !important; margin-bottom: 4px !important; }[span_25](start_span)[span_25](end_span)
                
                header .header-controls { 
                    position: static !important; display: flex !important; flex-direction: row !important; 
                    justify-content: center !important; align-items: center !important; gap: 8px !important; 
                    margin-top: 10px !important; width: 100% !important; transform: none !important; flex-wrap: wrap !important;
                }[span_26](start_span)[span_26](end_span)
                header #auth-status-container { display: flex !important; align-items: center !important; gap: 8px !important; width: auto !important; }[span_27](start_span)[span_27](end_span)
                header .btn-auth { padding: 6px 12px !important; font-size: 12px !important; width: auto !important; }[span_28](start_span)[span_28](end_span)
                
                header .main-nav { 
                    margin-top: 15px !important; padding: 10px 4px 4px 4px !important; justify-content: flex-start !important; 
                    overflow-x: auto !important; white-space: nowrap !important; gap: 8px !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important;
                    scroll-snap-type: x mandatory !important;
                }[span_29](start_span)[span_29](end_span)
                header .main-nav::-webkit-scrollbar { display: none !important; }[span_30](start_span)[span_30](end_span)
                header .main-nav a { padding: 8px 14px !important; font-size: 11px !important; border-radius: 8px !important; scroll-snap-align: start !important; }[span_31](start_span)[span_31](end_span)
                
                .modal-content { padding: 24px 16px !important; }[span_32](start_span)[span_32](end_span)
            }
        `;
        document.head.appendChild(style);[span_33](start_span)[span_33](end_span)

        const activeLink = header.querySelector('.main-nav a.active');[span_34](start_span)[span_34](end_span)
        if (activeLink) {
            setTimeout(() => {
                activeLink.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
            }, 150);
        }[span_35](start_span)[span_35](end_span)

        return true;
    };[span_36](start_span)[span_36](end_span)

    if (!injectHeader()) {
        document.addEventListener('DOMContentLoaded', injectHeader);
    }[span_37](start_span)[span_37](end_span)
})();
