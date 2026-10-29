SOFORT-Fix (VORRANG vor allem anderen, 29.10.): Mia hört von Anfang an und versteht mehrere Sachen
Nicht nachfragen, testen, mergen. Betrifft v0.143 (A-019/A-026).

1. KEIN WORT AM ANFANG VERLIEREN
- Beim Antippen von Mia SOFORT Mikro starten und Audio lokal puffern (Ringpuffer, mind. 5 s), parallel Token holen und Websocket (scribe_v2_realtime) öffnen. Sobald verbunden: gepufferten Anfang zuerst senden, dann live weiter. Nichts verwerfen.
- Token vorwärmen: beim Öffnen der App und wenn die Leiste sichtbar ist (Token 15 Min gültig, rechtzeitig erneuern), damit die Verbindung meist schon steht.
- „Ich höre“-Ring erst zeigen, wenn das Mikro wirklich aufnimmt (nicht vorher), plus kurzer leiser Ton/Vibration „bereit“.
- Messen im Mikro-Protokoll: Tippen → Mikro an → Verbindung → erstes Wort. Ziel: Mikro an < 300 ms, kein Verlust.
- Fallback-Kette bleibt (Browser-Erkennung, dann Aufnahme+scribe_v1) – auch dort sofort aufnehmen und puffern.

2. SOFORT-WEG NUR FÜR EINDEUTIG EINFACHES
- Regel-Weg (ohne KI) nur, wenn GENAU EINE Sache erkannt wird und kein „und“, Komma, „außerdem“, „dann“, Doppelpunkt mit mehreren Teilen, Fragezeichen im Satz ist. Alles andere geht an die KI (CLAUDE.md: KI zuerst).
- Füllwörter vor jeder Auswertung entfernen: „äh“, „ähm“, „hm“, „also“, „mal“, „dazu“, „noch“, „bitte“ am Anfang, Wiederholungen („Aufgabe Aufgabe“), Satzanfänge wie „Aufgabe heute dazu“ → nur Steuerwörter, nicht Teil des Titels.
- KI-Prompt: Aufzählungen mit „und“/Komma in getrennte Einträge splitten („Maler kommt und Bank anrufen“ → 2 Aufgaben heute: „Maler kommt“, „Bank anrufen“). Titel ohne Füllwörter, erster Buchstabe groß.
- Ergebnis: eine Ergebnis-Karte pro Eintrag (Tafel 126), „Rückgängig“ nimmt alle zurück.

3. RAUM-NAME
- In Haushalt Familie/zu zweit heißt der persönliche Raum „Ich“, nicht „Privat“ (A-020/A-034). Falls A-020 noch nicht gemergt: Text „Hab Ich gewählt …“ nicht anzeigen, sondern „Nur für dich. Tippen zum Ändern.“

4. PRÜFSTAND / TESTS
- Neue Sätze (≥ 30) für Aufzählungen und Füllwörter, z. B. „Ähm, Aufgabe heute dazu: Maler kommt und Bank anrufen“ → 2 Aufgaben; „Milch, Eier und Butter auf die Liste“ → 3; „Termin morgen 10 Uhr Zahnarzt und danach Bank“ → Termin + Aufgabe. Ziel ≥ 98 %.
- Test: Sprechen sofort nach Tippen (Audio-Fixture mit Wort in den ersten 500 ms) → erstes Wort ist in der Mitschrift.
- Version, PR, mergen. Danach melden, damit ich es teste.
