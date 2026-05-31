<?php
// 1. DESIGN-KOPF DEINER SEITE LADEN
// Wenn du eine zentrale Datei für dein Menü/Header hast (z.B. header.php), 
// entferne die zwei Schrägstriche am Anfang der nächsten Zeile:
// include('header.php'); 
?>

<div class="match-container" style="max-width: 800px; margin: 30px auto; padding: 20px; font-family: Arial, sans-serif;">
    <h1 style="color: #333; border-bottom: 2px solid #ccc; padding-bottom: 10px;">Freie IPSC Match-Plätze</h1>
    <p style="color: #666; margin-bottom: 20px;">Hier siehst du alle aktuellen Matches von ipscmatch.de, die noch nicht ausgebucht sind.</p>

    <?php
    // --- START DES ABRAUF-SKRIPTS ---
    $url = "https://www.ipscmatch.de/";
    $html = @file_get_contents($url);

    if ($html === FALSE) {
        echo "<p style='color: red;'>Fehler: Die Daten von ipscmatch.de konnten aktuell nicht geladen werden.</p>";
    } else {
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        $rows = $xpath->query('//table//tr');
        $freeMatches = [];

        foreach ($rows as $row) {
            $cols = $row->getElementsByTagName('td');
            if ($cols->length >= 5) { 
                $date = trim($cols->item(0)->textContent); 
                $matchName = trim($cols->item(2)->textContent); 
                $rowText = $row->textContent;
                
                if (preg_match('/(\d+)\s*%/', $rowText, $matches)) {
                    $percentage = (int)$matches[1];
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

        // AUSGABE DER MATCHES
        if (count($freeMatches) > 0) {
            echo "<ul style='list-style-type: none; padding: 0;'>";
            foreach ($freeMatches as $match) {
                $safeName = htmlspecialchars($match['name']);
                $safeDate = htmlspecialchars($match['date']);
                $safeUtil = htmlspecialchars($match['utilisation']);
                
                echo "<li style='margin-bottom: 15px; padding: 15px; background-color: #f9f9f9; border-left: 5px solid #4CAF50; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);'>";
                echo "<strong style='font-size: 1.1em; color: #222;'>{$safeName}</strong><br>";
                echo "<span style='color: #666; font-size: 0.9em;'>Datum: {$safeDate}</span> | ";
                echo "<span style='color: #2e7d32; font-weight: bold; font-size: 0.9em;'>Auslastung: {$safeUtil}% (Noch Plätze frei!)</span>";
                echo "</li>";
            }
            echo "</ul>";
        } else {
            echo "<p style='color: #999; italic;'>Aktuell sind laut ipscmatch.de leider alle Turniere vollständig ausgebucht.</p>";
        }
    }
    // --- ENDE DES ABRAUF-SKRIPTS ---
    ?>
    
    <p style="font-size: 0.8em; color: #999; margin-top: 30px; text-align: center;">
        Daten live gefiltert von <a href="https://www.ipscmatch.de/" target="_blank" style="color: #666;">ipscmatch.de</a>
    </p>
</div>

<?php
// 2. DESIGN-FUSS DEINER SEITE LADEN
// Wenn du eine zentrale Datei für deinen Footer hast (z.B. footer.php),
// entferne die zwei Schrägstriche am Anfang der nächsten Zeile:
// include('footer.php'); 
?>
