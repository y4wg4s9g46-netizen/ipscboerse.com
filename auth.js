// LIGHT THEME FLASH FIX v70
// OAUTH NO RELOAD LOOP v69
// NATIVE OAUTH APPPLUGIN FIX v68
// NATIVE OAUTH BRIDGE FIX v66
// === ZENTRALE SUPABASE KONFIGURATION ===
const SUPABASE_URL = "https://huprxirlthkisjngwash.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yModrA5JZTiN5Cw7MHQqLQ_Coc04WAS";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        experimental: { passkey: true },
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "implicit"
    }
});

window.supabaseClient = supabaseClient;
window.currentUser = null;
window.currentLang = "de";

// Header-Cache gegen Zucken beim Seitenwechsel
const HEADER_USER_CACHE_KEY = "headerUserCache";
const HEADER_AVATAR_CACHE_KEY = "headerAvatar";
const DEFAULT_HEADER_AVATAR = "icon-192.png";

function cacheHeaderUser(user) {
    if (!user) return;

    const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.user_metadata?.profile_picture ||
        DEFAULT_HEADER_AVATAR;

    try {
        localStorage.setItem(HEADER_AVATAR_CACHE_KEY, avatarUrl);
        localStorage.setItem(
            HEADER_USER_CACHE_KEY,
            JSON.stringify({
                email: user.email || "",
                avatar_url: avatarUrl,
                updated_at: Date.now()
            })
        );
    } catch (err) {}
}

function clearHeaderUserCache() {
    try {
        localStorage.removeItem(HEADER_USER_CACHE_KEY);
        localStorage.removeItem(HEADER_AVATAR_CACHE_KEY);
    } catch (err) {}
}

function markHeaderReady() {
    const mainHeader = document.querySelector("header");
    if (mainHeader) {
        mainHeader.classList.add("auth-ready");
    }
}

window.uploadImage = async function(file, folder) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await window.supabaseClient.storage
        .from('images')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = window.supabaseClient.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
};

// --- PASSKEY FUNKTIONEN ---
window.loginWithPasskey = async function() {
    // v79q: Passkey/Face ID in der App aktiv lassen. Kein lokaler "später"-Block mehr.
    const btn = document.querySelector('#modal-login-view button[onclick="loginWithPasskey()"]');
    const oldHtml = btn ? btn.innerHTML : "";
    if (btn) btn.innerHTML = "⏳ Warte auf Sensor...";

    const { data, error } = await window.supabaseClient.auth.signInWithPasskey();

    if (error) {
        if (btn) btn.innerHTML = oldHtml;
        alert("Passkey-Login fehlgeschlagen oder abgebrochen: " + error.message);
    } else {
        if (data?.session?.user) cacheHeaderUser(data.session.user);
        const loggedInUser = data?.session?.user || window.currentUser || null;
        if (btn) btn.innerHTML = "✅ Erfolgreich!";
        if (document.body && (document.body.classList.contains("page-native-shell") || document.body.classList.contains("page-app-spa"))) {
            try {
                closeAuthModalAfterLoginV78e(loggedInUser);
                window.dispatchEvent(new CustomEvent("ipsc:oauth-login-complete", { detail: { user: loggedInUser } }));
            } catch (_) {}
        } else {
            location.reload();
        }
    }
};

window.registerPasskey = async function() {
    // v79q: Passkey-Registrierung in der App aktiv lassen. Kein lokaler "später"-Block mehr.
    const btn = document.querySelector('#modal-settings-view button[onclick="registerPasskey()"]');
    const oldHtml = btn ? btn.innerHTML : "";
    if (btn) btn.innerHTML = "⏳ Bitte Sensor berühren...";

    const { data, error = null } = await window.supabaseClient.auth.registerPasskey();

    if (error) {
        if (btn) btn.innerHTML = oldHtml;
        alert("Fehler bei der Passkey-Registrierung: " + error.message);
    } else {
        if (btn) {
            btn.innerHTML = "✅ Gerät erfolgreich als Passkey hinterlegt!";
            btn.style.backgroundColor = "#10b981";
        }
    }
};

// --- SOCIAL LOGIN FUNKTIONEN (GOOGLE & APPLE) ---
const OAUTH_RETURN_KEY = "ipscOAuthReturnPath";

function getOAuthRedirectUrl() {
    /*
      Für Supabase Social Login muss redirectTo in der Supabase Redirect-Allowlist stehen.
      Wir bleiben bewusst auf der aktuellen statischen Seite, damit der Nutzer nach Google/Apple
      nicht immer auf index.html zurückfällt.
    */
    let path = window.location.pathname || "/index.html";

    if (path === "/") path = "/index.html";

    return `${window.location.origin}${path}`;
}




// NATIVE OAUTH CALLBACK BRIDGE v66
const NATIVE_OAUTH_CALLBACK_URL = "ipscboerse://auth-callback";
const WEB_OAUTH_CALLBACK_URL = "https://ipscboerse.com/auth-callback.html";
const WEB_APP_SPA_URL_V78 = "https://ipscboerse.com/app.html";

function isNativeShellV66() {
    try {
        return !!(
            (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()) ||
            window.location.protocol === "capacitor:" ||
            window.location.protocol === "ionic:" ||
            document.documentElement.classList.contains("is-native-shell") ||
            document.documentElement.classList.contains("ipsc-native-shell-v76t") ||
            document.body.classList.contains("is-app-shell") ||
            document.body.classList.contains("page-native-shell")
        );
    } catch (_) {
        return false;
    }
}

function getCapacitorPluginV66(name) {
    try {
        return window.Capacitor?.Plugins?.[name] || null;
    } catch (_) {
        return null;
    }
}

function getOAuthRedirectUrlV66() {
    return isNativeShellV66() ? WEB_OAUTH_CALLBACK_URL : getOAuthRedirectUrl();
}

async function closeNativeOAuthBrowserV66() {
    try {
        const Browser = getCapacitorPluginV66("Browser");
        if (Browser && typeof Browser.close === "function") await Browser.close();
    } catch (_) {}
}

