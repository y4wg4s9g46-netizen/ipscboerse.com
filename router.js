// router.js

// 1. Klicks auf Links abfangen
document.addEventListener("click", async (e) => {
    // Schauen, ob auf einen Link (<a>) geklickt wurde
    const link = e.target.closest("a");

    // Nur eingreifen, wenn es ein Link zu deiner eigenen App ist und kein Anker (#)
    if (!link || !link.href.startsWith(window.location.origin) || link.hash) return;

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
        // Zeige kurz einen Lade-Indikator, falls das Netz langsam ist (optional)
        const container = document.querySelector(".container");
        if(container) container.style.opacity = "0.5";

        // Hole die HTML-Datei aus dem Speicher (oder dem Netzwerk)
        const response = await fetch(url);
        const html = await response.text();

        // Verwandle den Text in echte HTML-Strukturen
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Finde den neuen Container
        const newContainer = doc.querySelector(".container");

        if (container && newContainer) {
            // Tausche den Inhalt weich aus
            container.innerHTML = newContainer.innerHTML;
            container.style.opacity = "1";
            
            // Passe den Seitentitel an
            document.title = doc.title; 
            
            // Scrolle wieder nach oben
            window.scrollTo(0, 0); 
            
            // HIER triggern wir ein Event, damit deine app.js weiß, dass neue Inhalte da sind
            document.dispatchEvent(new Event("pageLoaded"));
        } else {
            // Fallback, falls eine Seite mal keinen .container hat
            window.location.href = url; 
        }
    } catch (err) {
        // Fallback bei schweren Netzwerkfehlern
        window.location.href = url; 
    }
}
