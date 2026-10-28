# A-043 SOFORT: Erledigte Aufgaben nur 12 Stunden (Wortlaut 28.10.)

- Erledigte Aufgaben stehen höchstens 12 Stunden nach dem Abhaken im Bereich „Erledigt“, danach verschwinden sie still (Löschen als Markierung wie beim Abgleich, damit es auf allen Geräten gleich ist). Kein Archiv, keine Zahl.
- Bereich heißt „Erledigt ⌄“ (statt „Erledigte ausblenden“), ist standardmäßig ZUGEKLAPPT, ohne Anzahl. Aufklappen zeigt die Erledigten der letzten 12 Stunden, neueste oben; antippen des Häkchens = wieder offen.
- Abhaken in der Liste wie bisher: Häkchen, 1 s stehen, dann weich nach „Erledigt“.
- Gilt gleich für Aufgabe-Kachel, Aufgaben-Seite, Familien-Aufgaben („erledigt von Lisa“ ebenfalls 12 h).
- Wiederkehrende Aufgaben: nur die erledigte Runde verschwindet, die nächste bleibt.
- Mia: „Was hab ich heute geschafft?“ darf die Erledigten der letzten 12 h nennen, mehr nicht.
- Migration: bereits ältere erledigte Aufgaben beim ersten Start nach dem Update einmal still entfernen (vorher Sicherung bleibt kompatibel, tests/fixtures).
- Tests: abgehakt vor 11 h sichtbar, vor 13 h weg; zugeklappt als Standard; Wieder-öffnen geht; Abgleich zwischen zwei Geräten.
- Version, PR, mergen.