async function updateUiAfterOAuthV66(session) {
    try {
        if (session?.user) {
            window.currentUser = session.user;
            cacheHeaderUser(session.user);
        }

        const modal = document.getElementById("auth-modal");
        if (modal) {
            modal.style.display = "none";
            modal.classList.remove("open", "active", "show");
            modal.setAttribute("aria-hidden", "true");
        }

        document.body.classList.remove("auth-open", "modal-open");

        if (typeof updateAuthUI === "function") updateAuthUI(session?.user || window.currentUser || null);
        if (typeof window.onAuthChange === "function") window.onAuthChange(session?.user || window.currentUser || null);
        if (typeof syncHeaderAuthState === "function") syncHeaderAuthState();
        if (typeof closeAuthModalAfterLoginV78e === "function") closeAuthModalAfterLoginV78e(session?.user || window.currentUser || null);

        const returnPath = localStorage.getItem(OAUTH_RETURN_KEY);
        localStorage.removeItem(OAUTH_RETURN_KEY);
        try { if (window.IPSCAppV78 && typeof window.IPSCAppV78.refresh === "function") setTimeout(function(){ window.IPSCAppV78.refresh(); }, 120); } catch (_) {}

        const currentPath = `${window.location.pathname || "/index.html"}${window.location.search || ""}`;
        const isCallbackPage = /auth-callback\.html/i.test(window.location.pathname || "");

        // v77d: In der lokalen Native-Shell niemals nach OAuth hart routen oder Frames neu laden.
        // Die aktuelle Ansicht bleibt sichtbar; nur Header, Modal und geladene Frames bekommen den Auth-Status.
        if (document.body && document.body.classList.contains("page-native-shell")) {
            try {
                if (history && history.replaceState && /auth-callback/i.test(window.location.href)) {
                    history.replaceState(null, "", "native-shell.html?view=index.html");
                }
                const shell = window.IPSCNativeShellV77e || window.IPSCNativeShellV77d || window.IPSCNativeShellV77c || window.IPSCNativeShellV77b;
                if (shell && typeof shell.broadcastAuth === "function") shell.broadcastAuth("SIGNED_IN");
                if (shell && typeof shell.syncTheme === "function") shell.syncTheme();
            } catch (_) {}
        } else if (returnPath && returnPath !== currentPath && !isCallbackPage) {
            history.replaceState(null, "", returnPath);
        }

        try {
            const appleBtn = document.querySelector(".btn-social-apple");
            const googleBtn = document.querySelector(".btn-social-google");
            [appleBtn, googleBtn].forEach(btn => {
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove("loading", "is-loading");
                    const original = btn.getAttribute("data-original-text");
                    if (original) btn.textContent = original;
                }
            });
        } catch (_) {}

        window.dispatchEvent(new CustomEvent("ipsc:oauth-login-complete", { detail: { user: session?.user || window.currentUser || null } }));
    } catch (err) {
        console.warn("OAuth UI update failed", err);
    }
}



function markOAuthUrlHandledV69(urlString, code, accessToken) {
    try {
        const keyMaterial = code || accessToken || String(urlString).slice(0, 240);
        const sessionKey = "ipsc.oauth.handled.v69";
        const persistentKey = "ipsc.oauth.handled.v76k";
        const now = Date.now();
        const isRecent = (entry, ttlMs) => entry && entry.keyMaterial === keyMaterial && now - Number(entry.time || 0) < ttlMs;
        const lastSession = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
        const lastPersistent = JSON.parse(localStorage.getItem(persistentKey) || "null");

        // V76K: App.getLaunchUrl kann nach App-Pause/Neustart denselben OAuth-Link erneut liefern.
        // SessionStorage reicht dann nicht; persistente Dedupe verhindert den „Auth session missing"-Dialog.
        if (isRecent(lastSession, 120000) || isRecent(lastPersistent, 86400000)) {
            return false;
        }

        const payload = JSON.stringify({ keyMaterial, time: now });
        sessionStorage.setItem(sessionKey, payload);
        localStorage.setItem(persistentKey, payload);
        return true;
    } catch (_) {
        return true;
    }
}

async function handleNativeOAuthUrlV66(url) {
    if (!url || window.__ipscHandlingNativeOAuthV66) return false;
    const urlString = String(url);
    if (!urlString.startsWith("ipscboerse://")) return false;

    window.__ipscHandlingNativeOAuthV66 = true;

    try {
        const parsed = new URL(urlString);
        const hashParams = new URLSearchParams((parsed.hash || "").replace(/^#/, ""));
        const queryParams = new URLSearchParams((parsed.search || "").replace(/^\?/, ""));

        const errorDescription =
            hashParams.get("error_description") ||
            queryParams.get("error_description") ||
            hashParams.get("error") ||
            queryParams.get("error");

        if (errorDescription) {
            await closeNativeOAuthBrowserV66();
            alert("Login abgebrochen oder fehlgeschlagen: " + decodeURIComponent(errorDescription));
            return true;
        }

        const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
        const code = queryParams.get("code") || hashParams.get("code");

        if (!markOAuthUrlHandledV69(urlString, code, accessToken)) {
            console.info("Duplicate OAuth callback ignored v69");
            await closeNativeOAuthBrowserV66();
            return true;
        }

        let session = null;

        if (accessToken && refreshToken) {
            const { data, error } = await window.supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            if (error) throw error;
            session = data?.session || null;
        } else if (code && window.supabaseClient.auth.exchangeCodeForSession) {
            const { data, error } = await window.supabaseClient.auth.exchangeCodeForSession(code);
            if (error) throw error;
            session = data?.session || null;
        } else {
            const { data } = await window.supabaseClient.auth.getSession();
            session = data?.session || null;
            if (!session) throw new Error("Keine OAuth-Session im App-Link gefunden.");
        }

        await closeNativeOAuthBrowserV66();
        await updateUiAfterOAuthV66(session);
        return true;
    } catch (err) {
        console.error("Native OAuth callback failed:", err);
        await closeNativeOAuthBrowserV66();

        const message = String(err?.message || err || "");
        const staleOrConsumedCode = /auth session missing|session missing|flow state|code verifier|invalid.*code|expired/i.test(message);
        if (staleOrConsumedCode) {
            try {
                const { data } = await window.supabaseClient.auth.getSession();
                if (data?.session) await updateUiAfterOAuthV66(data.session);
            } catch (_) {}
            console.info("Stale native OAuth callback ignored v76k:", message);
            return true;
        }

        alert("App-Login konnte nicht abgeschlossen werden: " + (err.message || err));
        return false;
    } finally {
        setTimeout(() => {
            window.__ipscHandlingNativeOAuthV66 = false;
        }, 900);
    }
}

async function initNativeOAuthReturnListenerV66() {
    if (window.__ipscNativeOAuthListenerV66Installed) return;
    window.__ipscNativeOAuthListenerV66Installed = true;

    const App = getCapacitorPluginV66("App");

    if (App && typeof App.addListener === "function") {
        try {
            App.addListener("appUrlOpen", async (event) => {
                await handleNativeOAuthUrlV66(event?.url || "");
            });
        } catch (err) {
            console.warn("Native OAuth appUrlOpen listener failed:", err);
        }

        try {
            App.addListener("resume", async () => {
                try {
                    const { data } = await window.supabaseClient.auth.getSession();
                    if (data?.session?.user && !window.currentUser) {
                        await updateUiAfterOAuthV66(data.session);
                    }
                } catch (_) {}
            });
        } catch (_) {}
    }

    if (App && typeof App.getLaunchUrl === "function" && !window.__ipscLaunchUrlCheckedV69) {
        window.__ipscLaunchUrlCheckedV69 = true;
        try {
            const launch = await App.getLaunchUrl();
            if (launch?.url) await handleNativeOAuthUrlV66(launch.url);
        } catch (_) {}
    }
}

setTimeout(initNativeOAuthReturnListenerV66, 80);
document.addEventListener("DOMContentLoaded", initNativeOAuthReturnListenerV66, { once: true });
// END NATIVE OAUTH CALLBACK BRIDGE v66


function setSocialButtonLoading(provider, isLoading) {
    const selectors = {
        google: '.btn-social-google, button[onclick="loginWithGoogle()"]',
        apple: '.btn-social-apple, button[onclick="loginWithApple()"]'
    };

    const btn = document.querySelector(selectors[provider]);
    if (!btn) return;

    if (isLoading) {
        if (!btn.dataset.oldHtml) btn.dataset.oldHtml = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add("is-oauth-loading");
        btn.innerHTML = provider === "google"
            ? "⏳ Google wird geöffnet..."
            : "⏳ Apple wird geöffnet...";
    } else {
        btn.disabled = false;
        btn.classList.remove("is-oauth-loading");
        if (btn.dataset.oldHtml) {
            btn.innerHTML = btn.dataset.oldHtml;
            delete btn.dataset.oldHtml;
        }
    }
}

async function startSocialOAuth(provider) {
    if (!window.supabaseClient?.auth?.signInWithOAuth) {
        alert("Login ist noch nicht bereit. Bitte Seite kurz neu laden.");
        return;
    }

    setSocialButtonLoading(provider, true);
    console.info("Starting social OAuth", provider, getOAuthRedirectUrlV66());

    try {
        const returnPath = `${window.location.pathname || "/index.html"}${window.location.search || ""}`;
        localStorage.setItem(OAUTH_RETURN_KEY, returnPath);

        const isNativeOAuth = isNativeShellV66();
        const options = {
            redirectTo: getOAuthRedirectUrlV66()
        };

        if (isNativeOAuth) {
            options.skipBrowserRedirect = true;
        }

        if (provider === "google") {
            options.scopes = "openid email profile";
            options.queryParams = {
                prompt: "select_account"
            };
        }

        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
            provider,
            options
        });

        if (error) throw error;

        if (isNativeOAuth && data?.url) {
            const Browser = getCapacitorPluginV66("Browser");

            if (Browser && typeof Browser.open === "function") {
                await Browser.open({
                    url: data.url,
                    presentationStyle: "fullscreen",
                    windowName: "_blank"
                });
            } else {
                window.location.href = data.url;
            }
        }

    } catch (error) {
        console.error(`${provider} OAuth error:`, error);
        setSocialButtonLoading(provider, false);

        const providerName = provider === "google" ? "Google" : "Apple";
        alert(`${providerName}-Login fehlgeschlagen: ${error.message || error}`);
    }
}

