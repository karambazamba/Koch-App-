// Mia denkt mit: Spruch des Tages auf der Jetzt-Karte. Feste Bibliothek
// (rund 200 Sprüche) nach Anlass, Ton wie CLAUDE.md: knapp, norddeutsch,
// warm, kein Druck, nichts vorrechnen, keine Gedankenstriche. Höchstens ein
// Spruch am Tag, nie derselbe innerhalb von 30 Tagen (`pickSpruch`).

export type SpruchAnlass =
  | "montag"
  | "dienstag"
  | "mittwoch"
  | "donnerstag"
  | "freitag"
  | "samstag"
  | "sonntag"
  | "sonne"
  | "regen"
  | "kalt"
  | "warm"
  | "schnee"
  | "wind"
  | "fruehling"
  | "sommer"
  | "herbst"
  | "winter"
  | "feiertag"
  | "erledigt"
  | "wochenende"
  | "ferien"
  | "immer";

const SPRUECHE: Record<SpruchAnlass, string[]> = {
  montag: [
    "Montag. Wir fangen einfach mal an.",
    "Neue Woche, frischer Kaffee.",
    "Montag ist auch nur ein Tag mit Anlauf.",
    "Einmal durchatmen, dann läuft die Woche.",
    "Moin Montag. Wir kriegen das hin.",
    "Die Woche ist noch ganz neu. Schön eigentlich.",
    "Ein Schritt nach dem anderen.",
    "Montags darf’s auch langsam losgehen.",
  ],
  dienstag: [
    "Dienstag. Der unterschätzte Tag.",
    "Heute läuft’s sich schon rund.",
    "Dienstag ist wie Montag, nur entspannter.",
    "Kein großes Ding heute. Gut so.",
    "Dienstag. Alles im Fluss.",
    "Ein ganz normaler Dienstag. Herrlich.",
    "Heute einfach weitermachen.",
    "Dienstag. Tee oder Kaffee, Hauptsache warm.",
  ],
  mittwoch: [
    "Bergfest. Ab hier geht’s bergab, im guten Sinn.",
    "Mittwoch. Halbzeit.",
    "Die Woche hat jetzt ihre Mitte gefunden.",
    "Mittwoch ist der Gipfel. Kurz Aussicht genießen.",
    "Halbe Woche geschafft. Mehr muss man dazu nicht sagen.",
    "Mittwoch. Zeit für ein kleines Päuschen zwischendurch.",
    "Mitte der Woche, Ruhe im Kopf.",
    "Mittwoch. Läuft.",
  ],
  donnerstag: [
    "Donnerstag. Das Wochenende winkt schon.",
    "Fast Freitag. Das zählt auch.",
    "Donnerstag ist der kleine Freitag.",
    "Heute schon mal ans Wochenende denken. Erlaubt.",
    "Donnerstag. Die Woche wird weich.",
    "Noch ein Tag, dann wird’s gemütlich.",
    "Donnerstag. Gut im Rennen.",
    "Donnerstag hat was. Weiß nur keiner genau was.",
  ],
  freitag: [
    "Freitag. Die Woche darf gehen.",
    "Moin Freitag, schön dich zu sehen.",
    "Freitags schmeckt der Kaffee besser.",
    "Feierabend ist heute ein besonders schönes Wort.",
    "Freitag. Jetzt nur noch die Kurve kriegen.",
    "Die Woche ist so gut wie im Kasten.",
    "Freitag. Pizza wäre keine schlechte Idee.",
    "Heute Abend darf’s gemütlich werden.",
  ],
  samstag: [
    "Samstag. Kein Wecker, kein Stress.",
    "Heute zählt nur, worauf ihr Lust habt.",
    "Samstag. Brötchen und Zeit.",
    "Wochenende. Der Kalender darf mal Pause machen.",
    "Samstag. Einfach treiben lassen.",
    "Heute mal Zeit für die schönen Sachen.",
    "Samstag. Die Couch hat auch Gefühle.",
    "Ein guter Tag für nichts Besonderes.",
  ],
  sonntag: [
    "Sonntag. Langsam ist heute genau richtig.",
    "Sonntags darf alles etwas länger dauern.",
    "Sonntag. Frühstück ohne Uhr.",
    "Heute einfach mal nichts vorhaben.",
    "Sonntag. Füße hoch, Kopf frei.",
    "Ein Tag zum Auftanken.",
    "Sonntag. Spaziergang oder Sofa, beides gut.",
    "Morgen ist auch noch ein Tag. Heute ist Sonntag.",
  ],
  sonne: [
    "Die Sonne ist da. Raus mit euch, wenn ihr mögt.",
    "Sonne satt. Ein guter Tag für einen Spaziergang.",
    "Heute scheint’s. Das hebt die Laune.",
    "Sonnenbrillen-Wetter.",
    "Bei so einem Licht sieht alles freundlicher aus.",
    "Die Sonne macht heute Überstunden.",
    "Ein Sonnentag. Kaffee schmeckt draußen besser.",
    "Blauer Himmel über Holstein. Schön.",
  ],
  regen: [
    "Regen. Perfektes Wetter für Tee und Decke.",
    "Draußen nass, drinnen gemütlich.",
    "Regen ist auch nur Wetter mit Sound.",
    "Schietwetter. Dafür gibt’s ja Sofas.",
    "Ein guter Tag für Suppe.",
    "Regenjacke an, Laune bleibt.",
    "Heute ist Gummistiefelwetter.",
    "Der Garten freut sich. Wir bleiben drin.",
  ],
  kalt: [
    "Kalt draußen. Dicke Socken machen’s gemütlich.",
    "Frisch heute. Schal raus.",
    "Bei der Kälte schmeckt Kakao doppelt.",
    "Kalt, aber klar. Norddeutsches Wetter eben.",
    "Heute lieber eine Schicht mehr.",
    "Frostiger Morgen. Warme Hände ans Kaffeeglas.",
    "Kalte Nase, warmes Herz.",
    "Kälte ist nur ein Grund für Pullover.",
  ],
  warm: [
    "Warm heute. Eis ist eine Option.",
    "Sommerlich. Eine Kanne Wasser auf dem Tisch tut gut.",
    "Heute ist T-Shirt-Wetter.",
    "Warm draußen. Schatten ist dein Freund.",
    "So warm, da schmeckt Salat am besten.",
    "Warme Luft, gute Laune.",
    "Heute einfach Fenster auf und Sommer rein.",
    "Ein Tag für kalte Getränke.",
  ],
  schnee: [
    "Schnee. Kurz staunen, dann Mütze auf.",
    "Alles weiß. Sieht friedlich aus.",
    "Schnee in Holstein. Selten genug, um sich zu freuen.",
    "Ein guter Tag für Schneemänner.",
    "Draußen weiß, drinnen warm.",
    "Schneeflocken. Langsam fahren, schnell freuen.",
  ],
  wind: [
    "Ordentlich Wind heute. Typisch Norden.",
    "Wind von vorn. Mütze gut festhalten.",
    "Frischer Wind. Pustet den Kopf frei.",
    "Heute weht’s. Wäsche trocknet dafür fix.",
    "Windig. Die Frisur hat heute frei.",
    "Steife Brise. Echtes Küstengefühl.",
  ],
  fruehling: [
    "Frühling. Alles fängt wieder an zu blühen.",
    "Die Tage werden länger. Schön.",
    "Vögel zwitschern früh. Die haben’s gut.",
    "Frühlingsluft. Fenster auf.",
    "Erste Blumen. Der Winter packt die Koffer.",
    "Frühling. Ein guter Monat für Neues.",
  ],
  sommer: [
    "Sommer. Abends lange hell, herrlich.",
    "Sommerzeit ist Draußenzeit.",
    "Erdbeeren, Eis und lange Abende.",
    "Sommer. Grillen wär eine Idee.",
    "Barfußwetter.",
    "Sommer im Norden. Kurz, aber schön.",
  ],
  herbst: [
    "Herbst. Zeit für Kürbis und Kerzen.",
    "Bunte Blätter, warme Socken.",
    "Herbst. Die gemütliche Jahreszeit.",
    "Draußen raschelt’s. Drinnen dampft der Tee.",
    "Herbstlicht ist das schönste Licht.",
    "Herbst. Ein guter Grund für Suppe.",
  ],
  winter: [
    "Winter. Lichterketten machen alles besser.",
    "Kurze Tage, lange Abende auf dem Sofa.",
    "Winter. Zeit für Kekse und Decken.",
    "Draußen dunkel, drinnen hell und warm.",
    "Winter im Norden. Grau mit Herz.",
    "Kerzen an, Füße hoch.",
  ],
  feiertag: [
    "Feiertag. Heute muss gar nichts.",
    "Ein freier Tag mitten in der Woche. Geschenk.",
    "Feiertag. Ausschlafen ist heute offiziell.",
    "Heute hat der Kalender frei.",
    "Feiertag. Einfach genießen.",
    "Ein Tag zum Durchatmen.",
    "Frei heute. Schön, dass es so was gibt.",
    "Feiertag. Die Welt dreht sich auch ohne uns.",
  ],
  erledigt: [
    "Heute lief’s rund.",
    "Ganz schön was weggeschafft. Kurz zurücklehnen.",
    "Heute war ein guter Tag zum Abhaken.",
    "Läuft bei euch.",
    "Das fühlt sich aufgeräumt an.",
    "Heute geht’s leicht von der Hand.",
    "Viel geschafft. Jetzt darf’s ruhig werden.",
    "Ordentlich was gemacht. Zeit für einen Tee.",
    "Alles schön sortiert heute.",
    "So ein Tag darf gern öfter kommen.",
    "Heute ging einiges. Schön.",
    "Feierabend fühlt sich heute leicht an.",
  ],
  wochenende: [
    "Wochenende. Endlich Zeit füreinander.",
    "Zwei Tage ohne Wecker. Herrlich.",
    "Wochenende. Das Sofa ruft.",
    "Heute zählt Gemütlichkeit mehr als alles andere.",
    "Wochenende. Mal schauen, was der Tag so bringt.",
    "Kein Plan ist auch ein Plan.",
    "Wochenende. Frühstück darf heute lange dauern.",
    "Raus ins Grüne oder rein ins Kissen. Beides gut.",
    "Wochenende. Die Woche ist weit weg.",
    "Zeit für die kleinen schönen Dinge.",
  ],
  ferien: [
    "Ferien. Die Uhr läuft heute anders.",
    "Ferienzeit. Ausschlafen ist erlaubt.",
    "Ferien. Zeit für Ausflüge oder einfach nichts.",
    "Kein Schulbrot heute. Auch mal schön.",
    "Ferien. Der Alltag macht Pause.",
    "Ferien. Lange Tage, gute Laune.",
    "Ferienmodus an.",
    "Ferien. Mal schauen, wohin der Tag führt.",
  ],
  immer: [
    "Moin. Schön, dass du da bist.",
    "Eins nach dem anderen. Klappt schon.",
    "Kaffee hilft. Fast immer.",
    "Heute wird ein guter Tag. Gefühl sagt das.",
    "Ruhig bleiben, weitermachen.",
    "Ich hab den Überblick. Du kannst entspannen.",
    "Ein Lächeln kostet nix.",
    "Kleine Schritte sind auch Schritte.",
    "Alles halb so wild.",
    "Ein bisschen Ordnung, ein bisschen Chaos. Passt schon.",
    "Tief durchatmen. Läuft.",
    "Was nicht passt, wird passend gemacht.",
    "Heute einfach mal machen.",
    "Gute Laune ist ansteckend.",
    "Schnack mich an, wenn was ist.",
    "Mal sehen, was heute so passiert.",
    "Ich merk mir das für dich.",
    "Dein Alltag ist bei mir gut aufgehoben.",
    "Einfach mal tief Luft holen.",
    "Norddeutsch gesagt: läuft.",
    "Alles im grünen Bereich.",
    "Sonne im Herzen hilft auch bei Wolken.",
    "Ein Tag nach dem anderen.",
    "Manchmal reicht schon ein guter Tee.",
    "Was heute nicht klappt, klappt morgen.",
    "Wir machen das zusammen.",
    "Ich hab schon mal sortiert.",
    "Ein ruhiger Kopf ist Gold wert.",
    "Schön, dass es dich gibt.",
    "Heute nehmen wir’s, wie’s kommt.",
    "Erst mal ankommen.",
    "Ein guter Tag fängt mit einem Moin an.",
    "Alles zu seiner Zeit.",
    "Wird schon. Wird immer.",
    "Ich bin da, wenn du mich brauchst.",
    "Kleiner Plan, große Ruhe.",
    "Heute ist ein Tag wie gemacht für dich.",
    "Langsam ist auch eine Geschwindigkeit.",
  ],
};

