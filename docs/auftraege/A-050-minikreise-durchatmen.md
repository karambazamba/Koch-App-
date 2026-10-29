GESAMTAUFTRAG (29.10.): Startseite mit Mini-Kreisen, Durchatmen mit Mias Stimme, Rätsel, Wundertüte
Nummern: A-050 (Paket A), A-051 (Paket B), A-052 (Paket C), A-053 (Paket D)
Tafeln: docs/tafeln/tafel-137.png (Startseite + Fenster), tafel-138.png (Durchatmen), tafel-139.png (Stimme/Klang, Handy weg).
Ersetzt: Tafel 136 und alle Ergänzungen dazu, XS-Kacheln Sport/Timer, Im-Haus-Kachel auf der Startseite. Sport-Seite bleibt Stempelkarte (Tafel 132).
Auf neuestem main aufbauen. Nicht nachfragen. In 4 Paketen bauen und JEDES einzeln testen, PR, mergen, Status in docs/auftraege.md:
  Paket A = Teil 1 + 2 (Mini-Kreise, Fenster, Im Haus weg)
  Paket B = Teil 3 + 4 (Durchatmen + Stimme/Klang)
  Paket C = Teil 5 + 6 (Rätsel, Wundertüte)
  Paket D = Teil 7 (Tests gesamt, volle Prüfung)

────────────────────────────────
TEIL 1 · MINI-KREISE AUF DER STARTSEITE (Tafel 137/1)
- Unter der Kopfzeile (Logo + Datum) eine Reihe mit bis zu 4 runden Kreisen: 64 px, Kachelfarbe, Linien-Symbol (lucide), darunter 2 kurze Zeilen (13 px fett / 11,5 px grau). Gleich verteilt, nie abgeschnitten, auch auf iPhone SE.
- Standard-Kreise (in dieser Reihenfolge):
  1. Sport: äußerer Ring = Wochenziel (Stücke wie Ziel, füllen sich je Training, Sport-Akzent). Text: nächstes Training „Do 8:00“ / „Laufen“; nichts geplant: „Sport“ / „frei“; Woche geschafft: Ring grün, „Geschafft“.
  2. Durchatmen: aktueller Vorschlag „1 Min“ / „Handy-Pause“.
  3. Timer: läuft = Restzeit groß („7:42“) + Name; sonst „Timer“.
  4. Rätsel: „Rätsel“, kleines oranges Schild „neu“ unten rechts am Kreis, wenn ein ungesehenes da ist.
- Nur Kreise für eingeschaltete Bausteine. Antippen = Fenster von unten (ui/Sheet), angetippter Kreis bekommt orangen Ring. Lange drücken = Startseite bearbeiten (Kreise wählen, ordnen, max. 4; Wetter kompakt als optionaler Kreis).
- Darunter die großen Kacheln wie bisher (Jetzt-Karte, Wetter, Pinnwand, Termine, Aufgaben, Essen, Einkauf, Wundertüte S, Notizen).
- Migration: XS-Kacheln Sport/Timer → Kreise. Im-Haus-Kachel aus der Anordnung entfernen (Bereich bleibt unter Essen mit „Was koch ich daraus?“; „bald aufbrauchen“ fließt in Essen-Vorschläge/Kochidee). Nichts löschen, Daten bleiben.

TEIL 2 · FENSTER DER KREISE (Tafel 137/2–4)
- Alle Fenster: Kopf mit rundem Symbol, Titel fett, Unterzeile grau, rechts ✕; schließen per ✕, Runterwischen, Danebentippen, Zurück. Man bleibt auf der Startseite.
- SPORT: Titel „Sport · diese Woche“, Unterzeile „Ziel 2× · Mo geschafft, Do geplant“. Stempel der Woche (wie Tafel 132, geplant = gestrichelt mit „Do 8:00“). Abschnitt „Woche planen“: Mo–So als Kreise (geschafft = voll mit Symbol, geplant = gestrichelt mit Symbol, frei = Plus). Tag tippen → orange markiert → darunter Sportart-Chips (eigene zuerst: Volleyball, Laufen, Fitness …) und Uhrzeit-Chips (8:00, 10:00, 18:00, andere) → großer Knopf „Sa 10:00 Volleyball planen“ (legt Termin im Raum „Ich“ an). Link „Schon trainiert? Eintragen“. „Alles zu Sport ›“ führt zur Sport-Seite.
- TIMER: Unterzeile „Läuft weiter, auch wenn du die App schließt“. Laufende Timer oben (Ring, Restzeit, Name, „von 10:00“, Pause, Stopp). „Neuer Timer“: 6 Felder 3 / 5 / 10 / 15 / 20 Min / Eigene – ein Tipp startet sofort. Hinweis „Oder sag Mia: ‚Timer 12 Minuten für die Eier‘“.
- RÄTSEL: warmer Hintergrund, Unterzeile „Kinder raten zuerst“, Frage groß (27 px), Lösung erst nach Antippen in gestricheltem Kasten, großer Knopf „Noch eins ›“ (beliebig oft), kleine Zeile „Antippen zeigt die Lösung · nie doppelt“.
- DURCHATMEN: siehe Teil 3.