async function settleOAuthSessionIfPresentV47() {
    /*
      v47: Kein manueller exchangeCodeForSession mehr.
      Supabase soll die OAuth-Rückkehr selbst auswerten.
      Wir warten nur kurz und lesen dann die Session nach, damit Header/Avatar sicher aktualisieren.
    */
    const hasOAuthReturn =
        window.location.hash.includes("access_token") ||
        window.location.hash.includes("refresh_token") ||
        window.location.search.includes("code=") ||
        window.location.search.includes("error=") ||
        window.location.search.includes("error_description=");

    if (!hasOAuthReturn) return null;

    await new Promise(resolve => setTimeout(resolve, 450));

    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (session?.user) {
        window.currentUser = session.user;
        cacheHeaderUser(session.user);
        cleanOAuthUrlIfNeeded();
        return session;
    }

    return null;
}

function cleanOAuthUrlIfNeeded() {
    try {
        const hasOAuthQuery =
            window.location.search.includes("code=") ||
            window.location.search.includes("error=") ||
            window.location.search.includes("error_description=");

        const hasOAuthHash =
            window.location.hash.includes("access_token") ||
            window.location.hash.includes("refresh_token") ||
            window.location.hash.includes("error_description");

        if ((hasOAuthQuery || hasOAuthHash) && window.history?.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (err) {}
}

window.loginWithGoogle = async function() {
    await startSocialOAuth("google");
};

window.loginWithApple = async function() {
    await startSocialOAuth("apple");
};

// --- DESIGN SCHALTER LOGIK (LIGHT / DARK MODE) ---
function updateThemeToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    let effectiveTheme = theme;
    if (!effectiveTheme || effectiveTheme === 'auto') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    btn.dataset.themeState = effectiveTheme;
    btn.setAttribute(
        'aria-label',
        effectiveTheme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'
    );
    btn.title = effectiveTheme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren';

    // Wichtig: Wenn header.js ein SVG eingefügt hat, wird es nicht mehr durch Text ersetzt.
    // Dadurch zuckt der Theme-Button beim Seitenwechsel nicht.
    if (!btn.querySelector('svg')) {
        btn.innerText = effectiveTheme === 'dark' ? '☀️' : '🌙';
    }
}

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme = 'light';

    if (!currentTheme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        newTheme = prefersDark ? 'light' : 'dark';
    } else {
        newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    }

    document.documentElement.classList.add('is-theme-switching-v70');
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.style.backgroundColor = newTheme === 'dark' ? '#0f172a' : '#f6f8fc';
    document.documentElement.style.colorScheme = newTheme === 'dark' ? 'dark' : 'light';
    if (document.body) document.body.style.backgroundColor = newTheme === 'dark' ? '#0f172a' : '#f6f8fc';

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', newTheme === 'dark' ? '#0f172a' : '#f6f8fc');

    window.__IPSC_ACTIVE_THEME_V70 = newTheme;

    localStorage.setItem('selectedTheme', newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('ipsc_effective_theme', newTheme);
    try { sessionStorage.setItem('ipsc_effective_theme', newTheme); sessionStorage.setItem('ipsc_nav_theme_v76s', newTheme); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('ipsc:theme-change-v78d', { detail: { theme: newTheme } })); } catch (_) {}
    updateThemeToggleIcon(newTheme);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('is-theme-switching-v70');
        });
    });
};

function initTheme() {
    const savedThemeRaw = localStorage.getItem('selectedTheme') || localStorage.getItem('theme') || localStorage.getItem('ipsc_effective_theme');
    let effectiveTheme = savedThemeRaw || 'light';

    if (effectiveTheme === 'auto') {
        // V76P: In der nativen App nicht zuerst dunkel rendern und danach hell korrigieren.
        effectiveTheme = localStorage.getItem('ipsc_effective_theme') || 'light';
    }
    if (effectiveTheme !== 'dark') effectiveTheme = 'light';

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.style.backgroundColor = effectiveTheme === 'dark' ? '#0f172a' : '#f6f8fc';
    document.documentElement.style.colorScheme = effectiveTheme;
    if (document.body) document.body.style.backgroundColor = effectiveTheme === 'dark' ? '#0f172a' : '#f6f8fc';
    window.__IPSC_ACTIVE_THEME_V70 = effectiveTheme;
    window.__IPSC_ACTIVE_THEME_V74 = effectiveTheme;
    try { localStorage.setItem('ipsc_effective_theme', effectiveTheme); } catch (_) {}
    updateThemeToggleIcon(savedThemeRaw || effectiveTheme);
}

// ==========================================

