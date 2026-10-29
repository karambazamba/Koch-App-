Nachtrag Mia-Zubehör (29.10.): Sonne den ganzen Tag, Herbstblätter nur bei Wind
Nicht nachfragen, testen, mergen. Datei src/lib/mia/zubehoer.ts (+ MiaZubehoer.tsx).

1. SONNE DEN GANZEN TAG
- „Sonnig“ großzügiger: Wettercode ≤ 2 (klar, fast klar, teils bewölkt) ODER Sonnenschein der Stunde ≥ 30 Min (falls die Quelle das liefert).
- Tagesentscheidung statt Stunde: Ist es heute zwischen Sonnenaufgang und jetzt (bzw. für den Rest des Tages laut Vorhersage) überwiegend sonnig (mind. die Hälfte der hellen Stunden), trägt Mia die Sonne bzw. ab 18 °C die Sonnenbrille den GANZEN hellen Tag. Kein Hin- und Herspringen je Stunde.
- Vorrang bleibt: Regen in der nächsten Stunde → Schirm (danach wieder Sonne, wenn der Tag sonnig ist). Geburtstag/Anlass/Kochen vor Wetter wie bisher. Nachts nie Sonne.
- Merken pro Tag (localStorage-Schlüssel über storage.ts), damit Mia beim Neuladen gleich aussieht.

2. HERBSTBLÄTTER NUR BEI WIND
- Das einzelne fallende Blatt entfällt.
- Neu: September–November, wenn Wind ≥ 25 km/h oder Böen ≥ 35 km/h: 6–8 Blätter (Herbstfarben: Orange, Rot, Gelb, Braun, unterschiedlich groß) wehen in 2–3 s seitlich an Mia vorbei und wirbeln kurz um sie herum, Mia kneift dabei kurz die Augen zu. Höchstens alle 30 Min, beim Öffnen der App und beim Antippen von Mia (dann höchstens alle 5 Min).
- Sturm (Böen ≥ 60 km/h): Wackeln + Blätter zusammen.
- Bewegung nur transform/opacity, weich; prefers-reduced-motion: keine Blätter.
- Außerhalb Sep–Nov bei Wind: nichts (später evtl. Schnee im Winter).

3. TESTS
- Heute 29.10. mit Code 2 und 13 °C mittags → Sonne; Stunde mit Code 3 dazwischen → Sonne bleibt; Regen in 1 h → Schirm, danach Sonne; nachts nichts.
- Wind 30 km/h im Oktober → Blätter-Moment; 10 km/h → nichts; Juni mit Wind → nichts; reduced-motion → keine Blätter.
- bilder:vergleich Mia-Knopf. Version, PR, mergen.
