// 🎯 Die offiziellen UUIDs aus dem Shooters Global Dokument (vollständig in Kleinbuchstaben für die Web-API)
const SG_SERVICE_UUID = '7520ffff-14d2-4cda-8b6b-697c554c9311'; // Haupt-Service[span_1](start_span)[span_1](end_span)
const SG_CHAR_COMMAND = '75200000-14d2-4cda-8b6b-697c554c9311'; // Befehle senden[span_2](start_span)[span_2](end_span)
const SG_CHAR_EVENT   = '75200001-14d2-4cda-8b6b-697c554c9311'; // Live-Events empfangen[span_3](start_span)[span_3](end_span)

let bluetoothDevice = null;
let commandCharacteristic = null;

// ==========================================
// 1. TIMER SUCHEN & VERBINDEN
// ==========================================
const connectSGTimer = async () => {
    try {
        console.log("Suche nach SG Timer Bluetooth-Geräten...");
        
        // Filtert gezielt nach dem SG-Hauptservice[span_4](start_span)[span_4](end_span)
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { services: [SG_SERVICE_UUID] }
            ],
            optionalServices: [SG_SERVICE_UUID]
        });

        console.log(`Gerät gefunden: ${bluetoothDevice.name}. Verbinde mit GATT-Server...`);
        const server = await bluetoothDevice.gatt.connect();

        console.log("Hole Haupt-Service...");
        const service = await server.getPrimaryService(SG_SERVICE_UUID);

        // Charakteristiken für Befehle und Events sichern[span_5](start_span)[span_5](end_span)
        commandCharacteristic = await service.getCharacteristic(SG_CHAR_COMMAND);
        const eventCharacteristic = await service.getCharacteristic(SG_CHAR_EVENT);

        // 🔔 Live-Benachrichtigungen für Events aktivieren[span_6](start_span)[span_6](end_span)
        await eventCharacteristic.startNotifications();
        eventCharacteristic.addEventListener('characteristicvaluechanged', handleTimerEvent);

        console.log("🚀 Erfolgreich mit SG Timer verbunden! Live-Kanal ist aktiv.");
        alert(`Erfolgreich verbunden mit ${bluetoothDevice.name}!`);

    } catch (error) {
        console.error("Bluetooth Fehler:", error);
        alert("Verbindung fehlgeschlagen: " + error.message);
    }
};

// ==========================================
// 2. LIVE-EVENTS PARSEN (Schuss-Erkennung)
// ==========================================
const handleTimerEvent = (event) => {
    const value = event.target.value; // DataView der empfangenen Bytes
    if (value.byteLength < 2) return;

    // Laut Dokument: Byte 0 = Länge, Byte 1 = Event ID[span_7](start_span)[span_7](end_span)
    const len = value.getUint8(0);
    const eventId = value.getUint8(1);

    // 💥 Event 0x04 = SHOT_DETECTED[span_8](start_span)[span_8](end_span)
    if (eventId === 0x04) {
        // Datenstruktur laut Kapitel 1.2.5 (Alles in Big Endian!)[span_9](start_span)[span_9](end_span):
        // Byte 2-5: Session ID (4 Bytes)[span_10](start_span)[span_10](end_span)
        // Byte 6-7: Schussnummer (2 Bytes)[span_11](start_span)[span_11](end_span)
        // Byte 8-11: Schusszeit in ms (4 Bytes)[span_12](start_span)[span_12](end_span)
        
        const shotNum = value.getUint16(6, false); // false = Big Endian[span_13](start_span)[span_13](end_span)
        const shotTimeMs = value.getUint32(8, false); // false = Big Endian[span_14](start_span)[span_14](end_span)
        const shotTimeSeconds = (shotTimeMs / 1000).toFixed(2);

        console.log(`💥 Schuss #${shotNum + 1} registriert: ${shotTimeSeconds}s`);
        
        // Event an deine Website-Oberfläche weitergeben
        onShotDetected(shotNum + 1, shotTimeSeconds);
    }
};

// ==========================================
// 3. REMOTECONTROL: BEFEHLE AN TIMER SENDEN
// ==========================================
const sendTimerCommand = async (commandId) => {
    if (!commandCharacteristic) {
        console.error("Nicht mit dem Timer verbunden!");
        return;
    }

    // Allgemeines Format laut Kapitel 1.1[span_15](start_span)[span_15](end_span):
    // Byte 0: Länge der folgenden Daten (hier 1 Byte für die commandId)[span_16](start_span)[span_16](end_span)
    // Byte 1: Command ID[span_17](start_span)[span_17](end_span)
    const buffer = new Uint8Array([0x01, commandId]);
    
    try {
        await commandCharacteristic.writeValue(buffer);
        console.log(`Befehl 0x${commandId.toString(16)} erfolgreich gesendet!`);
    } catch (error) {
        console.error("Fehler beim Senden des Befehls:", error);
    }
};

// Komfort-Funktionen für deine Buttons
const remoteStartSession  = () => sendTimerCommand(0x00); // Startet den RO-Durchgang (Piep!)[span_18](start_span)[span_18](end_span)
const remoteStopSession   = () => sendTimerCommand(0x03); // Stoppt den Durchgang[span_19](start_span)[span_19](end_span)