window.translations = {
  de: {
    "main-title": "IPSC STARTPLATZ-BÖRSE",
    "sub-title": "Von Schützen für Schützen",
    "btn-login-reg": "Login / Registrieren",
    "logout": "Abmelden",
    "btn-logout": "Abmelden",
    "info-msg": "<strong>Wichtiger Hinweis:</strong> Diese Plattform dient nur der Vermittlung. Die endgültige Umschreibung des Startplatzes muss zwingend über den jeweiligen Match Director durchgeführt werden!",
    "form-title": "Eintrag erstellen",
    "form-title-edit": "Eintrag bearbeiten ✏️",
    "opt-offer": "Ich BIETE einen Startplatz an",
    "opt-want": "Ich SUCHE einen Startplatz",
    "lbl-name": "Name des Matches *",
    "lbl-level": "Match Level *",
    "lbl-date": "Datum des Matches *",
    "lbl-location": "Austragungsort (Stand) *",
    "lbl-country": "Land *",
    "lbl-squad": "Squad Nummer (Optional)",
    "lbl-price": "Abgabepreis (€) *",
    "lbl-email": "Deine E-Mail-Adresse *",
    "btn-insert": "Eintrag kostenlos veröffentlichen",
    "btn-save-edit": "Änderungen speichern",
    "btn-cancel": "Abbrechen",
    "filter-type": "Anzeigentyp:",
    "filter-all": "Alle Anzeigen",
    "filter-offers": "Nur Angebote (Biete)",
    "filter-wants": "Nur Gesuche (Suche)",
    "list-title": "Aktuelle Marktplatz-Einträge",
    "loading": "Lade aktuelle Startplätze...",
    "modal-login-title": "Anmelden",
    "modal-btn-login": "Einloggen",
    "modal-no-acc": "Noch kein Konto?",
    "modal-link-reg": "Registrieren",
    "modal-reg-title": "Konto erstellen",
    "modal-btn-reg": "Konto erstellen",
    "modal-has-acc": "Bereits registriert?",
    "modal-link-login": "Zum Login",
    "footer-impressum-link": "Impressum & Rechtliche Hinweise",
    "no-slots": "Aktuell keine Einträge verfügbar.",
    "btn-request": "Anbieter kontaktieren",
    "btn-contact-want": "Schützen kontaktieren",
    "btn-delete": "Löschen",
    "btn-edit": "Bearbeiten",
    "btn-export": "Export (.ics)",
    "report-btn": "Melden",
    "buy-coffee": "Kaffee spendieren",
    "social-proof": "Erfolgreich vermittelte Startplätze: ",
    "login-required": "Nur eingeloggte Nutzer können kontaktieren",
    "security-checklist": "\n\nSicherheits-Checkliste vor der E-Mail:\n- Match-Daten geprüft?\n- Match Director kontaktiert?",
    "tag-offer": "BIETE",
    "tag-want": "SUCHE",
    "link-forgot-pwd": "Passwort vergessen?",
    "modal-forgot-title": "Passwort vergessen",
    "modal-btn-forgot": "Zurücksetzungs-Link senden",
    "modal-reset-title": "Neues Passwort vergeben",
    "lbl-new-password": "Neues Passwort *",
    "btn-save": "Änderungen speichern",
    "modal-settings-title": "Konto-Einstellungen",
    "lbl-username": "Schützenname / Anzeigename",
    "btn-delete-acc": "Konto & alle Einträge unwiderruflich löschen",
    "email-subject-offer": "Interesse an deinem IPSC Startplatz: ",
    "email-subject-want": "Bezüglich deiner Suche nach einem IPSC Startplatz: ",
    "email-body-offer": "Hallo,\n\nich habe dein Inserat auf ipscboerse.com gesehen und interessiere mich für den von dir angebotenen Startplatz für das Match: ",
    "email-body-want": "Hallo,\n\nich habe dein Gesuch auf ipscboerse.com gesehen. Ich hätte einen Startplatz abzugeben für das Match: ",
    "email-body-footer": "\n\nIst das Inserat noch aktuell?\n\nViele Grüße",
    "security-notice": "⚠️ WICHTIGER SICHERHEITSHINWEIS:\n\n1. Nutze für Zahlungen IMMER PayPal mit Käuferschutz (niemals 'Freunde & Familie').\n2. Kontaktiere ZWINGEND den Match Director, BEVOR du Geld sendest, um zu prüfen, ob eine Umschreibung des Platzes überhaupt noch möglich ist!\n\nMöchtest du den E-Mail-Kontakt jetzt öffnen?",
    "spam-error": "Spam-Schutz: Du hast bereits einen Eintrag für dieses Match an diesem Datum erstellt!",

    "nav-marketplace": "Marktplatz",
    "nav-free-slots": "Matches",
    "nav-my-planner": "Mein Planer",
    "nav-community": "Community",
    "planner-logged-out-title": "Nicht angemeldet",
    "planner-logged-out-desc": "Logge dich ein, um deine Matches zu verwalten und in die Cloud zu synchronisieren.",
    "planner-logged-out-btn": "Jetzt einloggen",
    "planner-title-my-matches": "Meine Matches",
    "planner-subtitle-new": "Neues Match eintragen",
    "planner-lbl-match-name": "Match-Name",
    "planner-lbl-match-date": "Datum",
    "planner-lbl-match-location": "Ort / Land",
    "planner-btn-save": "Match in Cloud speichern",
    "planner-subtitle-planned": "Geplante Matches",
    "planner-loading": "Lade Daten aus Supabase...",
    "planner-btn-export": "📅 In Kalender exportieren (.ics)",

    "free-info-box": "<strong>Info:</strong> Die Matches werden automatisch im Hintergrund aktualisiert. Es werden nur Turniere angezeigt, die eine Auslastung von unter 100% aufweisen (freie Startplätze).",
    "free-list-title": "Verfügbare Matches auf MatchSign (Auslastung < 100%)",
    "free-all-countries": "Alle Länder",
    "free-all-disciplines": "Alle Disziplinen",
    "free-all-levels": "Alle Level",
    "free-loading": "Lade aktuelle Matches...",

    "comm-title": "COMMUNITY FEED",
    "tab-posts": "Beiträge",
    "tab-groups": "Gruppen",
    "comm-logged-out-title": "Werde Teil der Community",
    "comm-logged-out-desc": "Bitte logge dich ein, um Beiträge zu lesen und mit anderen Schützen zu diskutieren.",
    "comm-logged-out-btn": "Jetzt einloggen",
    "comm-setup-title": "Wähle deinen Schützennamen",
    "comm-setup-desc": "Bevor du in der Community starten kannst, wähle bitte einen Schützennamen / Anzeigenamen (z.B. IPSCShooter99).",
    "comm-setup-btn": "Namen speichern & starten",
    "comm-loading": "Lade Beiträge...",
    "fab-create-post": "+ Beitrag erstellen",
    "modal-new-post": "Neuer Beitrag",
    "lbl-add-photo": "Foto hinzufügen (Optional)",
    "btn-share-post": "Teilen",
    "comm-groups-coming": "Gruppen-Funktion (Coming Soon)",
    "comm-groups-desc": "Hier wirst du bald private Squad-Gruppen oder Vereins-Kanäle erstellen können."
  },
  en: {
    "main-title": "IPSC SLOT MARKETPLACE",
    "sub-title": "By Shooters for Shooters",
    "btn-login-reg": "Login / Register",
    "logout": "Logout",
    "btn-logout": "Logout",
    "info-msg": "<strong>Important Notice:</strong> This platform only serves as a mediator. The final transfer of the slot must be processed by the respective Match Director!",
    "form-title": "Create Entry",
    "form-title-edit": "Edit Entry ✏️",
    "opt-offer": "I OFFER a slot",
    "opt-want": "I AM LOOKING FOR a slot",
    "lbl-name": "Match Name *",
    "lbl-level": "Match Level *",
    "lbl-date": "Match Date *",
    "lbl-location": "Location (Range) *",
    "lbl-country": "Country *",
    "lbl-squad": "Squad Number (Optional)",
    "lbl-price": "Price (€) *",
    "lbl-email": "Your Email Address *",
    "btn-insert": "Publish Entry for Free",
    "btn-save-edit": "Save Changes",
    "btn-cancel": "Cancel",
    "filter-type": "Ad Type:",
    "filter-all": "All Ads",
    "filter-offers": "Offers Only",
    "filter-wants": "Wants Only",
    "list-title": "Current Marketplace Entries",
    "loading": "Loading current slots...",
    "modal-login-title": "Login",
    "modal-btn-login": "Login",
    "modal-no-acc": "Don't have an account?",
    "modal-link-reg": "Register",
    "modal-reg-title": "Create Account",
    "modal-btn-reg": "Create Account",
    "modal-has-acc": "Already registered?",
    "modal-link-login": "Go to Login",
    "footer-impressum-link": "Imprint & Legal Notices",
    "no-slots": "No marketplace entries available.",
    "btn-request": "Contact Seller",
    "btn-contact-want": "Contact Shooter",
    "btn-delete": "Delete",
    "btn-edit": "Edit",
    "btn-export": "Export (.ics)",
    "report-btn": "Report",
    "buy-coffee": "Buy me a coffee",
    "social-proof": "Successfully mediated slots: ",
    "login-required": "Only logged-in users can contact",
    "security-checklist": "\n\nSecurity checklist before email:\n- Match details verified?\n- Match Director contacted?",
    "tag-offer": "OFFER",
    "tag-want": "WANTED",
    "link-forgot-pwd": "Forgot password?",
    "modal-forgot-title": "Reset Password",
    "modal-btn-forgot": "Send Reset Link",
    "modal-reset-title": "Set New Password",
    "lbl-new-password": "New Password *",
    "btn-save": "Save Changes",
    "modal-settings-title": "Account Settings",
    "lbl-username": "Shooter / Display Name",
    "btn-delete-acc": "Permanently Delete Account & Postings",
    "email-subject-offer": "Inquiry regarding your IPSC slot: ",
    "email-subject-want": "Regarding your request for an IPSC slot: ",
    "email-body-offer": "Hello,\n\nI saw your listing on ipscboerse.com and I am interested in the slot you offered for the match: ",
    "email-body-want": "Hello,\n\nI saw your request on ipscboerse.com. I have an available slot to give away for the match: ",
    "email-body-footer": "\n\nIs this listing still available?\n\nBest regards",
    "security-notice": "⚠️ IMPORTANT SAFETY NOTICE:\n\n1. ALWAYS use PayPal with Buyer Protection for payments (never use 'Friends & Family').\n2. You MUST contact the Match Director BEFORE making any payment to confirm if a slot transfer is still permitted!\n\nDo you want to open the email client now?",
    "grid-error": "Spam protection: You have already posted an entry for this match on this date!",

    "nav-marketplace": "Marketplace",
    "nav-free-slots": "Free Match Slots",
    "nav-my-planner": "My Planner",
    "nav-community": "Community",
    "planner-logged-out-title": "Not logged in",
    "planner-logged-out-desc": "Log in to manage your matches and sync them to the cloud.",
    "planner-logged-out-btn": "Log in now",
    "planner-title-my-matches": "Mine Matches",
    "planner-subtitle-new": "Add New Match",
    "planner-lbl-match-name": "Match Name",
    "planner-lbl-match-date": "Date",
    "planner-lbl-match-location": "Location / Country",
    "planner-btn-save": "Save Match to Cloud",
    "planner-subtitle-planned": "Planned Matches",
    "planner-loading": "Loading data from Supabase...",
    "planner-btn-export": "📅 Export to Calendar (.ics)",

    "free-info-box": "<strong>Info:</strong> The matches are automatically updated in the background. Only tournaments with a capacity under 100% are displayed (available slots).",
    "free-list-title": "Matches on MatchSign (Capacity < 100%)",
    "free-all-countries": "All Countries",
    "free-all-disciplines": "All Disciplines",
    "free-all-levels": "All Levels",
    "free-loading": "Loading current matches...",

    "comm-title": "COMMUNITY FEED",
    "tab-posts": "Posts",
    "tab-groups": "Groups",
    "comm-logged-out-title": "Join the Community",
    "comm-logged-out-desc": "Please log in to read posts and discuss with other shooters.",
    "comm-logged-out-btn": "Log in now",
    "comm-setup-title": "Choose your Shooter Name",
    "comm-setup-desc": "Before starting in the community, please choose a shooter name / display name (e.g., IPSCShooter99).",
    "comm-setup-btn": "Save Name & Start",
    "comm-loading": "Loading posts...",
    "fab-create-post": "+ Create Post",
    "modal-new-post": "New Post",
    "lbl-add-photo": "Add Photo (Optional)",
    "btn-share-post": "Share",
    "comm-groups-coming": "Groups Feature (Coming Soon)",
    "comm-groups-desc": "Here you will soon be able to create private squad groups or club channels."
  }
};

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
window.escapeHtml = escapeHtml;

