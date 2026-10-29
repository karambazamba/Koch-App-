SOFORT-Fix Durchatmen (A-051) (29.10.): verständlich + keine Roboterstimme
Nicht nachfragen, testen, mergen.

1. KEINE ROBOTERSTIMME
- Handy-Stimme NIE für Durchatmen-Ansagen. Fehlt eine Lola-Datei: nur Klang (Atem-Ton, Klingen, Gong), keine Sprache.
- Lola-Ansagen automatisch: Server-Route (Vercel) erzeugt beim ersten Abruf einer fehlenden Ansage diese EINMAL mit ELEVENLABS_API_KEY + MIA_VOICE_ID (weich, speed ca. 0,85), legt sie in Supabase Storage ab und liefert sie danach nur noch aus. Zusätzlich Vercel-Cron einmal nachts: fehlende Ansagen vorab erzeugen. Kein manuelles Anstoßen nötig. Fehler → still, Hinweis im Entwickler-Bereich.

2. JEDE ÜBUNG ERKLÄRT SICH VOR DEM START
- Start-Bildschirm (hell, nicht dunkel) mit Titel, Dauer und 3 kurzen Schritten in großer Schrift, z. B. Handy-Pause (1 Min):
  1. Leg das Handy hin.
  2. Schau aus dem Fenster, so weit weg wie es geht.
  3. Atme ruhig. Ein Gong holt dich zurück.
  Darunter ein Satz „Wofür?“ in Grau: „Entspannt die Augen nach viel Bildschirm.“ Knopf „Los“ (und Stimme/Klang/Still-Wahl).
- Für alle 12 Übungen solche 3 Schritte + „Wofür?“ in content/durchatmen/uebungen.json pflegen (kurz, Du-Form, ohne Gesundheitsversprechen).

3. WÄHREND DER ÜBUNG
- Erst nach „Los“ und 3 s dunkel. Die aktuelle Anweisung GROSS in der Mitte (24–28 px, gut lesbar), nicht als kleine Zitat-Zeile; Ring-Countdown darüber. Wechselt die Anweisung („Noch ein bisschen.“), weich überblenden.
- Ende: Gong + hell + „Gut gemacht.“ / „Noch eine“ · „Fertig“.

4. TESTS
- Ohne Lola-Datei: keine Sprachausgabe, nur Klang. Erste Anfrage erzeugt Datei, zweite liefert aus Storage.
- Jede Übung zeigt vorher 3 Schritte + „Wofür?“; währenddessen große Anweisung.
- Version, PR, mergen.
