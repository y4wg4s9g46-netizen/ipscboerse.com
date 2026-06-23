/* V76V Native App Shell No-Blank Layered Switch
   Keeps the Capacitor WebView on one HTML document and swaps pages inside same-origin iframes.
   Browser/desktop pages remain untouched. */
(function nativeAppShellV76t() {
    if (window.__IPSC_NATIVE_APP_SHELL_V76V) return;
    window.__IPSC_NATIVE_APP_SHELL_V76V = true;

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
        "performance.html": { title: "ELO-Vergleich" }
    };

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
            var morePages = ["freie-matches.html", "schiessbuch.html", "sg-timer-live.html", "tools.html", "analytics.html", "wiederladen.html", "ipsc-hub.html", "doppel-aa.html", "performance.html"];
            var moreActive = morePages.indexOf(file) >= 0;
            var moreBtn = document.getElementById("btn-more-menu");
            if (moreBtn) moreBtn.classList.toggle("active", moreActive);
        } catch (_) {}
    }

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
                var a = event.target && event.target.closest && event.target.closest("a[href]");
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
        heightTimers[key] = window.setInterval(function () {
            if (frame.classList.contains("is-active")) resizeFrame(frame);
        }, 700);
        try {
            var doc = frame.contentDocument;
            if (doc && doc.body && !doc.body.__ipscResizeObserverV76t && window.ResizeObserver) {
                doc.body.__ipscResizeObserverV76t = new ResizeObserver(function () { resizeFrame(frame); });
                doc.body.__ipscResizeObserverV76t.observe(doc.body);
            }
        } catch (_) {}
    }

    function ensureFrame(view) {
        if (frames[view.key]) return frames[view.key];
        var frame = document.createElement("iframe");
        frame.className = "native-shell-frame-v76t";
        frame.dataset.pageKey = view.key;
        frame.title = PAGES[view.file].title || view.file;
        frame.setAttribute("loading", "eager");
        frame.setAttribute("scrolling", "no");
        frame.src = shellUrlFor(view);
        frame.addEventListener("load", function () {
            injectIntoFrame(frame, view.file);
            resizeFrame(frame);
            if (currentKey === view.key) {
                activateFrame(frame, view);
            }
        });
        viewport.appendChild(frame);
        frames[view.key] = frame;
        return frame;
    }

    function routeTo(rawView, opts) {
        opts = opts || {};
        var view = normalizeView(rawView);
        var theme = getTheme();
        applyShellTheme(theme);

        if (!PAGES[view.file]) {
            window.location.href = rawView;
            return;
        }

        currentKey = view.key;
        setActiveChrome(view.file);
        try { sessionStorage.setItem("ipsc_native_shell_view_v76t", view.file); } catch (_) {}

        var frame = ensureFrame(view);
        var frameReady = false;
        try { frameReady = !!(frame.contentDocument && frame.contentDocument.readyState !== "loading"); } catch (_) { frameReady = false; }
        if (frameReady) {
            activateFrame(frame, view);
        } else {
            // V76V: keep the old page visible until the requested page has completed its first paint.
            frame.classList.add("is-preparing");
            setLoading(false);
        }

        var url = "native-shell.html?view=" + encodeURIComponent(view.file + (view.search || "") + (view.hash || ""));
        if (opts.replace) history.replaceState({ view: view.file }, "", url);
        else history.pushState({ view: view.file }, "", url);
    }

    function interceptShellClick(event) {
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
        var warm = ["index.html", "marktplatz.html", "mein-planer.html", "community.html"];
        var i = 0;
        function next() {
            if (i >= warm.length) return;
            var f = warm[i++];
            if (!currentKey || currentKey.indexOf(f) !== 0) {
                try { fetch(f + "?shell=1", { cache: "force-cache" }).catch(function () {}); } catch (_) {}
                try { ensureFrame(normalizeView(f)); } catch (_) {}
            }
            setTimeout(next, 520);
        }
        setTimeout(next, 1200);
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

    function init() {
        document.documentElement.classList.add("ipsc-native-shell-v76t");
        viewport = document.getElementById("native-shell-viewport-v76t");
        loader = document.getElementById("native-shell-loading-v76t");
        if (!viewport) return;
        applyShellTheme(getTheme());
        document.addEventListener("click", interceptShellClick, true);
        document.addEventListener("click", function (event) {
            if (event.target && event.target.closest && event.target.closest("#theme-toggle")) {
                setTimeout(syncThemeToFrames, 60);
                setTimeout(syncThemeToFrames, 240);
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
                        setTimeout(function () {
                            Object.keys(frames).forEach(function (k) {
                                try { frames[k].contentWindow.location.reload(); } catch (_) {}
                            });
                        }, 350);
                    }
                });
            }
        } catch (_) {}
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();

    window.IPSCNativeShellV76v = { routeTo: routeTo, syncTheme: syncThemeToFrames };
    window.IPSCNativeShellV76u = window.IPSCNativeShellV76v;
})();