function applyLanguage(lang) {
  window.currentLang = lang;
  localStorage.setItem("selectedLanguage", lang);

  document.querySelectorAll("[data-txt]").forEach(el => {
    const key = el.getAttribute("data-txt");

    if (window.translations[lang] && window.translations[lang][key]) {
      if (key === "form-title" && window.editingMatchId !== undefined && window.editingMatchId !== null) return;
      if (key === "btn-insert" && window.editingMatchId !== undefined && window.editingMatchId !== null) return;

      el.innerHTML = window.translations[lang][key];
    }
  });

  const levelSelect = document.getElementById("match-level");
  if (levelSelect) {
    const currentVal = levelSelect.value;
    const defaultText = lang === "en" ? "Please select..." : "Bitte wählen...";
    levelSelect.innerHTML = `<option value="">${defaultText}</option><option value="Level I">Level I</option><option value="Level II">Level II</option><option value="Level III">Level III</option>`;
    levelSelect.value = currentVal;
  }

  if (typeof window.onLanguageChanged === "function") {
    window.onLanguageChanged(lang);
  }
}

function showHeaderElement(el, displayType = "inline-flex") {
  if (!el) return;
  el.style.setProperty("display", displayType, "important");
}

function hideHeaderElement(el) {
  if (!el) return;
  el.style.setProperty("display", "none", "important");
}

