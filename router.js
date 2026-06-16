// router.js

// 1. Klicks auf Links abfangen
document.addEventListener("click", async (e) => {
    const link = e.target.closest("a");

    // Nur eingreifen, wenn es ein Link zu deiner eigenen App ist und kein Anker (#)
    if (!link || !link.href.startsWith(window.location.origin) || link.hash) return;
    
    // Sonderfall für externe Links oder Downloads ignorieren
    if (link.target === "_blank" || link.hasAttribute("download")) return;

    // Normalen, flackernden Seitenwechsel stoppen!
    e.preventDefault(); 
    const url = link.href;

    // URL oben in der Adressleiste ändern, ohne neu zu laden
    window.history.pushState({}, "", url);

    // Neuen Inhalt laden
    await updateContent(url);
});

// 2. Zurück-Button vom Handy abfangen
window.addEventListener("popstate", () => {
    updateContent(window.location.href);
});

// 3. Die Magie: Inhalt austauschen
async function updateContent(url) {
    try {
        const container = document.querySelector(".container");
        if(container) container.style.opacity = "0.5";

        const response = await fetch(url);
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const newContainer = doc.querySelector(".container");

        if (container && newContainer) {
            // Tausche den Inhalt weich aus
            container.innerHTML = newContainer.innerHTML;
            container.style.opacity = "1";
            
            // Passe den Seitentitel an
            document.title = doc.title; 
            
            // Scrolle wieder nach oben
            window.scrollTo(0, 0); 
            
            // --- NEU: Navigationleiste unten/oben aktualisieren ---
            updateActiveNav(url);
            
            // Trigger das Event für die app.js
            document.dispatchEvent(new Event("pageLoaded"));
        } else {
            window.location.href = url; 
        }
    } catch (err) {
        window.location.href = url; 
    }
}

// 4. NEU: Funktion zum Umschalten des aktiven Buttons
function updateActiveNav(targetUrl) {
    const urlObj = new URL(targetUrl, window.location.origin);
    let targetPath = urlObj.pathname;
    
    // Falls der Pfad nur "/" ist, machen wir "index.html" daraus für den Vergleich
    if (targetPath === "/") targetPath = "/index.html";

    // Suche alle Links in deinem Header / in deiner unteren Navigationsleiste
    const navLinks = document.querySelectorAll("header a, nav a");

    navLinks.forEach(link => {
        const linkObj = new URL(link.href, window.location.origin);
        let linkPath = linkObj.pathname;
        if (linkPath === "/") linkPath = "/index.html";

        // Wir entfernen standardmäßig erst mal die aktive Farbe (auf Standardgrau setzen)
        link.classList.remove("active");
        link.style.color = "var(--text-muted)";
        const icon = link.querySelector("svg, i, span"); // Falls Icons drin sind
        if (icon) icon.style.color = "var(--text-muted)";

        // Wenn der Link zur aktuellen Seite passt, färben wir ihn orange (aktiv)
        if (linkPath === targetPath) {
            link.classList.add("active");
            link.style.color = "var(--accent-color)"; 
            if (icon) icon.style.color = "var(--accent-color)";
        }
    });
}

// Setze den richtigen Button auch einmal direkt beim allerersten Laden der App
document.addEventListener("DOMContentLoaded", () => {
    updateActiveNav(window.location.href);
});
