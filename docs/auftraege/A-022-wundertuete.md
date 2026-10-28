# A-022 Mias Wundertüte – eine Kachel, die jeden Tag anders heißt

Vorlage: `docs/tafeln/tafel-116.png`. Ersetzt „Kachel Angeberwissen“ und alle
Nachträge dazu. **Zurückgestellt bis der Feature-Stopp (Launch „Mia 1.0“)
vorbei ist – nicht vorher bauen.** Wortlaut des Auftrags:

Ziel: Eine kleine, sympathische Kachel, die den Tag versüßt: unnützes Wissen,
Plattdeutsch, Fragen und Mini-Spiele für den Esstisch. Nie flach, nie albern,
nie Druck. Geprüft statt erfunden.

## A) Baustein und Kachel
1. Neuer Baustein „Mias Wundertüte“ (Standard aus, in der Kachel-Auswahl
   zuschaltbar), Größe S und M. Kurzbeschreibung: „Jeden Tag was Neues:
   Angeberwissen, Platt, Rätsel und Spiele für den Tisch.“
2. Sieben Sorten, je mit eigenem Kopf (Symbol lucide + Name in
   Großbuchstaben) und Farbe aus der Palette (Tafel 108):
   - Angeberwissen · Flieder · Lightbulb · tagsüber
   - Platt för Plietsche · Mint · Anchor · tagsüber
   - Rätselstunde · Vanille · Puzzle · tagsüber
   - Heute vor 100 Jahren · Sand · Calendar · nur an Tagen mit sicher
     belegtem Ereignis
   - Tischrunde · Pfirsich · MessageSquare · ab 17 Uhr
   - Schätz mal! · Lavendel · Scale · ab 17 Uhr
   - Wer zuerst … · Rosé · Dice · ab 17 Uhr

   Abend-Sorten (Tischrunde, Schätz mal, Wer zuerst) nur bei Haushalt „zu
   zweit“/„Familie“; bei „allein“ abends Wissen/Platt/Rätsel.
3. Vorderseite: Kopf, Frage (max. 3 Zeilen, groß, fett), unten links kurzer
   Hinweis je Sorte („Abends, zum Essen“, „Wer am nächsten dran ist,
   gewinnt“, „Kinder raten zuerst“, „‚Plietsch‘ = schlau“, „Mini-Spiel, 1
   Minute“, „Zum Staunen“), unten rechts drei Punkte = wie oft diese Karte
   schon angezeigt wurde.
4. Rückseite (wo es eine Antwort gibt): weiß mit farbigem Rand, Kopf, Antwort
   1–2 Sätze mit EINER fetten Zahl/einem fetten Wort, unten „Nochmal tippen =
   Neues“, oben rechts Teilen-Knopf („Wusstest du …? – von Mia“ über das
   Teilen-Menü). Tischrunde und Wer zuerst haben keine Rückseite (Antippen =
   nächste Karte).
5. M (breit): gleiche Karte wie S, nur breiter – Frage größer, Hinweis und
   Punkte unten, Rückseite gleich (Nachtrag).

## B) Wechsel
6. Antippen = umdrehen (sanfte 3D-Drehung ~0,6 s; reduced-motion =
   Überblenden), nochmal antippen = nächste Karte.
7. Nicht angetippt: nach 3 Anzeigen (App-Öffnungen mit sichtbarer Kachel)
   automatisch die nächste. Punkte zählen mit.
8. Nie zweimal dieselbe Sorte hintereinander. Passendes zuerst: Wetter
   (Regen → Regen-Fakt, „Schietwedder“ nur an Regentagen), Essen des Tages,
   Wochentag, Jahreszeit, Feiertag.
9. Beispiel-Tag: zeigt eine feste Beispielkarte (Angeberwissen) mit leisem
   „Beispiel“.

## C) Pool und Nachfüllen
10. Inhalte als Datendateien je Sorte (`src/lib/wundertuete/data/*.ts`):
    jeder Eintrag mit fester ID, Sorte, Text vorne, Text hinten (falls
    vorhanden), optional Anlass (Wetter/Saison/Wochentag/Gericht), bei
    Fakten/Zahlen/Jahrestagen Pflichtfeld Quelle (seriöse Quelle, nicht
    angezeigt).
11. Start-Pool: Angeberwissen ~365, Platt ~100, Rätsel ~80, Tischrunde ~100,
    Schätz mal ~60, Wer zuerst ~40, Heute vor 100 Jahren an jedem Tag, wo
    sicher belegt. Jede Zahl und jeden Fakt beim Schreiben gegen die Quelle
    prüfen; im Zweifel weglassen.
12. Inhaltsregeln: kindgerecht, Mia-Ton (trocken, norddeutsch, nie albern),
    keine Gesundheitsratschläge, keine Politik/Religion, nichts über
    Körper/Gewicht, keine Stereotype, kein Emoji in der Kachel. Platt: echte
    Wörter mit korrekter Bedeutung.
13. Keine Wiederholung: pro Gerät gezeigte IDs speichern
    (Speicher-Verzeichnis, Migration, Sicherung). Gezeigtes erst wieder, wenn
    alle Einträge der Sorte durch sind; dann neu gemischt.
14. Test „keine Dubletten“: doppelte IDs verboten; ähnliche Texte
    (normalisiert, starke Stichwort-Überschneidung) als Fehler.
15. `docs/bereiche/wundertuete.md`: Regeln zum Nachfüllen, Zählung je Sorte.
    Nachfüllen später als kleiner Monats-Auftrag „Wundertüte nachfüllen“ mit
    ~60 neuen Einträgen.

## D) Mia
16. „Erzähl mir was Unnützes“, „Angeberwissen“, „Gib uns eine Tischfrage“,
    „Rätsel!“ → Mia liest die passende Karte vor (Frage, kurze Pause,
    Antwort; bei Rätsel erst auf „Lösung“). Prüfstand-Sätze ergänzen.

## E) Tests
17. Sortenwechsel ohne Wiederholung, nach 3 Anzeigen weiter,
    Antippen-Ablauf (umdrehen/nächste), Tageszeit- und Haushalt-Regeln,
    Passung (Regen → Regen-Inhalt), Dubletten-Test, Quelle Pflicht bei
    Fakten, Teilen, Beispiel-Tag, S/M, hell/dunkel, Schlicht,
    reduced-motion. Bilder, Version, PR, mergen. Nicht nachfragen.

Name in der Kachel-Auswahl laut Tafel: „Mias Wundertüte“ (Favorit);
Alternativen „Klönkiste“, „Mia hat was“, „Für Plietsche“.

## Änderung 28.10. (Sortier-Auftrag)
Nicht zurückstellen, sondern als Punkt 9a/10a direkt nach der Sport-Kachel (A-029) bauen. Als Baustein, für neue Nutzer standardmäßig AN als S-Kachel. Inhalte nur geprüfte Fakten (Quelle intern vermerken), kindertauglich, nie Punkte/Streaks/Zähler. Ausnahme von der Launch-Regel „keine neuen Funktionen“ – von Felix so gewollt.