async function checkUserStatus() {
  const container = document.getElementById("auth-status-container");
  const emailField = document.getElementById("seller-email");
  const user = window.currentUser;

  const loginBtn = document.getElementById("btn-open-login");
  const profileBtn = document.getElementById("btn-open-settings");
  const logoutBtn = document.getElementById("btn-logout");
  const avatarImg = document.getElementById("header-avatar");

  if (user) {
    const displayName = user.user_metadata?.username || user.email.split("@")[0];

    const avatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      user.user_metadata?.profile_picture ||
      DEFAULT_HEADER_AVATAR;

    if (container) {
      container.dataset.authState = "in";
    }

    hideHeaderElement(loginBtn);
    showHeaderElement(profileBtn);
    showHeaderElement(logoutBtn);

    if (profileBtn) {
      profileBtn.title = displayName;
      profileBtn.setAttribute("aria-label", "Profil öffnen");
    }

    if (logoutBtn) {
      logoutBtn.innerHTML =
        window.translations?.[window.currentLang]?.["btn-logout"] ||
        "Abmelden";
    }

    if (avatarImg && avatarImg.getAttribute("src") !== avatarUrl) {
      avatarImg.setAttribute("src", avatarUrl);
    }

    cacheHeaderUser(user);

    if (emailField) {
      emailField.value = user.email;
      emailField.readOnly = true;
    }

  } else {
    if (container) {
      container.dataset.authState = "out";
    }

    showHeaderElement(loginBtn);
    hideHeaderElement(profileBtn);
    hideHeaderElement(logoutBtn);

    if (loginBtn) {
      loginBtn.innerHTML =
        window.translations?.[window.currentLang]?.["btn-login-reg"] ||
        "Login / Registrieren";
    }

    if (avatarImg) {
      avatarImg.setAttribute("src", DEFAULT_HEADER_AVATAR);
    }

    clearHeaderUserCache();

    if (emailField) {
      emailField.value = "";
      emailField.placeholder = "Logge dich ein, um zu inserieren";
      emailField.readOnly = false;
    }
  }

  markHeaderReady();
}

function toggleAuthView(view) {
  if(document.getElementById("modal-login-view")) document.getElementById("modal-login-view").style.display = view === "login" ? "block" : "none";
  if(document.getElementById("modal-register-view")) document.getElementById("modal-register-view").style.display = view === "register" ? "block" : "none";
  if(document.getElementById("modal-forgot-view")) document.getElementById("modal-forgot-view").style.display = view === "forgot" ? "block" : "none";
  if(document.getElementById("modal-reset-view")) document.getElementById("modal-reset-view").style.display = view === "reset-password" ? "block" : "none";
  if(document.getElementById("modal-settings-view")) document.getElementById("modal-settings-view").style.display = view === "settings" ? "block" : "none";
}
window.toggleAuthView = toggleAuthView;


// V78H: Re-open auth modal robustly after v78e closes it with important hidden styles.
function showAuthModalV78h(view) {
    try {
        const modal = document.getElementById("auth-modal");
        if (!modal) return false;
        modal.style.setProperty("display", "flex", "important");
        modal.style.setProperty("visibility", "visible", "important");
        modal.style.setProperty("opacity", "1", "important");
        modal.style.setProperty("pointer-events", "auto", "important");
        modal.removeAttribute("aria-hidden");
        modal.classList.add("show", "is-open");
        document.body.classList.add("auth-open", "modal-open");
        document.documentElement.classList.add("auth-open", "modal-open");
        if (typeof resetAuthProviderButtonsV78e === "function") resetAuthProviderButtonsV78e();
        if (typeof toggleAuthView === "function") toggleAuthView(view || "login");
        return true;
    } catch (_) { return false; }
}
window.showAuthModalV78h = showAuthModalV78h;

// V78E: Central app-login completion cleanup.
// In the remote app shell (https://ipscboerse.com/app.html) OAuth/Passkey may complete without a hard reload.
// The modal must close reliably and provider buttons must not remain in "wird geöffnet" / "Erfolgreich" states.
function resetAuthProviderButtonsV78e() {
    try {
        const lang = window.currentLang === "en" ? "en" : "de";
        const labels = {
            passkey: lang === "en" ? "Continue with Face ID / Passkey" : "Mit Face ID / Passkey fortfahren",
            apple: lang === "en" ? "Sign in with Apple" : "Mit Apple anmelden",
            google: lang === "en" ? "Sign in with Google" : "Mit Google anmelden"
        };
        const passkeyBtn = document.querySelector('#auth-modal .btn-social-passkey, #modal-login-view button[onclick="loginWithPasskey()"]');
        const appleBtn = document.querySelector('#auth-modal .btn-social-apple, #modal-login-view button[onclick="loginWithApple()"]');
        const googleBtn = document.querySelector('#auth-modal .btn-social-google, #modal-login-view button[onclick="loginWithGoogle()"]');
        [[passkeyBtn, labels.passkey], [appleBtn, labels.apple], [googleBtn, labels.google]].forEach(([btn, label]) => {
            if (!btn) return;
            btn.disabled = false;
            btn.classList.remove("loading", "is-loading", "is-oauth-loading");
            btn.style.removeProperty("background-color");
            btn.style.removeProperty("color");
            const span = btn.querySelector("span[data-txt]");
            if (span) span.textContent = label;
            else if (btn.dataset.oldHtml) btn.innerHTML = btn.dataset.oldHtml;
            if (btn.dataset.oldHtml) delete btn.dataset.oldHtml;
        });
        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = (window.translations?.[lang]?.["modal-btn-login"] || (lang === "en" ? "Login" : "Einloggen"));
        try { if (typeof translatePortalPage === "function") translatePortalPage(); } catch (_) {}
    } catch (_) {}
}

