<?php
// URL der IPSC Match Übersicht
$url = "https://www.ipscmatch.de/";

// 1. HTML-Inhalt der Seite abrufen (Fehlermeldungen bei kaputtem HTML unterdrücken)
$html = @file_get_contents($url);

if ($html === FALSE) {
    die("Fehler beim Abrufen der Daten von ipscmatch.de.");
}

// 2. Ein DOM-Dokument erstellen, um den HTML-Code lesbar zu machen
$dom = new DOMDocument();
@$dom->loadHTML($html);
$xpath = new DOMXPath($dom);

// 3. Alle Tabellen-Reihen (tr) der Seite suchen
// Hinweis: XPath sucht hier einfach in allen Tabellen der Seite
$rows = $xpath->query('//table//tr');

$freeMatches = [];

// 4. Jede Reihe durchgehen und auswerten
foreach ($rows as $row) {
    $cols = $row->getElementsByTagName('td');
    
    // Prüfen, ob die Reihe genug Spalten hat (überspringt Kopfzeilen etc.)
    if ($cols->length >= 5) { 
        
        // Die Spalten auslesen. 
        // WICHTIG: Diese Index-Zahlen (0, 1, 2...) hängen vom genauen Aufbau von ipscmatch.de ab.
        // Meistens: Spalte 0 = Datum, Spalte 2 = Match Name. Ggf. anpassen!
        $date = trim($cols->item(0)->textContent); 
        $matchName = trim($cols->item(2)->textContent); 
        
        // Wir suchen im gesamten Text der Reihe nach der Prozentzahl (z.B. "85%")
        $rowText = $row->textContent;
        
        // Regulärer Ausdruck sucht nach einer Zahl direkt vor einem Prozentzeichen
        if (preg_match('/(\d+)\s*%/', $rowText, $matches)) {
            $percentage = (int)$matches[1];
            
            // 5. Filtern: Nur wenn die Auslastung unter 100% ist, speichern wir das Match
            if ($percentage < 100) {
                $freeMatches[] = [
                    'name' => $matchName,
                    'date' => $date,
                    'utilisation' => $percentage
                ];
            }
        }
    }
}

// 6. Das Ergebnis auf deiner Webseite ausgeben
echo "<h3>Hier gibt es noch freie Plätze:</h3>";

if (count($freeMatches) > 0) {
    echo "<ul style='list-style-type: none; padding: 0;'>";
    foreach ($freeMatches as $match) {
        // Ausgabe sicher formatieren (verhindert bösartigen Code)
        $safeName = htmlspecialchars($match['name']);
        $safeDate = htmlspecialchars($match['date']);
        $safeUtil = htmlspecialchars($match['utilisation']);
        
        echo "<li style='margin-bottom: 10px; padding: 10px; background-color: #f4f4f4; border-left: 5px solid #4CAF50;'>";
        echo "<strong>{$safeName}</strong><br>";
        echo "Datum: {$safeDate} | Auslastung: <strong>{$safeUtil}%</strong>";
        echo "</li>";
    }
    echo "</ul>";
} else {
    echo "<p>Aktuell sind leider alle gelisteten Matches zu 100% voll.</p>";
}
?>