const WOCHENTAG: SpruchAnlass[] = ["montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"];

/** Anlässe für heute, wichtigste zuerst (Feiertag/Ferien vor Wetter vor Wochentag) */
export function anlaesse(o: { weekday: number; month: number; feiertag?: boolean; ferien?: boolean; wetter?: "sonne" | "regen" | "kalt" | "warm" | "schnee" | "wind" | null; vielErledigt?: boolean }): SpruchAnlass[] {
  const out: SpruchAnlass[] = [];
  if (o.feiertag) out.push("feiertag");
  if (o.ferien) out.push("ferien");
  if (o.vielErledigt) out.push("erledigt");
  if (o.wetter) out.push(o.wetter);
  if (o.weekday >= 5) out.push("wochenende");
  out.push(WOCHENTAG[o.weekday]);
  out.push(o.month <= 2 || o.month === 12 ? "winter" : o.month <= 5 ? "fruehling" : o.month <= 8 ? "sommer" : "herbst");
  out.push("immer");
  return out;
}

/**
 * Spruch für heute: aus dem ersten Anlass, der noch einen Spruch hat, der in
 * den letzten 30 Tagen nicht kam; stabil über den Tag (`seed` = Datum).
 */
export function pickSpruch(anlass: SpruchAnlass[], letzte: { text: string; date: string }[], today: string): string | null {
  const cutoff = Date.parse(`${today}T12:00:00Z`) - 30 * 86_400_000;
  const recent = new Set(letzte.filter((l) => Date.parse(`${l.date}T12:00:00Z`) > cutoff).map((l) => l.text));
  const seed = [...today].reduce((a, c) => a + c.charCodeAt(0), 0);
  for (const a of anlass) {
    const frei = SPRUECHE[a].filter((s) => !recent.has(s));
    if (frei.length) return frei[seed % frei.length];
  }
  return null;
}

/** Alle Sprüche (für Tests: Ton, Anzahl) @public */
export const alleSprueche = () => Object.values(SPRUECHE).flat();