function closeAuthModalAfterLoginV78e(user) {
    try {
        if (user) {
            window.currentUser = user;
            if (typeof cacheHeaderUser === "function") cacheHeaderUser(user);
        }
        resetAuthProviderButtonsV78e();
        const modal = document.getElementById("auth-modal");
        if (modal) {
            modal.style.setProperty("display", "none", "important");
            modal.style.setProperty("visibility", "hidden", "important");
            modal.style.setProperty("opacity", "0", "important");
            modal.style.setProperty("pointer-events", "none", "important");
            modal.classList.remove("open", "active", "show", "is-open");
            modal.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("auth-open", "modal-open");
        document.documentElement.classList.remove("auth-open", "modal-open");
        if (typeof updateAuthUI === "function") updateAuthUI(user || window.currentUser || null);
        if (typeof window.onAuthChange === "function") window.onAuthChange(user || window.currentUser || null);
        if (typeof syncHeaderAuthState === "function") syncHeaderAuthState();
        if (window.IPSCAppV78 && typeof window.IPSCAppV78.broadcastAuth === "function") window.IPSCAppV78.broadcastAuth("SIGNED_IN");
        setTimeout(function(){
            try {
                const modalAgain = document.getElementById("auth-modal");
                if (modalAgain) modalAgain.style.setProperty("display", "none", "important");
                resetAuthProviderButtonsV78e();
            } catch (_) {}
        }, 250);
    } catch (_) {}
}
window.resetAuthProviderButtonsV78e = resetAuthProviderButtonsV78e;
window.closeAuthModalAfterLoginV78e = closeAuthModalAfterLoginV78e;


// V78M: one reliable close path for login/settings modal in app shell.
function closeAuthModalV78m(){
  try {
    const modal = document.getElementById("auth-modal");
    if (modal) {
      modal.style.setProperty("display", "none", "important");
      modal.style.setProperty("visibility", "hidden", "important");
      modal.style.setProperty("opacity", "0", "important");
      modal.style.setProperty("pointer-events", "none", "important");
      modal.classList.remove("open", "active", "show", "is-open");
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("auth-open", "modal-open");
    document.documentElement.classList.remove("auth-open", "modal-open");
    if (window.IPSCAppV78 && typeof window.IPSCAppV78.restoreShellChrome === "function") window.IPSCAppV78.restoreShellChrome();
    return true;
  } catch (_) { return false; }
}
window.closeAuthModalV78m = closeAuthModalV78m;

document.addEventListener("click", async (e) => {
    if (e.target.id === "btn-open-login" || e.target.closest("#btn-open-login")) {
        if (typeof showAuthModalV78h === "function") {
            showAuthModalV78h("login");
        } else {
            const modal = document.getElementById("auth-modal");
            if (modal) {
                modal.style.setProperty("display", "flex", "important");
                modal.style.setProperty("visibility", "visible", "important");
                modal.style.setProperty("opacity", "1", "important");
                modal.style.setProperty("pointer-events", "auto", "important");
                toggleAuthView("login");
            }
        }
    }

    if (e.target.id === "btn-close-modal" || e.target.closest("#btn-close-modal") || e.target.closest(".modal-close-trigger")) {
        e.preventDefault();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        closeAuthModalV78m();
        return;
    }

    if (e.target.id === "btn-logout" || e.target.closest("#btn-logout")) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        clearHeaderUserCache();
        await window.supabaseClient.auth.signOut();
        window.currentUser = null;
        try { if (typeof updateAuthUI === "function") updateAuthUI(null); } catch (_) {}
        try { if (typeof window.onAuthChange === "function") window.onAuthChange(null); } catch (_) {}
        try { window.dispatchEvent(new CustomEvent("ipsc:auth-logout-v78d")); } catch (_) {}
        if (!(document.body && (document.body.classList.contains("page-app-spa") || document.body.classList.contains("page-native-shell")))) {
            location.reload();
        }
    }

    if (e.target.id === "btn-open-settings" || e.target.closest("#btn-open-settings")) {
        if (typeof showAuthModalV78h === "function") {
            showAuthModalV78h("settings");
        } else {
            const modal = document.getElementById("auth-modal");
            if (modal) {
                modal.style.setProperty("display", "flex", "important");
                modal.style.setProperty("visibility", "visible", "important");
                modal.style.setProperty("opacity", "1", "important");
                modal.style.setProperty("pointer-events", "auto", "important");
                toggleAuthView("settings");
            }
        }

        const settingsPublicAlias = document.getElementById("settings-public-alias");
        if (settingsPublicAlias && window.currentUser) {
            settingsPublicAlias.value = window.currentUser.user_metadata?.username || "";
        }

        const settingsIpsc = document.getElementById("settings-ipsc-alias");
        if (settingsIpsc && window.currentUser) {
            settingsIpsc.value = window.currentUser.user_metadata?.ipsc_alias || "";
        }

        const settingsRealName = document.getElementById("settings-real-name");
        if (settingsRealName && window.currentUser) {
            settingsRealName.value = window.currentUser.user_metadata?.real_name || "";
        }

        const previewImg = document.getElementById("settings-avatar-preview");
        if (previewImg && window.currentUser?.user_metadata?.avatar_url) {
            previewImg.src = window.currentUser.user_metadata.avatar_url;
            previewImg.style.display = 'block';
        }
    }

    if (e.target.id === "btn-delete-account") {
        e.preventDefault();

        if (!confirm("⚠️ WARNUNG:\n\nMöchtest du dein Profil und all deine aktiven Marktplatz-Inserate wirklich unwiderruflich löschen?")) return;

        await window.supabaseClient.from("matches").delete().eq("seller_email", window.currentUser.email);
        await window.supabaseClient.auth.updateUser({ data: { deleted: true, username: "Gelöschter Schütze" } });
        clearHeaderUserCache();
        await window.supabaseClient.auth.signOut();

        alert("Dein Konto und deine Inserate wurden erfolgreich entfernt.");
        try { window.dispatchEvent(new CustomEvent("ipsc:auth-logout-v78d")); } catch (_) {}
        if (!(document.body && (document.body.classList.contains("page-app-spa") || document.body.classList.contains("page-native-shell")))) location.reload();
    }
});

window.previewSettingsAvatar = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const img = document.getElementById('settings-avatar-preview');

            if (img) {
                img.src = e.target.result;
                img.style.display = 'block';
            }
        };

        reader.readAsDataURL(input.files[0]);
    }
};