TEIL 3 · DURCHATMEN (Baustein, Standard an) – Angebot, nie Pflicht (Tafel 138)
- 12 feste Übungen (content/durchatmen/uebungen.json; je: id, Titel, Sorte, Dauer, Schritte, Takt, Ansagen, Animation). Wiederholen sich bewusst, keine neuen nötig:
  Atmen: Kästchen-Atmen 2 Min (4 ein · 4 halten · 4 aus · 4 halten), Lang ausatmen 1 Min (4 ein · 6 aus), Seufzer 30 s (2× kurz ein, 1× lang aus, 3 Runden)
  Augen: Handy-Pause 1 Min (in die Ferne schauen), Augen kreisen 1 Min, Hände auf die Augen 1 Min
  Körper: Schultern lockern 1 Min, Kurz strecken 1 Min
  Ankommen: 5 Dinge sehen 1 Min (5 sehen, 4 hören, 3 fühlen), Füße spüren 1 Min
  Fokus: Eine Sache 2 Min, Kopf leeren 2 Min
- Fenster: Kopf „Durchatmen“ / „Kurz raus, wieder bei dir. Ganz ohne Muss.“ Grüne Karte „PASST GERADE“ mit einer Übung + Knopf „Los“ (Vorschlag nach Tageszeit: morgens Fokus, nachmittags Augen, abends Atmen; Lieblinge öfter). Darunter Sorten-Chips Alle · Atmen · Augen · Körper · Ankommen · Fokus und die Liste aller Übungen (Symbol, Titel, Dauer · Kurzbeschreibung, Herz = Liebling, Lieblinge oben). Jede Übung frei wählbar, beliebig oft wiederholbar.
- Übungs-Bildschirme:
  · Atmen: Mint-Hintergrund, groß das Wort der Phase („Ein“, „Halten“, „Aus“) + Sekunde, Kästchen bzw. Kreis mit wanderndem Punkt, „Folge dem Punkt.“, Fortschrittsbalken, „Noch 1:12“, Knöpfe „Mia zählt mit“ / „Pause“, Herz oben rechts.
  · Augen (Handy-Pause): dunkler Bildschirm, Ring-Countdown mit Auge, großer Satz „Schau so weit weg, wie es geht.“, kleiner Satz „Handy einfach hinlegen. Ich sag Bescheid.“, Gong am Ende.
  · Fokus „Eine Sache“: kurzer Chat – Mia „Was ist jetzt das Wichtigste? Nur eine Sache.“ → Antwort (sprechen/tippen) → Ergebnis-Karte „Steht oben“ (Aufgabe ganz oben, Raum geraten) → „Gut. Jetzt eine Minute nur atmen, dann los.“ → Atem-Kreis 1 Min.
  · Fokus „Kopf leeren“: einsprechen, Mia sortiert in Aufgaben/Notizen/Termine (Ergebnis-Karten), dann 1 Min Ruhe.
  · Körper/Ankommen: großer Schritt-Text, ein Schritt nach dem anderen, Symbol-Animation.
- Ende: „Gut gemacht.“ / „Zwei Minuten nur für dich.“ (Dauer passend), Knöpfe „Noch eine“ / „Fertig“. KEIN Zähler, keine Serie, keine Statistik, kein Lob-Feuerwerk, keine Gesundheitsversprechen, keine Diagnosen.
- Proaktiv höchstens 2× am Tag als leiser Satz in der Jetzt-Karte („Kurz durchatmen?“), z. B. nach 3 Terminen am Stück oder langem Tippen. Nie als Push. Abschaltbar unter Einstellungen → Durchatmen.
- Mia versteht: „Ich brauch kurz Ruhe“, „Atemübung“, „Handy-Pause“, „Kopf leeren“, „Was ist jetzt wichtig?“ → startet direkt (Prüfstand-Sätze ≥ 95 %).

