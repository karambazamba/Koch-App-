# A-034 Nachtrag zu A-020: gleiche Räume für Termine und Aufgaben, klare Vorauswahl (Wortlaut 28.10.)

- Termine UND Aufgaben haben dieselben drei Räume: Familie (alle im Haushalt sehen es) · Ich (nur ich, grau) · Arbeit (nur ich, blau). Ohne Konto/allein: Familie heißt wie bisher „Privat“, „Ich“ entfällt.
- Vorauswahl: Termine = Familie, Aufgaben = Ich. Mia rät aus dem Satz (Schule/Kinder/Oma/Geburtstag → Familie; Meeting/Kunde/Lieferant/Büro → Arbeit; Arzt/Friseur → Ich), Chip mit einem Tipp änderbar.
- Familien-Aufgaben: alle sehen sie, jeder darf abhaken, klein „erledigt von Lisa“. „An … geben“ bleibt.
- „Ich“ und „Arbeit“ in Supabase nur für den Besitzer (RLS wie Arbeit), Test in tests/datenbank/sicherheit.test.sql. Bestehende Aufgaben: wie bisher dem Ersteller gehörend → „Ich“ (Migration, nichts verlieren); bestehende Termine bleiben Familie bzw. Arbeit.
- Durchklick mit zwei Konten: Familie-Termin/-Aufgabe kommt beim Partner an, Ich/Arbeit nicht.

## Ergänzung: überall gleich bedienen, Mia rät und lernt
- EINE Raum-Wahl als Komponente (ui/RaumChips): drei Chips „Familie · Ich · Arbeit“, gleiche Reihenfolge, gleiche Farben (Orange · Grau · Blau), überall gleich: Schnelleingabe (＋), Mias Bestätigung („Steht drin. Familie ⌄“), Detail-Fenster, Bearbeiten. Kein zweites Bedienmuster.
- Mia wählt vor, der passende Chip ist schon aktiv. Beim allerersten Mal ein kleiner Satz darunter: „Hab Familie gewählt. Tippen zum Ändern.“ Danach nie wieder.
- Mia lernt: Korrigiert man den Raum, merkt sie sich das Stichwort (z. B. „Zahnarzt“ → Ich, „Peter“ → Arbeit) und wählt beim nächsten Mal richtig. Lokal gespeichert, löschbar unter Einstellungen → Mia → „Was ich mir gemerkt hab“.
- Raum später ändern: im Detail-Fenster per Chip oder lange drücken auf die Zeile → „Für Familie / Nur ich / Arbeit“. Mit Rückgängig.
- Gleiche Anzeige in allen Listen: Familie ohne Kennzeichen, Ich mit kleinem grauem Schloss, Arbeit mit blauem Schild. Kalender genauso.
- Prüfstand: ≥ 30 Sätze für die Raum-Wahl (Termin und Aufgabe), Ziel ≥ 95 %.
