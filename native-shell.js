/* V77F Zero Flash More Paint Safe Native Local Bundle App Shell
   Fixes the More-page white screen by never activating a freshly created iframe
   until its real target document has fired load (not about:blank).
   Old page remains visible until the new page completed first paint. */
(function nativeAppShellV76t() {
    if (window.__IPSC_NATIVE_APP_SHELL_V77) return;
    window.__IPSC_NATIVE_APP_SHELL_V77 = true;
    window.__IPSC_NATIVE_APP_SHELL_V77F = true;
    window.__IPSC_NATIVE_APP_SHELL_V78W_PERF = true;

    var PAGES = {
        "index.html": { title: "Start" },
        "marktplatz.html": { title: "Markt" },
        "mein-planer.html": { title: "Planer" },
        "community.html": { title: "Community" },
        "freie-matches.html": { title: "Matches" },
        "schiessbuch.html": { title: "Schießbuch" },
        "sg-timer-live.html": { title: "SG-Timer Live" },
        "tools.html": { title: "Tools" },
        "analytics.html": { title: "Statistiken" },
        "wiederladen.html": { title: "Wiederladen" },
        "ipsc-hub.html": { title: "IPSC Hub" },
        "doppel-aa.html": { title: "Startplatz-Bot" },
        "performance.html": { title: "ELO-Vergleich" },
        "impressum.html": { title: "Impressum" },
        "reset.html": { title: "Passwort zurücksetzen" },
        "schiessbuch-confirm.html": { title: "Schießbuch bestätigen" },
        "schiessbuch-verify.html": { title: "Schießbuch prüfen" }
    };

    var CORE_SHELL_PAGES = PAGES;
    var CLUB_PAGES_V78V = { "doppel-aa.html": 1, "performance.html": 1 };
    var clubAccessV78v = { allowed: false, checked: false, checking: false };
    var CORE_FILES = { "index.html": 1, "marktplatz.html": 1, "mein-planer.html": 1, "community.html": 1 };
    var MAX_LIVE_FRAMES = 3;

    function shouldEmbedInShell(file) {
        return !!PAGES[file];
    }

    function isDoubleAAValueV78v(value) {
        return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true" || String(value).toLowerCase() === "yes";
    }

    function setClubAccessV78v(allowed) {
        clubAccessV78v.allowed = !!allowed;
        clubAccessV78v.checked = true;
        try {
            document.documentElement.classList.toggle("ipsc-club-access-v78v", clubAccessV78v.allowed);
            if (document.body) document.body.classList.toggle("ipsc-club-access-v78v", clubAccessV78v.allowed);
            document.querySelectorAll('[data-club-link-v76d="1"], #club-links-placeholder-v76c .club-links-v76').forEach(function(el){ if (!clubAccessV78v.allowed) el.remove(); });
        } catch (_) {}
    }

    async function checkClubAccessV78v() {
        if (clubAccessV78v.checking) return clubAccessV78v.allowed;
        clubAccessV78v.checking = true;
        try {
            if (!window.supabaseClient || !window.supabaseClient.auth) { setClubAccessV78v(false); return false; }
            var sessionResult = await window.supabaseClient.auth.getSession();
            var user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
            if (!user) { setClubAccessV78v(false); return false; }
            var result = await window.supabaseClient.from("profiles").select("is_doppel_aa").eq("id", user.id).maybeSingle();
            var allowed = !result.error && result.data && isDoubleAAValueV78v(result.data.is_doppel_aa);
            setClubAccessV78v(allowed);
            return !!allowed;
        } catch (err) {
            console.warn("Double Alpha Native-Shell Prüfung fehlgeschlagen:", err);
            setClubAccessV78v(false);
            return false;
        } finally {
            clubAccessV78v.checking = false;
        }
    }

    function fullPageUrlFor(view) {
        var search = view.search || "";
        var hasNativeFlag = /(?:^|[?&])nativeShell=0(?:&|$)/.test(search);
        if (!hasNativeFlag) {
            search += (search ? "&" : "?") + "nativeShell=0";
        }
        return view.file + search + (view.hash || "");
    }

    var viewport = null;
    var loader = null;
    var currentKey = null;
    var frames = Object.create(null);
    var heightTimers = Object.create(null);
    var prewarmStarted = false;

    function getTheme() {
        var t = document.documentElement.getAttribute("data-theme") || window.__IPSC_ACTIVE_THEME_V76T || window.__IPSC_ACTIVE_THEME_V76S;
        if (!t || t === "auto") {
            try { t = localStorage.getItem("selectedTheme") || localStorage.getItem("theme") || localStorage.getItem("ipsc_effective_theme") || "light"; } catch (_) { t = "light"; }
        }
        if (t === "auto") {
            try { t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light"; } catch (_) { t = "light"; }
        }
        return t === "dark" ? "dark" : "light";
    }

    function applyShellTheme(theme) {
        theme = theme === "dark" ? "dark" : "light";
        var surface = theme === "dark" ? "#0f172a" : "#f6f8fc";
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.style.backgroundColor = surface;
        document.documentElement.style.colorScheme = theme;
        if (document.body) document.body.style.backgroundColor = surface;
        try { localStorage.setItem("ipsc_effective_theme", theme); sessionStorage.setItem("ipsc_effective_theme", theme); } catch (_) {}
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", surface);
        window.__IPSC_ACTIVE_THEME_V76T = theme;
        window.__IPSC_ACTIVE_THEME_V76S = theme;
        return surface;
    }

    function normalizeView(raw) {
        raw = String(raw || "index.html");
        try { raw = decodeURIComponent(raw); } catch (_) {}
        raw = raw.replace(/^\.\//, "");
        if (!raw || raw === "/") raw = "index.html";
        var u;
        try { u = new URL(raw, window.location.href); } catch (_) { u = new URL("index.html", window.location.href); }
        var file = (u.pathname.split("/").pop() || "index.html");
        if (!PAGES[file]) file = "index.html";
        var search = u.search || "";
        var hash = u.hash || "";
        return {
            file: file,
            key: file + search + hash,
            search: search,
            hash: hash
        };
    }

    function shellUrlFor(view) {
        var search = view.search || "";
        var join = search ? "&" : "?";
        return view.file + search + join + "shell=1" + (view.hash || "");
    }

    function setLoading(visible) {
        if (!loader) return;
        loader.classList.toggle("is-visible", !!visible);
    }

    function markFrameLoaded(frame, view) {
        try {
            var href = frame.contentWindow && frame.contentWindow.location && frame.contentWindow.location.href || "";
            if (!href || href === "about:blank" || href.indexOf("about:blank") === 0) return false;
            var loadedFile = (frame.contentWindow.location.pathname.split("/").pop() || "index.html");
            if (loadedFile !== view.file) return false;
            frame.dataset.loadedKey = view.key;
            frame.dataset.loadedFile = view.file;
            frame.dataset.lastUsed = String(Date.now());
            return true;
        } catch (_) { return false; }
    }

    function isFrameReadyForView(frame, view) {
        try {
            return !!(frame && frame.dataset.loadedKey === view.key && frame.contentDocument && frame.contentDocument.readyState !== "loading");
        } catch (_) { return false; }
    }

    function isFramePaintReady(frame) {
        try {
            var doc = frame && frame.contentDocument;
            if (!doc || !doc.body || !doc.documentElement) return false;
            if (doc.readyState === "loading") return false;
            var txt = (doc.body.innerText || doc.body.textContent || "").trim();
            var h = Math.max(doc.body.scrollHeight || 0, doc.documentElement.scrollHeight || 0, doc.body.offsetHeight || 0, doc.documentElement.offsetHeight || 0);
            return h > 120 || txt.length > 20;
        } catch (_) { return false; }
    }

    function afterFramePaint(frame, cb) {
        var tries = 0;
        function tick() {
            tries++;
            if (isFramePaintReady(frame) || tries > 24) {
                window.requestAnimationFrame(function () { window.requestAnimationFrame(cb); });
                return;
            }
            window.setTimeout(tick, 50);
        }
        tick();
    }

    function removeFrameByKey(key) {
        try {
            var frame = frames[key];
            if (!frame) return;
            if (heightTimers[key]) { try { if (heightTimers[key].cancel) heightTimers[key].cancel(); else clearInterval(heightTimers[key]); } catch (_) {} delete heightTimers[key]; }
            try { frame.src = "about:blank"; } catch (_) {}
            try { frame.remove(); } catch (_) {}
            delete frames[key];
        } catch (_) {}
    }

    function evictOldFrames(activeKey, protectedKey) {
        try {
            var keys = Object.keys(frames);
            if (keys.length <= MAX_LIVE_FRAMES) return;
            var candidates = keys.filter(function (k) {
                var f = frames[k];
                if (!f || k === activeKey || k === protectedKey) return false;
                if (f.classList.contains("is-active") || f.classList.contains("is-outgoing") || f.classList.contains("is-preparing")) return false;
                var file = f.dataset.loadedFile || (k.split("?")[0].split("#")[0]);
                return !CORE_FILES[file];
            }).sort(function (a, b) {
                return Number(frames[a].dataset.lastUsed || 0) - Number(frames[b].dataset.lastUsed || 0);
            });
            while (Object.keys(frames).length > MAX_LIVE_FRAMES && candidates.length) removeFrameByKey(candidates.shift());
        } catch (_) {}
    }

    function setActiveChrome(file) {
        try {
            document.documentElement.dataset.nativeShellView = file;
            document.body.dataset.nativeShellView = file;
            document.querySelectorAll("#bottom-tab-bar a[href], header nav a[href], .main-nav a[href], #more-menu-overlay a[href], a.header-logo-link[href]").forEach(function (a) {
                var href = a.getAttribute("href") || "";
                var f = href.split("?")[0].split("#")[0].split("/").pop() || "index.html";
                var active = f === file;
                a.classList.toggle("active", active);
                a.classList.toggle("inactive", !active && a.closest("header nav, .main-nav"));
            });
            var morePages = ["freie-matches.html", "schiessbuch.html", "sg-timer-live.html", "tools.html", "analytics.html", "wiederladen.html", "ipsc-hub.html"]; if (clubAccessV78v.allowed) morePages.push("doppel-aa.html", "performance.html");
            var moreActive = morePages.indexOf(file) >= 0;
            var moreBtn = document.getElementById("btn-more-menu");
            if (moreBtn) moreBtn.classList.toggle("active", moreActive);
        } catch (_) {}
    }

    function closeShellMoreMenu() {
        try {
            var menu = document.getElementById("more-menu-overlay");
            var btn = document.getElementById("btn-more-menu");
            if (menu) menu.classList.remove("show");
            if (btn) btn.classList.remove("open");
        } catch (_) {}
    }

    function toggleShellMoreMenu() {
        try {
            var menu = document.getElementById("more-menu-overlay");
            var btn = document.getElementById("btn-more-menu");
            if (!menu || !btn) return false;
            var willOpen = !menu.classList.contains("show");
            menu.classList.toggle("show", willOpen);
            btn.classList.toggle("open", willOpen);
            if (willOpen) {
                window.requestAnimationFrame(function () {
                    try {
                        var list = document.getElementById("more-menu-list");
                        if (!list) return;
                        var stored = Number(localStorage.getItem("ipsc.moreMenu.scrollTop.v76k") || "0");
                        if (stored > 8) list.scrollTop = stored;
                    } catch (_) {}
                });
            }
            return true;
        } catch (_) { return false; }
    }

    function openShellAuthModal(view) {
        view = view || "login";
        try {
            var modal = document.getElementById("auth-modal");
            if (!modal) return false;
            modal.style.display = "flex";
            modal.classList.add("open");
            modal.removeAttribute("aria-hidden");
            if (document.body) document.body.classList.add("auth-open", "modal-open");
            if (typeof window.toggleAuthView === "function") window.toggleAuthView(view);
            var field = document.getElementById(view === "register" ? "register-email" : "login-email");
            if (field) setTimeout(function(){ try { field.focus({ preventScroll: true }); } catch (_) {} }, 160);
            return true;
        } catch (_) { return false; }
    }

    window.openAuthModalV77b = openShellAuthModal;
    window.toggleMoreMenuV77b = toggleShellMoreMenu;

    function activateFrame(frame, view, opts) {
        opts = opts || {};
        if (!frame || !view || !viewport) return;

        var previousActive = viewport.querySelector(".native-shell-frame-v76t.is-active");
        injectIntoFrame(frame, view.file);
        resizeFrame(frame);

        var newHeight = parseInt(frame.style.height || "0", 10) || (window.innerHeight - 80);
        var oldHeight = previousActive ? (parseInt(previousActive.style.height || "0", 10) || 0) : 0;
        viewport.style.height = Math.max(newHeight, oldHeight, window.innerHeight - 80) + "px";

        if (previousActive && previousActive !== frame) {
            previousActive.classList.remove("is-active", "is-preparing");
            previousActive.classList.add("is-outgoing");
        }

        frame.dataset.lastUsed = String(Date.now());
        frame.classList.remove("is-preparing", "is-cached", "is-outgoing");
        frame.classList.add("is-active");
        setActiveChrome(view.file);
        setLoading(false);
        try { window.scrollTo({ top: 0, behavior: "instant" }); } catch (_) { window.scrollTo(0, 0); }

        window.requestAnimationFrame(function () {
            resizeFrame(frame);
            window.setTimeout(function () {
                if (previousActive && previousActive !== frame) {
                    previousActive.classList.remove("is-outgoing", "is-active", "is-preparing");
                    previousActive.classList.add("is-cached");
                }
                Object.keys(frames).forEach(function (k) {
                    var f = frames[k];
                    if (f !== frame && f !== previousActive) {
                        f.classList.remove("is-active", "is-preparing", "is-outgoing");
                        f.classList.add("is-cached");
                    }
                });
                resizeFrame(frame);
                evictOldFrames(view.key, previousActive && previousActive.dataset ? previousActive.dataset.pageKey : null);
            }, 170);
        });
    }

    function resizeFrame(frame) {
        if (!frame || !frame.contentWindow || !frame.contentDocument) return;
        try {
            var doc = frame.contentDocument;
            var body = doc.body;
            var html = doc.documentElement;
            var h = Math.max(
                body ? body.scrollHeight : 0,
                body ? body.offsetHeight : 0,
                html ? html.scrollHeight : 0,
                html ? html.offsetHeight : 0,
                window.innerHeight - 80
            );
            h = Math.max(400, h + 4);
            frame.style.height = h + "px";
            if (viewport && frame.classList.contains("is-active")) {
                viewport.style.height = Math.max(h, window.innerHeight - 80) + "px";
            }
        } catch (_) {}
    }

    function injectIntoFrame(frame, file) {
        try {
            var doc = frame.contentDocument;
            if (!doc || !doc.documentElement) return;
            doc.documentElement.classList.add("ipsc-embedded-native-shell-v76t");
            doc.documentElement.dataset.embeddedNativeShell = "1";
            var theme = getTheme();
            var surface = applyShellTheme(theme);
            doc.documentElement.setAttribute("data-theme", theme);
            doc.documentElement.style.backgroundColor = surface;
            if (doc.body) {
                doc.body.classList.add("embedded-native-shell-v76t");
                doc.body.style.backgroundColor = surface;
                doc.body.style.paddingTop = "0";
            }
            if (!doc.getElementById("ipsc-embedded-shell-style-v76t")) {
                var st = doc.createElement("style");
                st.id = "ipsc-embedded-shell-style-v76t";
                st.textContent = [
                    "html.ipsc-embedded-native-shell-v76t, html.ipsc-embedded-native-shell-v76t body{background:" + surface + "!important;background-color:" + surface + "!important;overflow-x:hidden!important;}",
                    "html.ipsc-embedded-native-shell-v76t header, html.ipsc-embedded-native-shell-v76t #bottom-tab-bar, html.ipsc-embedded-native-shell-v76t #more-menu-overlay{display:none!important;visibility:hidden!important;}",
                    "html.ipsc-embedded-native-shell-v76t body{padding-top:0!important;padding-bottom:20px!important;}",
                    "html.ipsc-embedded-native-shell-v76t .container, html.ipsc-embedded-native-shell-v76t main, html.ipsc-embedded-native-shell-v76t .main-container{padding-bottom:24px!important;}",
                    "html.ipsc-embedded-native-shell-v76t #app-page-transition-cover, html.ipsc-embedded-native-shell-v76t #native-page-curtain-v74, html.ipsc-embedded-native-shell-v76t #ipsc-surface-bridge-v76s{display:none!important;opacity:0!important;visibility:hidden!important;}",
                    "html.ipsc-embedded-native-shell-v76t .desktop-only{display:none!important;}",
                    "html.ipsc-embedded-native-shell-v76t .mobile-only:not(#bottom-tab-bar){display:block;}",
                    "html.ipsc-embedded-native-shell-v76t body.page-marktplatz .listing-card{contain:layout paint;}",
                    "html.ipsc-embedded-native-shell-v76t a{-webkit-tap-highlight-color:transparent;}"
                ].join("\n");
                (doc.head || doc.documentElement).appendChild(st);
            }
            try {
                frame.contentWindow.openParentAuthModalV77b = function(view) { return openShellAuthModal(view || "login"); };
                frame.contentWindow.routeParentShellV77b = function(view) { return routeTo(view || "index.html"); };
            } catch (_) {}
            bindFrameLinks(frame, file);
            scheduleHeightWatch(frame);
            resizeFrame(frame);
        } catch (_) {}
    }

    function bindFrameLinks(frame, file) {
        try {
            var doc = frame.contentDocument;
            if (!doc || doc.__ipscShellLinksBoundV76t) return;
            doc.__ipscShellLinksBoundV76t = true;
            doc.addEventListener("click", function (event) {
                var target = event.target;
                var loginTrigger = target && target.closest && target.closest('#btn-open-login, [onclick*="auth-modal"], [onclick*="toggleAuthView"], [data-native-login]');
                if (loginTrigger) {
                    var inline = String(loginTrigger.getAttribute("onclick") || "");
                    var text = String(loginTrigger.innerText || loginTrigger.textContent || "").toLowerCase();
                    if (loginTrigger.id === "btn-open-login" || inline.indexOf("auth-modal") >= 0 || inline.indexOf("toggleAuthView") >= 0 || /einloggen|anmelden|login/.test(text)) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        openShellAuthModal(inline.indexOf("register") >= 0 ? "register" : "login");
                        return;
                    }
                }

                var a = target && target.closest && target.closest("a[href]");
                if (!a) return;
                if (a.target && a.target !== "_self") return;
                if (a.hasAttribute("download")) return;
                var href = a.getAttribute("href") || "";
                if (!href || href.indexOf("#") === 0 || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
                var url;
                try { url = new URL(href, frame.contentWindow.location.href); } catch (_) { return; }
                if (url.origin !== window.location.origin) return;
                var f = url.pathname.split("/").pop() || "index.html";
                if (!PAGES[f]) return;
                if (url.pathname === frame.contentWindow.location.pathname && url.search === frame.contentWindow.location.search && url.hash) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                routeTo(f + url.search + url.hash);
            }, true);
        } catch (_) {}
    }

    function scheduleHeightWatch(frame) {
        var key = frame.dataset.pageKey;
        if (!key || heightTimers[key]) return;
        // V78W: Performance-Hotfix. Keine globalen MutationObserver pro iframe und kein permanentes
        // 900ms-Polling mehr. Das hat auf iPhone/iPad nach mehreren Seitenwechseln spürbar gebremst.
        var resizePending = false;
        function requestResize() {
            if (resizePending || !frame.classList.contains("is-active")) return;
            resizePending = true;
            window.requestAnimationFrame(function () {
                resizePending = false;
                resizeFrame(frame);
            });
        }
        heightTimers[key] = { cancel: function () {} };
        try {
            var doc = frame.contentDocument;
            if (doc) {
                doc.addEventListener("load", requestResize, true);
                doc.addEventListener("transitionend", requestResize, true);
                doc.addEventListener("input", requestResize, true);
                doc.addEventListener("click", function () { window.setTimeout(requestResize, 80); }, true);
            }
        } catch (_) {}
        window.setTimeout(requestResize, 120);
        window.setTimeout(requestResize, 420);
    }

    function ensureFrame(view) {
        if (frames[view.key]) return frames[view.key];
        var frame = document.createElement("iframe");
        frame.className = "native-shell-frame-v76t";
        frame.dataset.pageKey = view.key;
        frame.dataset.loadedKey = "";
        frame.dataset.loadedFile = "";
        frame.dataset.lastUsed = String(Date.now());
        frame.title = PAGES[view.file].title || view.file;
        frame.setAttribute("loading", "eager");
        frame.setAttribute("scrolling", "no");
        frame.setAttribute("aria-hidden", "true");
        frame.addEventListener("load", function () {
            if (!markFrameLoaded(frame, view)) return;
            frame.setAttribute("aria-hidden", "false");
            injectIntoFrame(frame, view.file);
            resizeFrame(frame);
            // Give WebKit one frame to paint the real document before swapping layers.
            if (currentKey === view.key) {
                afterFramePaint(frame, function () { activateFrame(frame, view); });
            }
        });
        frame.addEventListener("error", function () {
            frame.dataset.loadedKey = "";
            frame.classList.remove("is-preparing");
            frame.classList.add("is-cached");
            setLoading(false);
        });
        viewport.appendChild(frame);
        frames[view.key] = frame;
        // Set src only after listeners and DOM insertion, to avoid activating about:blank.
        frame.src = shellUrlFor(view);
        return frame;
    }

    async function routeTo(rawView, opts) {
        opts = opts || {};
        var view = normalizeView(rawView);
        if (CLUB_PAGES_V78V[view.file] && !clubAccessV78v.allowed) {
            var allowed = await checkClubAccessV78v();
            if (!allowed) {
                view = normalizeView('index.html');
                opts.replace = true;
            }
        }
        var theme = getTheme();
        applyShellTheme(theme);

        if (!PAGES[view.file]) {
            window.location.href = rawView;
            return;
        }

        if (currentKey === view.key && frames[view.key]) {
            setActiveChrome(view.file);
            closeShellMoreMenu();
            try { injectIntoFrame(frames[view.key], view.file); resizeFrame(frames[view.key]); } catch (_) {}
            if (opts.replace) history.replaceState({ view: view.file }, "", "native-shell.html?view=" + encodeURIComponent(view.file + (view.search || "") + (view.hash || "")));
            return;
        }

        // V77E: every internal page stays inside the zero-flash shell.
        // Do not fall back to a hard document navigation for More pages.

        currentKey = view.key;
        setActiveChrome(view.file);
        closeShellMoreMenu();
        try { sessionStorage.setItem("ipsc_native_shell_view_v76t", view.file); } catch (_) {}

        var frame = ensureFrame(view);
        var frameReady = isFrameReadyForView(frame, view);
        if (frameReady) {
            activateFrame(frame, view);
        } else {
            // V77F: keep the old page visible, but let the new iframe be *paintable* behind it.
            // WKWebView can leave fully hidden iframes blank; opacity .001 + visible fixes More-page white screens.
            frame.classList.remove("is-cached", "is-active", "is-outgoing");
            frame.classList.add("is-preparing");
            setLoading(false);
            try {
                if (!frame.src || frame.src === "about:blank") frame.src = shellUrlFor(view);
            } catch (_) {}
        }

        try { evictOldFrames(view.key, null); } catch (_) {}
        var url = "native-shell.html?view=" + encodeURIComponent(view.file + (view.search || "") + (view.hash || ""));
        if (opts.replace) history.replaceState({ view: view.file }, "", url);
        else history.pushState({ view: view.file }, "", url);
    }

    function interceptShellClick(event) {
        var moreBtn = event.target && event.target.closest && event.target.closest("#btn-more-menu");
        if (moreBtn) {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleShellMoreMenu();
            return;
        }
        var loginBtn = event.target && event.target.closest && event.target.closest("#btn-open-login");
        if (loginBtn) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openShellAuthModal("login");
            return;
        }
        var settingsBtn = event.target && event.target.closest && event.target.closest("#btn-open-settings");
        if (settingsBtn && document.getElementById("auth-modal")) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openShellAuthModal("settings");
            return;
        }
        var a = event.target && event.target.closest && event.target.closest("a[href]");
        if (!a) return;
        if (a.target && a.target !== "_self") return;
        if (a.hasAttribute("download")) return;
        var href = a.getAttribute("href") || "";
        if (!href || href.indexOf("#") === 0 || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
        var url;
        try { url = new URL(href, window.location.href); } catch (_) { return; }
        if (url.origin !== window.location.origin) return;
        var f = url.pathname.split("/").pop() || "index.html";
        if (!PAGES[f]) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        routeTo(f + url.search + url.hash);
    }

    function warmHtmlCache() {
        if (prewarmStarted) return;
        prewarmStarted = true;
        // V78W: Launch-Performance. Kein Vorladen von Live-iframes mehr.
        // Die Seite, die der Nutzer öffnet, wird geladen; alte aktive Seite bleibt bis zur ersten Paint sichtbar.
        // Dadurch deutlich weniger RAM/CPU in WKWebView auf iPhone/iPad.
        try {
            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(function () {
                    ["index.html", "marktplatz.html", "mein-planer.html", "community.html"].forEach(function (f) {
                        try { fetch(f + "?shell=1", { cache: "force-cache" }).catch(function () {}); } catch (_) {}
                    });
                }, { timeout: 5000 });
            }
        } catch (_) {}
    }

    function broadcastAuthToFrames(eventName) {
        Object.keys(frames).forEach(function (k) {
            var frame = frames[k];
            try {
                var w = frame.contentWindow;
                if (!w) return;
                if (w.supabaseClient && w.supabaseClient.auth && w.supabaseClient.auth.getSession) {
                    w.supabaseClient.auth.getSession().then(function (res) {
                        var user = res && res.data && res.data.session && res.data.session.user;
                        try { w.currentUser = user || null; } catch (_) {}
                        try { if (typeof w.updateAuthUI === "function") w.updateAuthUI(user || null); } catch (_) {}
                        try { if (typeof w.onAuthChange === "function") w.onAuthChange(user || null); } catch (_) {}
                    }).catch(function(){});
                }
                try { w.dispatchEvent(new CustomEvent("ipsc:shell-auth-updated-v77e", { detail: { eventName: eventName } })); } catch (_) {}
            } catch (_) {}
        });
    }

    function syncThemeToFrames() {
        var theme = getTheme();
        var surface = applyShellTheme(theme);
        Object.keys(frames).forEach(function (k) {
            var frame = frames[k];
            try {
                var doc = frame.contentDocument;
                if (!doc) return;
                doc.documentElement.setAttribute("data-theme", theme);
                doc.documentElement.style.backgroundColor = surface;
                if (doc.body) doc.body.style.backgroundColor = surface;
            } catch (_) {}
        });
    }

    function syncLanguageToFramesV79r(lang) {
        try {
            lang = lang || localStorage.getItem("selectedLanguage") || "de";
            localStorage.setItem("selectedLanguage", lang);
        } catch (_) {}
        Object.keys(frames).forEach(function (k) {
            var frame = frames[k];
            try {
                var w = frame.contentWindow;
                if (!w) return;
                try { w.localStorage.setItem("selectedLanguage", lang); } catch (_) {}
                try { w.currentLang = lang; } catch (_) {}
                try { if (typeof w.translatePortalPage === "function") w.translatePortalPage(); } catch (_) {}
                try { if (typeof w.onLanguageChanged === "function") w.onLanguageChanged(); } catch (_) {}
                try { w.dispatchEvent(new CustomEvent("ipsc:language-change-v79r", { detail: { lang: lang } })); } catch (_) {}
            } catch (_) {}
        });
    }

    function init() {
        document.documentElement.classList.add("ipsc-native-shell-v76t");
        viewport = document.getElementById("native-shell-viewport-v76t");
        loader = document.getElementById("native-shell-loading-v76t");
        if (!viewport) return;
        applyShellTheme(getTheme());
        try {
            window.showPageTransitionCover = function () { return false; };
            window.hidePageTransitionCover = function () { return false; };
            document.documentElement.classList.remove("is-page-leaving", "is-native-navigating-v74", "is-native-navigating-v76o");
        } catch (_) {}
        // V79R: Passkey/Face ID nicht mehr im nativen Shell blockieren.
        // Die echte Funktion aus auth.js bleibt aktiv; kein "später"-Hinweis mehr.
        try {
            var ps = document.createElement("style");
            ps.id = "ipsc-native-shell-passkey-active-v79r";
            ps.textContent = [
              "#auth-modal .btn-social-passkey{opacity:1!important;filter:none!important;pointer-events:auto!important;}",
              "#auth-modal .btn-social-passkey [class*='later'],#auth-modal .btn-social-passkey .passkey-later{display:none!important;}"
            ].join("\n");
            document.head.appendChild(ps);
        } catch (_) {}
        document.addEventListener("click", interceptShellClick, true);
        document.addEventListener("click", function (event) {
            if (event.target && event.target.closest && event.target.closest("#theme-toggle")) {
                setTimeout(syncThemeToFrames, 60);
                setTimeout(syncThemeToFrames, 240);
            }
        }, true);
        document.addEventListener("change", function (event) {
            var target = event.target;
            if (target && target.id === "language-select") {
                var lang = target.value || "de";
                try { localStorage.setItem("selectedLanguage", lang); } catch (_) {}
                setTimeout(function(){ syncLanguageToFramesV79r(lang); }, 0);
                setTimeout(function(){ syncLanguageToFramesV79r(lang); }, 120);
                setTimeout(function(){ syncLanguageToFramesV79r(lang); }, 500);
            }
        }, true);
        window.addEventListener("popstate", function () {
            var q = new URLSearchParams(window.location.search || "");
            routeTo(q.get("view") || "index.html", { replace: true });
        });
        window.addEventListener("resize", function () {
            if (currentKey && frames[currentKey]) resizeFrame(frames[currentKey]);
        }, { passive: true });
        window.addEventListener("orientationchange", function () {
            setTimeout(function () { if (currentKey && frames[currentKey]) resizeFrame(frames[currentKey]); }, 250);
        }, { passive: true });
        var q = new URLSearchParams(window.location.search || "");
        var initial = q.get("view") || sessionStorage.getItem("ipsc_native_shell_view_v76t") || "index.html";
        routeTo(initial, { replace: true });
        warmHtmlCache();
        try {
            if (window.supabaseClient && window.supabaseClient.auth && window.supabaseClient.auth.onAuthStateChange) {
                window.supabaseClient.auth.onAuthStateChange(function (eventName) {
                    if (eventName === "SIGNED_IN" || eventName === "SIGNED_OUT" || eventName === "TOKEN_REFRESHED") {
                        // V77E: do not reload all embedded frames after OAuth.
                        // Reloading cached iframes caused visible blinking and white screens.
                        setTimeout(function () {
                            try { if (typeof window.updateAuthUI === "function") window.updateAuthUI(window.currentUser || null); } catch (_) {}
                            try { syncThemeToFrames(); } catch (_) {}
                            try { broadcastAuthToFrames(eventName); window.dispatchEvent(new CustomEvent("ipsc:shell-auth-updated-v77e", { detail: { eventName: eventName } })); } catch (_) {}
                        }, 120);
                    }
                });
            }
        } catch (_) {}
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();

    window.IPSCNativeShellV76v = { routeTo: routeTo, syncTheme: syncThemeToFrames, syncLanguage: syncLanguageToFramesV79r, openAuth: openShellAuthModal, toggleMore: toggleShellMoreMenu, broadcastAuth: broadcastAuthToFrames };
    window.IPSCNativeShellV77b = window.IPSCNativeShellV76v;
    window.IPSCNativeShellV77c = window.IPSCNativeShellV76v;
    window.IPSCNativeShellV77d = window.IPSCNativeShellV76v;
    window.IPSCNativeShellV77e = window.IPSCNativeShellV76v;
    window.IPSCNativeShellV77f = window.IPSCNativeShellV76v;
    window.IPSCNativeShellV76u = window.IPSCNativeShellV76v;

    try { setTimeout(checkClubAccessV78v, 250); setTimeout(checkClubAccessV78v, 1500); } catch (_) {}
})();