TEIL 4 · MIA LEITET AN, HANDY KANN WEG (Tafel 139)
- Drei Arten oben im Übungs-Bildschirm (pro Gerät gemerkt): „Stimme + Klang“ (Standard), „Nur Klang“, „Still“ (nur Vibration/Bild).
- STIMME: feste kurze Ansagen je Übung (content/durchatmen/ansagen.json), höchstens 6 Sätze je Übung, keine Zahlen-Zählerei. Beispiele: Start „Leg das Handy weg. Ich sag dir, wann.“ · „Ein“ · „Halten“ · „Aus“ · Ende „Gut gemacht.“; Handy-Pause: „Schau so weit weg, wie es geht.“ · „Noch ein bisschen.“ · „Komm zurück.“
  Mit Lola (MIA_VOICE_ID, ElevenLabs) EINMAL vorab erzeugen (scripts/ansagen-erzeugen.mjs; weich: stability hoch, speed ca. 0,85), als kleine Audiodateien in public/audio/durchatmen/, im Service-Worker gecacht → offline, keine Kosten pro Übung. Schlüssel nur beim Erzeugen aus der Umgebung, nie im Repo. Ohne Dateien: Handy-Stimme langsam als Ersatz. Lautstärke leiser als normale Mia-Antworten.
- KLANG: weicher Atem-Ton per Web Audio (Sinus, sanft an/ab): steigt beim Einatmen, fällt beim Ausatmen; leises Klingen beim Phasenwechsel; tiefer Gong am Ende. Nie laut.
- HANDY WEGLEGEN: nach Start 3 s, dann Bildschirm dunkel (nur schwacher Atem-Kreis, kleine Ansage-Zeile, ✕ und Pause schwach sichtbar), Wake Lock an, Ton läuft weiter. Antippen = kurz hell. Handy-Pause: sofort dunkel.
- Stumm-Schalter an: einmal Hinweis „Für Ton bitte Stumm-Schalter aus.“, sonst Vibration im Takt.
- Datenschutz: keine Aufnahme, nichts gespeichert außer Liebling und Art.

TEIL 5 · RÄTSEL (eigener Bereich, Mini-Kreis)
- Pakete content/raetsel/paket-NNN.json (je 500, kindertauglich, deutsch) + Mia legt per KI (Haiku über guard.ts) nach: Vorrat von 20 im Voraus, Abgleich gegen alle gesehenen (Ähnlichkeit), kindertauglich, max. 2 Sätze. Ohne KI und ohne Vorrat: „Neue Rätsel kommen bald.“ statt Wiederholung.
- Gesehene IDs je Haushalt (im Haushalt geteilt, ohne Konto lokal). Nie doppelt.
- Kein Zähler, keine Punkte.

TEIL 6 · WUNDERTÜTE (Kachel S, bleibt)
- Inhalt: Witze, Plattdeutsch, Angeberwissen (keine Rätsel mehr). Keine Punkte unten.
- Kachel: kleine Sorte („PLATTDEUTSCH“), groß Wort/Witz/Fakt, darunter Bedeutung bzw. Pointe; Antippen = Seite. Wasserzeichen Geschenk.
- Seite: großer Knopf „Noch eine ›“ (beliebig oft), Filter Alles · Witze · Plattdeutsch · Angeberwissen, Satz „Nie doppelt. Mia legt immer neue nach.“
- Plattdeutsch: Wort/Spruch + Hochdeutsch + kurzer Beispielsatz; NUR aus geprüften Paketen (keine KI-Erfindung). Angeberwissen NUR geprüft mit Quelle (intern). Witze dürfen per KI nachgelegt werden (Vorrat 20, kindertauglich, Abgleich).
- Pakete content/wundertuete/paket-NNN.json (je 500). Gesehene IDs je Haushalt, nie doppelt. Unter 50 ungesehenen Platt/Angeberwissen → Hinweis „Paket nötig“ im Entwickler-Bereich und in docs/auftraege.md.

