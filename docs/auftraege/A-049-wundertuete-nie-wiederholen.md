SOFORT-Auftrag: Mias Wundertüte – keine Punkte, nie wiederholen
Nicht nachfragen, testen, mergen.

1. ANZEIGE
- Die drei Punkte unten rechts entfernen (sehen aus wie Wischen).
- „Kinder raten zuerst“ als kleine Zeile direkt unter der Überschrift (nur bei Rätseln).
- Unten ein klarer Satz, was Antippen macht: Frage → „Antippen für die Lösung“; nach dem Tippen Lösung groß + unten „Morgen gibt’s die nächste.“ Bei Witz/Fakt ohne Auflösung nur „Morgen gibt’s die nächste.“
- Wasserzeichen (Geschenk) bleibt.

2. NIE WIEDERHOLEN
- Jeder Inhalt hat eine feste ID. Gesehene IDs je Haushalt speichern (im Haushalt geteilt, damit Lisa und Felix nicht dasselbe doppelt bekommen; ohne Konto lokal). Nie eine gesehene ID erneut zeigen.
- Inhalte als Pakete: content/wundertuete/paket-001.json (120 Stück), paket-002.json … Neue Pakete werden einfach dazugelegt; die App nimmt immer zuerst ungesehene aus dem ältesten Paket.
- Schwelle: Sind weniger als 30 ungesehene übrig, in docs/auftraege.md und im Entwickler-Bereich „Wundertüte: Nachschub nötig (n übrig)“ anzeigen.
- Notfall, wenn alles gesehen: Mia erzeugt per KI (Haiku, über guard.ts) einen neuen WITZ oder ein neues RÄTSEL (keine Fakten), kindertauglich, deutsch, max. 2 Sätze, Abgleich gegen alle gesehenen Texte (Ähnlichkeit), Ergebnis mit neuer ID speichern. Ohne KI: Kachel zeigt „Neue Wundertüte kommt bald.“ statt Wiederholung.
- Tests: 120 Tage simuliert → keine Wiederholung; Paket 2 wird nahtlos genommen; gemeinsamer Haushalt teilt „gesehen“; Notfall-Weg ohne Wiederholung; ohne KI kein Repeat.
- Version, PR, mergen.
