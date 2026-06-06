(function() {
    // 1. HEADER GENERIEREN & INJIZIEREN
    const injectHeader = () => {
        const header = document.querySelector('header');
        if (!header) return false;

        const path = window.location.pathname;
        let page = path.split("/").pop() || "index.html";
        if (page === "") page = "index.html";

        const savedLanguageSetting = localStorage.getItem("selectedLanguage") || "de";

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

        header.innerHTML = `
            <a href="index.html" style="text-decoration: none; color: inherit; display: inline-block; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'" title="Zur Startseite">
                <h1 data-txt="main-title">IPSC STARTPLATZ-BÖRSE</h1>
                <p style="color: var(--text-muted); margin: 5px 0 0 0; font-size: 13px;" data-txt="sub-title">Von Schützen für Schützen</p>
            </a>
            
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

        // CSS Styles injizieren
        if (!document.getElementById('global-header-styles')) {
            const style = document.createElement('style');
            style.id = 'global-header-styles';
            style.innerHTML = `
                header { position: relative; }
                header .header-controls { position: absolute !important; top: 50% !important; right: 20px !important; transform: translateY(-50%) !important; display: flex !important; align-items: center !important; gap: 10px !important; flex-direction: row !important; }
                header .theme-toggle-btn { width: 38px !important; height: 38px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; padding: 0 !important; background: var(--card-bg) !important; color: var(--text-color) !important; border: 1px solid var(--border-color) !important; border-radius: 8px !important; cursor: pointer !important; box-shadow: var(--shadow-sm) !important; font-size: 16px !important; }
                header .lang-select { width: auto !important; height: 38px !important; padding: 0 10px !important; box-sizing: border-box !important; flex-shrink: 0 !important; background: var(--card-bg) !important; color: var(--text-color) !important; border: 1px solid var(--border-color) !important; border-radius: 8px !important; font-weight: 600 !important; font-size: 13px !important; box-shadow: var(--shadow-sm) !important; cursor: pointer !important; }
                header #auth-status-container { display: flex !important; align-items: center !important; gap: 8px !important; }
                header .btn-auth { width: auto !important; height: 38px !important; padding: 0 16px !important; font-weight: 600 !important; font-size: 13px !important; border-radius: 8px !important; cursor: pointer !important; box-shadow: var(--shadow-sm) !important; transition: all 0.2s !important; background-color: var(--card-bg) !important; color: var(--text-color) !important; border: 1px solid var(--border-color) !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
                header .btn-auth:hover { background-color: var(--bg-color) !important; border-color: var(--text-muted) !important; }
                header #btn-logout { border: 1px solid var(--danger-color) !important; color: var(--danger-color) !important; background: transparent !important; }
                header #btn-logout:hover { background-color: var(--danger-color) !important; color: #ffffff !important; }
                header #btn-open-settings img { width: 38px !important; height: 38px !important; border-radius: 50% !important; object-fit: cover !important; border: 2px solid var(--accent-color) !important; display: block !important; }
                header .main-nav { margin-top: 20px !important; display: flex !important; justify-content: center !important; gap: 8px !important; border-top: 1px solid var(--border-color) !important; padding-top: 15px !important; flex-wrap: wrap !important; }
                header .main-nav a { text-decoration: none !important; font-weight: 600 !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; padding: 8px 16px !important; border-radius: 20px !important; transition: all 0.2s ease !important; white-space: nowrap !important; display: inline-block !important; }
                header .main-nav a.active { color: #ffffff !important; background-color: var(--accent-color) !important; border-color: var(--accent-color) !important; }
                header .main-nav a.inactive { color: var(--text-muted) !important; background-color: rgba(0, 0, 0, 0.03) !important; }
                html[data-theme="dark"] header .main-nav a.inactive { background-color: rgba(255, 255, 255, 0.04) !important; }
                
                /* Modals CSS (Zentralisiert) */
                .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); justify-content: center; align-items: center; z-index: 1000; padding: 20px; box-sizing: border-box; }
                .modal-content { background-color: var(--card-bg); padding: 32px; border-radius: 12px; border: 1px solid var(--border-color); width: 100%; max-width: 440px; max-height: 85vh; overflow-y: auto; box-sizing: border-box; position: relative; -webkit-overflow-scrolling: touch; }
                .modal-content h3 { color: var(--text-color); margin-top: 0; margin-bottom: 24px; font-size: 24px; font-weight: 700; }
                .modal-close-container { position: absolute; top: 20px; right: 20px; z-index: 1010; }
                .modal-close-trigger { background: transparent; border: none; color: var(--text-muted); font-size: 28px; cursor: pointer; }
                .modal-content .form-group { margin-bottom: 20px; display: flex; flex-direction: column; }
                .modal-content label { font-size: 13px; font-weight: 600; color: var(--text-color); margin-bottom: 6px; text-transform: uppercase; }
                .modal-content input { background-color: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-color); padding: 12px 14px; border-radius: var(--radius); font-size: 14px; }
                .modal-content input:focus { outline: none; border-color: var(--accent-color); }
                .modal-divider { display: flex; align-items: center; text-align: center; color: var(--text-muted); font-size: 12px; margin: 24px 0; text-transform: uppercase; }
                .modal-divider::before, .modal-divider::after { content: ''; flex: 1; border-bottom: 1px solid var(--border-color); }
                .modal-divider:not(:empty)::before { margin-right: .75em; }
                .modal-divider:not(:empty)::after { margin-left: .75em; }
                .btn-primary-auth { background-color: var(--accent-color); color: #ffffff; border: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: var(--radius); cursor: pointer; width: 100%; }
                .btn-secondary-auth { background-color: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: var(--radius); cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; }

                @media (max-width: 768px) {
                    header { padding: 16px 12px 8px 12px !important; }
                    header h1 { font-size: 20px !important; }
                    header .header-controls { position: static !important; display: flex !important; justify-content: center !important; margin-top: 10px !important; width: 100% !important; transform: none !important; }
                    header .main-nav { margin-top: 15px !important; padding: 10px 4px !important; justify-content: flex-start !important; flex-wrap: nowrap !important; overflow-x: auto !important; }
                    header .main-nav a { padding: 8px 14px !important; font-size: 11px !important; }
                }
            `;
            document.head.appendChild(style);
        }

        const activeLink = header.querySelector('.main-nav a.active');
        if (activeLink) {
            setTimeout(() => { activeLink.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, 150);
        }

        return true;
    };

    // 2. ABSOLUT IDENTISCHES AUTH-MODAL DYNAMISCH INJIZIEREN
    const injectGlobalModal = () => {
        // Altes Modal entfernen, falls vorhanden, um Duplikate zu verhindern
        const oldModal = document.getElementById('auth-modal');
        if (oldModal) oldModal.remove();

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal';
        modalDiv.id = 'auth-modal';
        modalDiv.innerHTML = `
            <div class="modal-content">
                <div class="modal-close-container">
                    <button class="modal-close-trigger" id="btn-close-modal">&times;</button>
                </div>
                
                <div id="modal-login-view">
                    <h3 data-txt="modal-login-title">Anmelden</h3>
                    <button type="button" class="btn-secondary-auth" onclick="loginWithPasskey()">
                        <span>📱</span> Login mit FaceID / Fingerabdruck
                    </button>
                    <div class="modal-divider">oder klassisch mit E-Mail</div>
                    <form id="login-form">
                        <div class="form-group">
                            <label data-txt="lbl-email">E-Mail *</label>
                            <input type="email" id="login-email" required placeholder="name@beispiel.de">
                        </div>
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <label style="margin-bottom: 0;">Passwort *</label>
                                <a onclick="toggleAuthView('forgot')" style="color: var(--info-color); text-decoration: none; font-size: 12px; cursor: pointer; font-weight: 500;" data-txt="link-forgot-pwd">Passwort vergessen?</a>
                            </div>
                            <input type="password" id="login-password" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="btn-primary-auth" data-txt="modal-btn-login">Mit Passwort einloggen</button>
                    </form>
                    <div class="modal-footer" style="margin-top:20px; font-size:13px; text-align:center;">
                        <span data-txt="modal-no-acc">Noch kein Konto?</span>
                        <a onclick="toggleAuthView('register')" style="color:var(--info-color); cursor:pointer; font-weight:600;" data-txt="modal-link-reg">Registrieren</a>
                    </div>
                </div>

                <div id="modal-register-view" style="display: none;">
                    <h3 data-txt="modal-reg-title">Konto erstellen</h3>
                    <form id="register-form">
                        <div class="form-group">
                            <label data-txt="lbl-email">E-Mail *</label>
                            <input type="email" id="register-email" required placeholder="name@beispiel.de">
                        </div>
                        <div class="form-group">
                            <label>Passwort *</label>
                            <input type="password" id="register-password" required minlength="6" placeholder="Mindestens 6 Zeichen">
                        </div>
                        <button type="submit" class="btn-primary-auth" data-txt="modal-btn-reg">Konto erstellen</button>
                    </form>
                    <div class="modal-footer" style="margin-top:20px; font-size:13px; text-align:center;">
                        <span data-txt="modal-has-acc">Bereits registriert?</span>
                        <a onclick="toggleAuthView('login')" style="color:var(--info-color); cursor:pointer; font-weight:600;" data-txt="modal-link-login">Zum Login</a>
                    </div>
                </div>

                <div id="modal-forgot-view" style="display: none;">
                    <h3 data-txt="modal-forgot-title">Passwort vergessen</h3>
                    <form id="forgot-form">
                        <div class="form-group">
                            <label data-txt="lbl-email">Deine E-Mail-Adresse *</label>
                            <input type="email" id="forgot-email" required placeholder="name@beispiel.de">
                        </div>
                        <button type="submit" class="btn-primary-auth" data-txt="modal-btn-forgot">Zurücksetzungs-Link senden</button>
                    </form>
                </div>

                <div id="modal-settings-view" style="display: none;">
                    <h3 data-txt="modal-settings-title">Konto-Einstellungen</h3>
                    <form id="settings-form">
                        <div class="form-group">
                            <label data-txt="lbl-username">Schützenname / Anzeigename</label>
                            <input type="text" id="settings-username" placeholder="z.B. IPSCShooter99">
                        </div>
                        <div class="form-group">
                            <label data-txt="lbl-ipsc-alias">🛡️ IPSC Alias / Mitgliedsnummer</label>
                            <input type="text" id="settings-ipsc-alias" placeholder="z.B. GER1234">
                        </div>
                        <div class="form-group" style="background-color: rgba(59, 130, 246, 0.04); padding: 12px; border-radius: 4px; border-left: 3px solid var(--info-color); margin-bottom: 20px;">
                            <label style="color: var(--info-color); margin-bottom: 2px;">🔒 Echter Name (Für automatische Statistiken)</label>
                            <p style="font-size: 11px; margin-top: 0; margin-bottom: 8px; color: var(--text-muted);">Trage hier deinen Klarnamen ein. Dieser Name wird niemals öffentlich gezeigt.</p>
                            <input type="text" id="settings-real-name" placeholder="z.B. Max Mustermann">
                        </div>
                        <button type="submit" class="btn-primary-auth" style="width:100%;" data-txt="btn-save">Änderungen speichern</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    };

    // Start-Initiierung
    const initShell = () => {
        injectHeader();
        injectGlobalModal();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShell);
    } else {
        initShell();
    }

    // =========================================================================
    // ⚡ SPA-ROUTING-ENGINE (UNVERÄNDERT UNTERSTÜTZT)
    // =========================================================================
    window.loadSpaPage = async function(url, pushState = true) {
        try {
            const currentContainer = document.querySelector('.container');
            if (!currentContainer) return;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Netzwerkfehler");

            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const newContainer = doc.querySelector('.container');

            if (!newContainer) return;

            // Inhalt austauschen
            currentContainer.innerHTML = newContainer.innerHTML;

            // Skripte ausführen (ausgenommen Core-Skripte)
            newContainer.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                if (oldScript.src) {
                    if (oldScript.src.includes('auth.js') || oldScript.src.includes('lang.js') || oldScript.src.includes('app.js') || oldScript.src.includes('header.js')) {
                        return;
                    }
                    newScript.src = oldScript.src;
                } else {
                    newScript.textContent = oldScript.textContent;
                }
                document.body.appendChild(newScript);
                newScript.remove(); 
            });

            // Übersetzungen antriggern
            if (typeof window.translatePortalPage === 'function') {
                window.translatePortalPage();
            }

            if (pushState) {
                history.pushState({ url }, '', url);
            }

            // Menü-Highlight anpassen
            const pageName = url.split("/").pop() || "index.html";
            document.querySelectorAll('header .main-nav a').forEach(a => {
                a.className = (a.getAttribute('href') === pageName) ? 'active' : 'inactive';
            });

            // WICHTIG: Auth-Zustand für die neue Ansicht re-evaluieren!
            if (typeof window.onAuthChange === 'function') {
                window.onAuthChange();
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error("SPA Routing-Fehler:", err);
            window.location.href = url;
        }
    };

    // Globaler Klick-Abfänger
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('header .main-nav a, .dashboard-grid a, a[href$=".html"]');
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('#')) {
            return;
        }

        e.preventDefault();
        window.loadSpaPage(href);
    });

    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.url) {
            window.loadSpaPage(e.state.url, false);
        } else {
            window.loadSpaPage(window.location.pathname, false);
        }
    });

})();