TEIL 7 · TESTS UND ABSCHLUSS
- Mini-Kreise: 4 passen auf SE/15 Pro/Pixel 7, Texte ganz; Sport-Ring füllt sich; „neu“-Schild; Migration XS→Kreis; Im-Haus-Kachel weg, Bereich unter Essen erreichbar.
- Fenster: Sport plant Termin (Raum Ich); Timer startet mit einem Tipp und läuft im Hintergrund; Rätsel zeigt Lösung erst nach Tippen.
- Durchatmen: jede der 12 Übungen läuft durch; frei wählbar und wiederholbar; Liebling; Vorschlag nach Tageszeit; Fokus legt Aufgabe ganz oben an; Ende ohne Zähler; proaktiv max. 2×/Tag, nie Push.
- Stimme/Klang: alle 3 Arten; Ansagen im Takt; offline; ohne Audiodateien Handy-Stimme; Bildschirm dunkel nach 3 s; Stumm-Schalter-Hinweis; reduced-motion.
- Rätsel/Wundertüte: 1.000× „Noch eins/eine“ ohne Wiederholung; KI nur Witze/Rätsel; gemeinsamer Haushalt teilt „gesehen“; Filter.
- Prüfstand: neue Mia-Sätze ≥ 95 %. Datenschutz-Doku (datenkarte, anbieter) prüfen: ElevenLabs nur beim einmaligen Erzeugen.
- Durchklick Startseite + alle Fenster, bilder:vergleich, volle Prüfung.
- Je Paket: Version hochzählen, Changelog, PR, mergen, docs/auftraege.md. Am Ende melden: was fertig ist und 3 Dinge, die ich zuerst ausprobieren soll.

────────────────────────────────
NACHTRAG (Tafel 140, gehört zu Paket A): Beispiel-Startseite neu ordnen + Wasserzeichen in allen XS
Tafel als docs/tafeln/tafel-140.png ablegen.

1. STANDARD-ANORDNUNG (Beispiel-Startseite und neue Nutzer)
- Familie / zu zweit:
  1. Jetzt-Karte
  2. Mini-Kreise (Sport · Durchatmen · Timer · Rätsel)
  3. Links Wetter (XS) über Notizen (XS), rechts Pinnwand (S, so hoch wie beide XS zusammen)
  4. Termine (3 Zeilen, Höhe = Inhalt)
  5. Aufgaben (3 Zeilen, Höhe = Inhalt)
  6. Essen (S) neben Wundertüte (S)
  7. Einkauf (M breit, bis zu 3 Läden nebeneinander als Chips mit Anzahl)
- Allein (Pinnwand aus): Wetter (XS) über Notizen (XS) links, rechts Wundertüte (S); danach Termine, Aufgaben, Essen (M breit), Einkauf.
- Gilt für die Beispiel-Startseite (Demo) und als Standard nach „Für wen soll ich sortieren?“. Bestehende Nutzer: eigene Anordnung bleibt (nie von selbst ändern), in „Startseite bearbeiten“ Knopf „Neue Standard-Ordnung übernehmen“.
- Raster: zwei XS übereinander = genau so hoch wie eine S daneben (Abstand eingerechnet).

2. WASSERZEICHEN IN ALLEN GRÖSSEN
- Jede Kachel ohne eigenes Bild bekommt ihr Wasserzeichen auch in XS (ca. 90–100 px, unten rechts angeschnitten, 12–13 %, nie über Text): Notizen = Zettel, Timer = Timer, Termine = Kalender, Aufgaben = Häkchen, Einkauf = Wagen, Wundertüte = Geschenk bzw. bei „Platt för Plietsche“ Anker.
- Wetter (Himmel), Pinnwand (Zettel/Fotos), Essen (Foto) ohne Wasserzeichen.
- Test „jede Kachel ohne Bild hat in XS/S/M ein Wasserzeichen“.

3. KLEINKRAM AUS DEM SCREENSHOT
- Notizen-Leertext überall gleich: „Schnell notieren …“ (ohne Stift-Symbol im Text, Stift nur oben rechts als Knopf).
- Wundertüte-Titel je Sorte: „Platt för Plietsche“ (Plattdeutsch), „Wundertüte“ (Witze/Angeberwissen) – bleibt, gefällt.

TESTS: bilder:vergleich Beispiel-Startseite Familie/zu zweit/allein auf SE/15 Pro/Pixel 7; XS-Paar so hoch wie S; Wasserzeichen in XS sichtbar und nicht über Text.

────────────────────────────────
NACHTRAG 2 (gehört zu Paket A): Einkauf-Kachel M – Läden nebeneinander (Tafel 140, unten)

