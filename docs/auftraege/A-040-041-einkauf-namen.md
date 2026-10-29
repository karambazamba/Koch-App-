# A-040 Einkaufsliste nur mit Namen (Tafel 127) + A-041 Abhaken und Merken (Tafel 128)

## A-040 (Tafel 127 – Text nur aus der Tafel, Auftragstext nicht angekommen)
Auf der Liste steht, was man kauft. Zutaten aus dem Wochenplan sind ein Angebot, kein Muss.
1. Angebot oben: Laden-Seite oben Karte „Für deinen Wochenplan“ (z. B. „Lasagne · Fr · Curry · Sa“, einklappbar ⌄), Zutaten als Chips, einzeln antippen oder „Alle dazu“ (orange). Salz (Grundzutaten) blass, kommt nie von selbst. Liste darunter nur Symbol + Name, „2 Liter“ nur, weil selbst gesagt. Darunter „Oft bei Rewe“.
2. Nach „Alle dazu“: Angebot verschwindet, „Steht drauf.“, die Zutaten stehen ganz normal auf der Liste, ohne Gramm und ohne „für Gemüselasagne“. Eingabe „Was noch bei Rewe?“.
3. Zeile antippen: Fenster mit Name, darunter erst hier wofür („für Gemüselasagne · Fr“); Menge („z. B. 1 Beutel“), Laden (ändern ⌄), „Von der Liste nehmen“.

## A-041 Anmerkung (Wortlaut 28.10.)
1. ABHAKEN WIE BEI AUFGABEN
- Tippen = Häkchen orange, Zeile bleibt 1 s stehen (nochmal tippen = zurück), dann gleitet sie weich weg (0,8 s, transform/opacity). Kein Durchstreichen.
- Abgehaktes liegt in „Im Wagen ⌄“ (zugeklappt, ohne Zahl, unter der Liste). „Einkauf fertig“ schließt ab wie bisher (→ Im Haus, falls an).
- Gleich in Übersicht, Laden-Seite und Kachel.
2. MIA MERKT SICH DEN LADEN
- Jedes Abhaken auf einer Laden-Seite wird gemerkt: Sache (Normalform) → Laden, mit Zähler und Datum (nur lokal bzw. im Haushalt geteilt, keine Server-Statistik).
- Neue Sache ohne Laden (Mia, Plus, Wochenplan-Angebot): kommt automatisch in den Laden, in dem sie zuletzt bzw. am häufigsten abgehakt wurde. In der Ergebnis-Karte steht „Rewe · wie immer ⌄“, antippen = anderer Laden; die Korrektur wird ebenfalls gemerkt.
- Nie gemerkt: Sachen, die nur einmal vor über 90 Tagen gekauft wurden (verblasst still).
- „Oft bei <Laden>“ = die am häufigsten dort abgehakten Sachen, die gerade nicht auf der Liste stehen (höchstens 8, neueste zuerst bei Gleichstand). Darunter einmalig klein: „Merk ich mir, wenn du bei <Laden> abhakst.“
- Einstellungen → Mia → „Was ich mir gemerkt hab“: Liste „Tomaten → Rewe“ mit Löschen.
3. TESTS
- Abhaken: Zeile weg nach 1 s, Zurück innerhalb 1 s, „Im Wagen“ enthält sie.
- Tomaten 2× bei Rewe abgehakt → „Tomaten auf die Liste“ landet bei Rewe mit „wie immer“; Laden geändert → nächstes Mal neuer Laden.
- „Oft bei Rewe“ zeigt gelernte Sachen; Löschen in Einstellungen wirkt.
- Durchklick Einkauf, bilder:vergleich. Version, PR, mergen.

## Ergänzung (Koordinator, 28.10.): „Einkaufsliste stellt sich beim ersten Mal vor“
- Beim ersten Öffnen der Einkaufsliste und beim ersten Öffnen einer Laden-Seite der bekannte Seiten-Tipp oben („Mia stellt vor“, kleines Gesicht ohne Ring, nicht antippbar, „Alles klar“), danach nie wieder. Zurückholen: Einstellungen → Mia → „Tipps nochmal zeigen“.
- Einkaufsliste (3 Zeilen): „Ich merk mir, wo du was kaufst.“ / „Sag einfach ‚Tomaten auf die Liste‘, den Laden such ich aus.“ / „Abgehakt ist weg. Fürs Rezept leg ich dir Zutaten oben hin.“ (Tippfehler „merk mit“ → „merk mir“).
- Laden-Seite (einmal überhaupt, nicht je Laden): „Abhaken, was im Wagen liegt. Ich merk mir das für Rewe.“
- Erstes Mal, dass Mia einen Laden selbst gewählt hat: in der Ergebnis-Karte einmal „Hab Rewe genommen, wie letztes Mal.“
- Beispiel-Tag zeigt den Tipp auch. Test: genau einmal je Stelle, „Alles klar“ schließt, Zurückholen geht (Unit + Durchklick).
