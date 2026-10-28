# A-037 Mias Ergebnis-Karten wie im Clip + Aufleuchten in der Kachel (Tafel 126, Wortlaut 28.10.)

Tafel 126 = Clip-Bild „Einfach erzählen. Mia sortiert.“ (`docs/tafeln/tafel-126.png`).

1. ERGEBNIS-KARTEN (ersetzt die Text-Übersicht in MiaDoneCard, für 1 bis viele Einträge)
- Nach jedem Satz, mit dem Mia etwas anlegt: pro Eintrag eine weiße Karte unter ihrer kurzen Antwort, nacheinander einblendend (0,15 s Abstand, weich).
- Aufbau: links Symbol in der Kachelfarbe des Bereichs (Termin = Kalender blau, Einkauf = Wagen grün, Aufgabe = Häkchen, Pinnwand = Pin, Notiz = Zettel, Im Haus = Kühlschrank), Mitte fett der Inhalt („Fr 16:00 Zahnarzt Jonne“, „Milch“), darunter klein Art · Raum („Termin · Familie“, „Einkauf · für alle“, „Aufgabe · Ich“), rechts grüne Pille mit Häkchen: „Eingetragen“ / „Steht drauf“ / „Hängt dran“ / „Notiert“.
- Text nie abgeschnitten: Inhalt höchstens 2 Zeilen, Pille schrumpft notfalls auf nur das Häkchen.
- Mehr als 4 Einträge: 4 Karten + Zeile „und 3 weitere ⌄“ zum Aufklappen.
- Karte antippen = Eintrag öffnen. Raum direkt ändern: kleine Zeile „Termin · Familie ⌄“ antippen → Familie · Ich · Arbeit (RaumChips aus A-020).
- Darunter einmal „Rückgängig“ (10 s, macht alle zurück), danach alles in „Mia hat schon …“.
- Große Dinge (Vorschau): gleiche Karte, rechts oranger Knopf „Übernehmen“ → nach Tippen grün „Eingetragen“ (genau wie im Clip).
- Mia sagt dazu nur kurz etwas („Steht drin.“), wird mit Lola vorgelesen; die Karten liest sie nicht vor.

2. AUFLEUCHTEN IN DER KACHEL
- Schließt man die Bühne (oder kommt zur Startseite zurück), zeigen die betroffenen Kacheln den neuen Eintrag mit weichem orangem Leuchten (Ring/Hintergrund, 1,5 s ein- und ausblenden, nur einmal). Steht der Eintrag nicht sichtbar in der Kachel (z. B. Termin nächste Woche), leuchtet die Kachel kurz als Ganzes.
- prefers-reduced-motion: nur kurz hervorgehoben, ohne Bewegung.

3. TESTS
- Satz „Freitag 16 Uhr Zahnarzt mit Jonne. Und wir brauchen Milch.“ → zwei Karten (Termin · Familie, Einkauf · für alle), Rückgängig nimmt beide zurück.
- Eine Sache → eine Karte; sechs Sachen → 4 + „und 2 weitere“.
- Lange Titel ohne Abschneiden (SE, 15 Pro, Pixel 7).
- Aufleuchten in Termine- und Einkauf-Kachel nach Schließen der Bühne; nur einmal.
- Prüfstand unverändert ≥ 95 %. bilder:vergleich Bühne.
- Version, Changelog, PR, mergen.