1. EINKAUF M (breit, eine Reihe)
- Kopf: Symbol + „EINKAUF“, rechts Plus (Schnelleingabe).
- Darunter EINE Reihe mit bis zu 3 Laden-Chips nebeneinander, gleich breit: links farbiger Strich in Ladenfarbe, Laden-Name (14 px fett), rechts Anzahl in Ladenfarbe. Reihenfolge: meiste Sachen zuerst, bei Gleichstand der zuletzt genutzte Laden.
- Mehr als 3 Läden: dritter Chip wird „+2 weitere“ (gleiche Breite, grau), antippen = Einkaufsliste.
- „Ohne Laden“-Sachen: kleine Zeile unter der Reihe „6 ohne Laden · Sortieren ›“ (nur wenn > 0).
- Chip antippen = direkt die Laden-Seite („Bei Rewe einkaufen“), Rest der Kachel = Einkaufsliste.
- Höhe = Inhalt (Kopf + eine Reihe + ggf. Zeile), kein Leerraum. Wasserzeichen Wagen unten rechts, nie über den Chips.
- Leer: „Liste ist leer. Plus tippen oder Mia sagen.“

2. EINKAUF S (halbe Breite) bleibt untereinander (bis 3 Zeilen), wie bisher.

3. NIE ABGESCHNITTEN
- Lange Laden-Namen („Rossmann“, „Kaufland“) passen: Schrift notfalls 13 px. Keine Abkürzungen wie „Kaufl.“ – passt es dann immer noch nicht, lieber 2 Chips + „+n weitere“.
- Test SE/15 Pro/Pixel 7 mit Edeka/Rewe/Rossmann und mit 5 Läden.

────────────────────────────────
NACHTRAG 3 (gehört zu Paket A): Pinnwand-Kachel mit Korkrahmen (Tafel 141 A)
Tafel als docs/tafeln/tafel-141.png ablegen.
- Pinnwand-Kachel (XS/S/M) bekommt statt Wasserzeichen einen Rahmen: 7 px innen eingerückt, Rand 6 px in Kachel-Akzent mit ca. 16 % Deckkraft, Radius 16 px (Kachel 22 px).
- Innenfläche: ganz feine Kork-Punkte (zwei versetzte Punkt-Raster, Akzent 7–10 %), nur dekorativ, aria-hidden.
- Zettel und Fotos liegen IN dem Rahmen (Abstand zum Rand ≥ 8 px), Pins farbig wie bisher; Titelzeile und Plus liegen über dem Rahmen und bleiben voll lesbar.
- Passt sich der gewählten Kachel-Farbe an (Tafel 108), Hell/Dunkel (Dunkel: Rand 20 %, Punkte 6 %). Look „Schlicht“: nur feiner Rand, keine Punkte.
- Die Pinnwand-Seite selbst bekommt denselben Rahmen um die Wand (statt der jetzigen grauen Fläche).
- Test: bilder:vergleich Pinnwand-Kachel S/M in 8 Farben, Hell/Dunkel, Farbig/Schlicht; Zettel nie über dem Rahmen abgeschnitten.

────────────────────────────────
KLARSTELLUNG (zu Tafel 135, gilt auch für Paket A): Kachelhöhe von Termine/Aufgaben wächst und schrumpft mit dem Inhalt – 1 Eintrag = Kopf + 1 Zeile, 2 = 2 Zeilen, 3 = 3 Zeilen, mehr = 3 Zeilen + „+n weitere“ im Kopf. Leer: Kopf + ein freundlicher Satz (eine Zeile). Darunter immer nur 14 px Rand. Gilt genauso für Einkauf S und Notizen. Steht eine Listen-Kachel neben einer anderen Kachel, bekommen beide die Höhe der größeren. Test mit 0, 1, 2, 3 und 5 Einträgen.

════════════════════════════════
ERSETZT TEIL 1 + 2 (Auftrag „Mini-Kreise final“, Tafel 143; ersetzt alle früheren Kreis-Angaben)
Tafeln: tafel-137.png (Fenster), tafel-140.png (Startseite), tafel-142.png (Was los? – NICHT angekommen → wartet auf Tafel 142), tafel-143.png (Kreise).

