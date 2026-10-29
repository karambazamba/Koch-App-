// „Was los?“: Kategorien selbst abgeleitet aus dem Titel (die Quelle liefert
// keine passenden): Kinder & Familie, Kultur, Draußen, Markt, Sonstiges. Ein
// Eintrag kann mehrere haben (Herbstmarkt mit Kinderprogramm = Markt + Kinder).
// Nur aus dem Titel bzw. der Art der Veranstaltung, nie aus der Adresse
// („Markt 19“ ist kein Markt).

import type { Haushalt } from "@/lib/core/haushalt";

export type Kategorie = "kinder" | "kultur" | "draussen" | "markt" | "sonstiges";
export const KATEGORIEN: Kategorie[] = ["kinder", "kultur", "draussen", "markt", "sonstiges"];

/** Namen in Einstellungen und Mias Antworten */
export const KATEGORIE_NAME: Record<Kategorie, string> = { kinder: "Kinder & Familie", kultur: "Kultur", draussen: "Draußen", markt: "Markt", sonstiges: "Sonstiges" };

const REGELN: [Kategorie, RegExp][] = [
  ["kinder", /kinder|kind(?![a-zäöüß])|familie|laterne|bastel|märchen|puppen|kita(?![a-zäöüß])|jugend|ferienprogramm|kids|eltern/i],
  ["markt", /markt|märkte|flohmarkt|trödel|basar|bazar|kunsthandwerk/i],
  ["draussen", /wanderung|wandern|radtour|fahrrad|spaziergang|nachtwächter|natur|strand|see(?![a-zäöüß])|seen|park(?![a-zäöüß])|garten|schiff|kutsch|draußen|im freien|open air|laufen|lauf(?![a-zäöüß])|stadtführung|exkursion|vogel|pilz|biike|feuer/i],
  ["kultur", /museum|ausstellung|konzert|theater|lesung|kino|film|vortrag|führung|oper|chor|kunst|galerie|musik|kabarett|orgel|jazz|fotografie|tanz|beletage|bibliothek/i],
];

/** Kategorien aus dem Titel (und optional der Art der Veranstaltung); nie leer */
export function erkenneKategorien(titel: string, art = ""): Kategorie[] {
  const text = `${titel} ${art}`;
  const treffer = REGELN.filter(([, re]) => re.test(text)).map(([k]) => k);
  return treffer.length ? treffer : ["sonstiges"];
}

export type Filter = "alles" | Exclude<Kategorie, "sonstiges">;

const CHIP: Record<Filter, string> = { alles: "Alles", kinder: "Für Kinder", kultur: "Kultur", draussen: "Draußen", markt: "Märkte" };

/** Filter-Chips: Alles · Für Kinder · Kultur · Draußen · Märkte – bei Familien „Für Kinder“ zuerst, sonst hinten */
export function filterChips(haushalt: Haushalt, aus: Kategorie[] = []): { id: Filter; label: string }[] {
  const reihe: Filter[] = haushalt === "familie" ? ["alles", "kinder", "kultur", "draussen", "markt"] : ["alles", "kultur", "draussen", "markt", "kinder"];
  return reihe.filter((f) => f === "alles" || !aus.includes(f)).map((id) => ({ id, label: CHIP[id] }));
}