document.addEventListener("submit", async (e) => {
    if (e.target.id === "login-form") {
        e.preventDefault();

        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) btn.innerText = "Lade...";

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: document.getElementById("login-email").value,
            password: document.getElementById("login-password").value,
        });

        if (error) {
            if (btn) btn.innerText = "Einloggen";
            alert("Login fehlgeschlagen: " + error.message);
        } else {
            if (data?.session?.user) cacheHeaderUser(data.session.user);
            if (document.body && (document.body.classList.contains("page-native-shell") || document.body.classList.contains("page-app-spa"))) {
                const loggedInUser = data?.session?.user || window.currentUser || null;
                closeAuthModalAfterLoginV78e(loggedInUser);
                window.dispatchEvent(new CustomEvent("ipsc:oauth-login-complete", { detail: { user: loggedInUser } }));
            } else {
                location.reload();
            }
        }
    }

    else if (e.target.id === "register-form") {
        e.preventDefault();

        const agbCheckbox = document.getElementById("register-agb");
        if (agbCheckbox && !agbCheckbox.checked) {
            alert(window.currentLang === "en" ? "Please accept the terms and conditions." : "Bitte akzeptiere die AGB und Nutzungsbedingungen, um fortzufahren.");
            return;
        }

        const realName = document.getElementById("register-real-name") ? document.getElementById("register-real-name").value.trim() : "";
        const publicAlias = document.getElementById("register-ipsc-alias") ? document.getElementById("register-ipsc-alias").value.trim() : "";
        const memberNumber = document.getElementById("register-member-number") ? document.getElementById("register-member-number").value.trim() : "";
        const emailValue = document.getElementById("register-email").value;
        const passwordValue = document.getElementById("register-password").value;

        const publicUsername = publicAlias !== "" ? publicAlias : emailValue.split('@')[0];

        const { error } = await window.supabaseClient.auth.signUp({
            email: emailValue,
            password: passwordValue,
            options: {
                data: {
                    real_name: realName,
                    ipsc_alias: memberNumber,
                    username: publicUsername
                }
            }
        });

        if (error) alert("Registrierung fehlgeschlagen: " + error.message);
        else {
            alert("Konto erstellt! Bitte überprüfe dein Postfach.");
            toggleAuthView("login");
        }
    }

    else if (e.target.id === "forgot-form") {
        e.preventDefault();

        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(document.getElementById("forgot-email").value, {
            redirectTo: window.location.origin + window.location.pathname,
        });

        if (error) alert("Fehler: " + error.message);
        else {
            alert("Link zum Zurücksetzen gesendet!");
            toggleAuthView("login");
        }
    }

    else if (e.target.id === "reset-password-form") {
        e.preventDefault();

        const { error } = await window.supabaseClient.auth.updateUser({
            password: document.getElementById("reset-password-input").value
        });

        if (error) alert("Fehler: " + error.message);
        else {
            alert(window.currentLang === "en" ? "Password updated! Confirmation email has been sent." : "Passwort erfolgreich aktualisiert! Eine Bestätigungs-E-Mail wurde versendet.");
            location.reload();
        }
    }

    else if (e.target.id === "settings-form") {
        e.preventDefault();

        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn ? btn.innerText : "";
        if (btn) btn.innerText = "Speichere... (Bild lädt hoch)";

        try {
            const newPassword = document.getElementById("settings-password") ? document.getElementById("settings-password").value : "";
            const newPublicAlias = document.getElementById("settings-public-alias") ? document.getElementById("settings-public-alias").value.trim() : "";
            const newIpscAlias = document.getElementById("settings-ipsc-alias") ? document.getElementById("settings-ipsc-alias").value.trim() : "";
            const newRealName = document.getElementById("settings-real-name") ? document.getElementById("settings-real-name").value.trim() : "";

            const publicUsername = newPublicAlias !== "" ? newPublicAlias : window.currentUser.email.split('@')[0];

            const avatarInput = document.getElementById("settings-avatar");
            const avatarFile = avatarInput && avatarInput.files.length > 0 ? avatarInput.files[0] : null;

            let updates = {
                data: {
                    username: publicUsername,
                    ipsc_alias: newIpscAlias,
                    real_name: newRealName
                }
            };

            if (newPassword.trim().length >= 6) {
                updates.password = newPassword;
            }

            if (avatarFile) {
                const avatarUrl = await window.uploadImage(avatarFile, 'avatars');
                updates.data.avatar_url = avatarUrl;

                try {
                    localStorage.setItem(HEADER_AVATAR_CACHE_KEY, avatarUrl);
                    localStorage.setItem(
                        HEADER_USER_CACHE_KEY,
                        JSON.stringify({
                            email: window.currentUser.email || "",
                            avatar_url: avatarUrl,
                            updated_at: Date.now()
                        })
                    );
                } catch (err) {}
            }

            const { error } = await window.supabaseClient.auth.updateUser(updates);
            if (error) throw error;

            await window.supabaseClient.from("profiles").update({
                username: publicUsername,
                ipsc_alias: newIpscAlias,
                real_name: newRealName
            }).eq("id", window.currentUser.id);

            alert(window.currentLang === "en" ? "Account updated!" : "Konto erfolgreich aktualisiert!");
            location.reload();

        } catch (err) {
            if (btn) btn.innerText = oldText;
            alert("Fehler beim Speichern: " + err.message);
        }
    }
});

document.addEventListener("change", (e) => {
    if (e.target.id === "language-select") {
        localStorage.setItem("selectedLanguage", e.target.value);
        applyLanguage(e.target.value);
    }
});

function formatStars(value) {
    if (!value || isNaN(value) || value === 0) return "-";

    let fullStars = Math.round(value);
    return "★".repeat(fullStars) + "☆".repeat(5 - fullStars) + ` (${parseFloat(value).toFixed(1)}/5)`;
}

const initAppLanguage = () => {
    initTheme();

    const savedLang = localStorage.getItem("selectedLanguage") || "de";

    const selector = document.getElementById("language-select");
    if (selector) selector.value = savedLang;

    applyLanguage(savedLang);
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(initAppLanguage, 50));
} else {
    setTimeout(initAppLanguage, 50);
}

setTimeout(async () => {
    try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        if (hashParams.has('error_code') && hashParams.get('error_code') === 'otp_expired') {
            alert(window.currentLang === "en"
                ? "This reset link has expired or has already been used. Please request a new one."
                : "Dieser Link ist abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen Passwort-Link an.");

            history.replaceState("", document.title, window.location.pathname + window.location.search);
        }

        const settledOAuthSession = await settleOAuthSessionIfPresentV47();

        const { data: { session } } = await window.supabaseClient.auth.getSession();

        window.currentUser = settledOAuthSession?.user || session?.user || null;

        if (window.currentUser) {
            cacheHeaderUser(window.currentUser);
        } else {
            clearHeaderUserCache();
        }

        await checkUserStatus();
        if (window.currentUser) cleanOAuthUrlIfNeeded();

        if (window.currentUser) {
            try {
                const salesRes = await window.supabaseClient.from('mediated_deals').select('*').eq('seller_email', window.currentUser.email);
                const purchaseRes = await window.supabaseClient.from('mediated_deals').select('*').eq('buyer_email', window.currentUser.email);

                const salesData = salesRes.data || [];
                const purchaseData = purchaseRes.data || [];

                const salesCountEl = document.getElementById("profile-sales-count");
                const purchaseCountEl = document.getElementById("profile-purchases-count");

                if (salesCountEl) salesCountEl.innerText = salesData.length;
                if (purchaseCountEl) purchaseCountEl.innerText = purchaseData.length;

                let totalComm = 0, totalPay = 0, countComm = 0, countPay = 0;

                salesData.forEach(d => {
                    if (d.rating_communication) {
                        totalComm += d.rating_communication;
                        countComm++;
                    }

                    if (d.rating_payment) {
                        totalPay += d.rating_payment;
                        countPay++;
                    }
                });

                purchaseData.forEach(d => {
                    if (d.rating_communication) {
                        totalComm += d.rating_communication;
                        countComm++;
                    }

                    if (d.rating_payment) {
                        totalPay += d.rating_payment;
                        countPay++;
                    }
                });

                const ratingCommEl = document.getElementById("profile-rating-comm");
                const ratingPayEl = document.getElementById("profile-rating-pay");

                if (ratingCommEl) ratingCommEl.innerText = formatStars(countComm > 0 ? totalComm / countComm : 0);
                if (ratingPayEl) ratingPayEl.innerText = formatStars(countPay > 0 ? totalPay / countPay : 0);

            } catch(e) {
                console.error("Fehler beim Laden der Profil-Statistiken:", e);
            }
        }

        if (typeof window.onAuthChange === "function") {
            window.onAuthChange(window.currentUser);
        }

        window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
            window.currentUser = session?.user || null;

            if (window.currentUser) {
                cacheHeaderUser(window.currentUser);
            } else {
                clearHeaderUserCache();
            }

            if (event === "PASSWORD_RECOVERY") {
                const modal = document.getElementById("auth-modal");

                if (modal) modal.style.display = "flex";

                toggleAuthView("reset-password");
            }

            await checkUserStatus();

            if (event === "SIGNED_IN" && window.currentUser) {
                cleanOAuthUrlIfNeeded();
                if (document.body && (document.body.classList.contains("page-native-shell") || document.body.classList.contains("page-app-spa"))) {
                    closeAuthModalAfterLoginV78e(window.currentUser);
                }
            }

            if (typeof window.onAuthChange === "function") {
                window.onAuthChange(window.currentUser);
            }
        });
    } catch (err) {
        console.error("Auth-Initialisierung fehlgeschlagen:", err);
        window.currentUser = null;
        clearHeaderUserCache();
        await checkUserStatus();
    }
}, 150);