1 · REIHE
- Direkt unter der Kopfzeile (Logo + Datum), über allen Kacheln (Jetzt-Karte, wenn sichtbar, kommt darüber).
- NICHT wischbar (Wischen wechselt die Seite Kalender · Heute · Essen).
- Bis zu 5 Kreise, gleich verteilt über die ganze Breite: 5 Kreise = 56 px, 4 oder weniger = 64 px. Abstand zum Rand 14 px.
- Unter jedem Kreis genau EIN Wort, 12,5 px (bei 4: 13 px) fett, mittig, keine zweite Zeile, nie „…“, alle Wörter ganz auf iPhone SE.
- Farben: jeweils Kachelfarbe des Bereichs als Kreisfläche, Linien-Symbol (lucide) in Akzentfarbe, 23 px (bei 4: 26 px). Look „Schlicht“: weiße Kreise mit feinem Rand.

2 · DIE KREISE (Standard in dieser Reihenfolge)
- Sport (Laufschuh bzw. Symbol der nächsten Sportart): Ring außen = Wochenziel, Stücke füllen sich je Training; Woche geschafft = Ring grün. Antippen = Fenster „Sport · diese Woche“ (Stempel + Woche planen, Tafel 137/2).
- Pause (Wind-Symbol): öffnet Durchatmen-Fenster mit Vorschlag oben (Tafel 138). Unter dem Kreis immer nur „Pause“.
- Was los? (Fahne, Blau): öffnet „Was ist los in <Wohnort>?“ (Tafel 142). Keine Zahl, kein Tipp unter dem Kreis. Ausgeblendet, wenn in 14 Tagen nichts da ist oder Quelle aus.
- Rätsel (Puzzle): Schild „neu“ (klein, orange, unten rechts am Kreis), wenn ein ungesehenes da ist. Öffnet Rätsel-Fenster (Tafel 137/4).
- Timer (Stoppuhr): nur wenn Baustein an. Öffnet Timer-Fenster (Tafel 137/3).
- Läuft ein Timer: Timer-Kreis zeigt die Restzeit groß IM Kreis (statt Symbol, orange), oranger Fortschritts-Ring, rückt an Position 1. Mehrere Timer: der kürzeste. Nach Ablauf zurück an seinen Platz. Ist der Timer-Baustein aus, erscheint der Kreis nur während ein Timer läuft (dann als 5. bzw. vorn, ggf. wird Rätsel so lange ausgeblendet).
- Nur Sport hat einen Ring, nur Rätsel ein Schild – sonst keine Zahlen, keine Plaketten.

3 · BEDIENUNG
- Antippen = Fenster von unten (ui/Sheet), angetippter Kreis bekommt kurz orangen Rand; schließen per ✕, Runterwischen, Danebentippen, Zurück. Man bleibt auf der Startseite.
- Lange drücken = Startseite bearbeiten. Dort Abschnitt „Kreise oben“: an/aus und Reihenfolge ziehen; Hinweis „Höchstens 5 Kreise“.
- Mia kann es auch: „Nimm Rätsel oben raus“, „Timer nach vorn“.

4 · MIGRATION
- XS-Kacheln Sport und Timer → Kreise (nichts löschen). Im-Haus-Kachel aus der Startseite entfernen (Bereich bleibt unter Essen).
- Bestehende Nutzer: Kreise erscheinen mit Standard-Reihenfolge für eingeschaltete Bausteine; eigene Kachel-Anordnung bleibt.
- Beispiel-Startseite (Demo) und neue Nutzer: Anordnung laut Tafel 140 mit Kreisen laut Tafel 143.

5 · TESTS
- 5 Kreise = 56 px, 4 = 64 px; alle Wörter ganz auf iPhone SE / 15 Pro / Pixel 7; Reihe nicht wischbar, Seitenwechsel per Wischen funktioniert weiter.
- Sport-Ring füllt sich und wird grün; Rätsel „neu“ verschwindet nach Ansehen; Timer läuft → Restzeit im Kreis, Position 1, danach zurück.
- Was los? ausgeblendet ohne Einträge; Startseite bearbeiten: an/aus, Reihenfolge, max. 5.
- Migration XS → Kreise, Im Haus weg und unter Essen erreichbar.
- bilder:vergleich Startseite Familie/zu zweit/allein, Hell/Dunkel, Farbig/Schlicht.

NACHTRAG (gilt vor allem anderen zu Kreisen): Beim Rätsel-Kreis KEIN Schild „neu“. Alle Kreise ohne Schilder, Zahlen oder Plaketten – einziges Zeichen bleibt der Wochen-Ring bei Sport (und die Restzeit im Timer-Kreis, wenn ein Timer läuft). Test „neu verschwindet“ entfällt → stattdessen Test „kein Schild/keine Zahl an Kreisen außer Sport-Ring und Timer-Restzeit“.
