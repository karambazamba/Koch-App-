SAMMEL-AUFTRAG 29.10. mittags (Tafel 144) – nicht nachfragen, testen, mergen. Läuft NACH dem aktuellen Paket, vor P9. Je Block ein PR.

A · KAPUTT  (→ A-059)
1. Notizen-Kachel (alle Größen): Antippen der Kachel (außer Stift-Knopf) öffnet IMMER die Notizen-Seite – auch wenn keine Notiz da ist. Stift = neue Notiz. Test: leere und volle Kachel.
2. Wundertüte-Kachel: keine Silbentrennung mitten im Wort (hyphens: none; „De-ern“ falsch). Lösung/Pointe nie abgeschnitten und nie unter dem Mia-Knopf: Kachel-Inhalt endet oberhalb der Leiste bzw. Text max. 2 Zeilen, sonst Schrift kleiner. Test SE/15 Pro/Pixel 7.
6. Menü „•••“ oben rechts → „Einstellungen“ reagiert beim ersten Mal nach dem App-Start nicht (man bleibt auf der Startseite), erst beim zweiten Tippen. Ein Tippen muss immer sofort öffnen – auch direkt nach dem Start und auf allen Menüpunkten. Ursache suchen (z. B. erstes Tippen schließt nur das Menü, Navigation vor Hydration, Fokus-/Sheet-Animation), Test im Durchklick „Kaltstart → ••• → Einstellungen“ auf iPhone-Safari-Profil und als Home-Bildschirm-App.
7. iPhone ohne Home-Button: Beim Schließen der App (Wisch vom unteren Rand nach oben) springt die Seite zu Essen. Seitenwechsel per Wischen darf NUR auslösen, wenn:
   - der Finger nicht im unteren Bereich startet (unterste 48 px + Safe-Area unten werden ignoriert) und nicht am linken Rand (der ist für Zurück),
   - die Bewegung klar waagerecht ist (|dx| ≥ 2 × |dy|) und mind. 60 px lang.
   Außerdem: Seitenwechsel durch Wischen nicht als „letzte Seite“ merken, wenn die App direkt danach in den Hintergrund geht (visibilitychange innerhalb 500 ms → zurück zur vorherigen Seite). Öffnen nach > 5 Min bleibt Startseite (Heimkehr-Regel). Test: simulierter Wisch von unten schräg → Seite bleibt.

B · NERVT  (→ A-060, zusammen mit A-058 Mia-Zubehör)
3. Notizen-Kachel XS/S Vorschau: neueste Notiz in bis zu 2 Zeilen, Ende weich ausblenden (Verlauf in Kachelfarbe) statt „…“, Trennung nur an Wortgrenzen. Ohne Notiz: „Schnell notieren …“ in Grau. Notizen XS bleibt Teil der Beispiel-Startseite.
4. Mia-Zubehör (= A-058, schon beauftragt).

C · ERINNERUNG (= A-054, schon beauftragt): Jetzt-Karte ohne Füllsätze, „Wochenende planen?“ nur freitags, nie „…“.

Tafel 144 (Vorher/Nachher): Notiz 2 Zeilen, zweite läuft weich aus; Wundertüte: Wort ganz, Lösung im weißen Feld, frei vom Mia-Knopf, unten „Antippen für mehr“; ganze Kachel antippen = Notizen-Seite („Noch keine Notizen. Tipp aufs Plus oder sag Mia: ‚Notiz: …‘“).
Am Ende in docs/auftraege.md: fertig (Version) + 3 Dinge zum Ausprobieren.

8. (Tafel 145, ersetzt bei der Wundertüte-Kachel den Teil „Lösung sofort im weißen Feld / Antippen für mehr“ aus Tafel 144)
Wundertüte und Rätsel: Lösung erst nach Antippen (wie eine Karte zum Umdrehen)
- KACHEL: zeigt nur Sorte + Frage/Witz-Anfang/Platt-Wort, unten „Antippen für die Lösung“. Antippen = Karte dreht sich um (weiche Dreh-Animation 0,6 s, reduced-motion: Überblenden) und zeigt die Lösung IN der Kachel (weißes Feld). Nochmal antippen = zurück. Seite öffnen nur über kleinen Link „Mehr ›“ unten rechts.
- SEITE: nach „Noch eine“ immer zuerst NUR die Frage; Lösungsfeld verdeckt („Antippen für die Lösung“), Antippen der Karte deckt auf. „Noch eine“ erst nach dem Aufdecken orange, vorher hell (trotzdem tippbar).
- Gilt für alle Sorten: Witz (Pointe verdeckt), Angeberwissen (Antwort verdeckt), Plattdeutsch (Wort → Bedeutung + Beispiel), Rätsel.
- Kachel-Schrift immer volle Farbe (kein Grau), Kontrast ≥ 4,5:1 in jeder Kachelfarbe; keine Silbentrennung (hyphens: none).
- Filter-Chips oben: nie abgeschnitten – „Angeberwissen“ als „Wissen“ oder Chips-Reihe passt sich an (2 Zeilen erlaubt). Tafel: Alles · Witze · Platt · Wissen.
- Test: Kachel zeigt Lösung nicht vor dem Tippen; Seite nach „Noch eine“ verdeckt; Kontrast in allen 8 Farben.
