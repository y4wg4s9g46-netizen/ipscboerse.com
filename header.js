(function() {
    const injectHeader = () => {
        const header = document.querySelector('header');
        if (!header) return false;

        const path = window.location.pathname;
        let page = path.split("/").pop() || "index.html";
        if (page === "") page = "index.html";

        const savedLanguageSetting = localStorage.getItem("selectedLanguage") || "de";
        const isVipPage = (page === "doppel-aa.html" || page === "performance.html");

        // ==========================================
        // 1. LINKS DEFINIEREN
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
        // 2. NUR NOCH BUTTONS & NAV HINZUFÜGEN (Kein header.innerHTML mehr!)
        // ==========================================
        const controls = document.createElement('div');
        controls.className = 'header-controls';
        controls.innerHTML = `
            <button id="theme-toggle" class="theme-toggle-btn" onclick="toggleTheme()" title="Design umschalten">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </button>
            ${isVipPage ? '' : `
                <button id="header-chat-btn" class="theme-toggle-btn" onclick="toggleGlobalInbox()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span id="chat-badge-count" style="display:none">0</span>
                </button>
                <select id="language-select" class="lang-select">
                    <option value="de" ${savedLanguageSetting === 'de' ? 'selected' : ''}>DE</option>
                    <option value="en" ${savedLanguageSetting === 'en' ? 'selected' : ''}>EN</option>
                </select>
            `}
            <div id="auth-status-container">
                <button class="btn-auth" id="btn-open-login" ${isVipPage ? 'onclick="window.location.href=\'index.html\'"' : ''}>Login</button>
            </div>
        `;
        header.appendChild(controls);

        const nav = document.createElement('nav');
        nav.className = 'main-nav desktop-only';
        nav.innerHTML = navHtml;
        header.appendChild(nav);

        // ... [Der restliche Code für bottom-tab-bar, Style-Injection und VIP-Check bleibt unverändert unten dran] ...
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectHeader);
    } else {
        injectHeader();
    }
})();
