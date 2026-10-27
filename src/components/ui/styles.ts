// Design-System: Klassen für Karten, Buttons, Chips und Felder. Überall diese
// Konstanten bzw. die Komponenten in diesem Ordner verwenden – keine eigenen
// Farben oder Radien in den Seiten (Regeln in CLAUDE.md).

/** Weiße Karte mit feinem Rahmen und leisem Schatten */
export const CARD = "rounded-card border border-line bg-surface shadow-card";

/** Liste in einer Karte mit Trennlinien */
export const CARD_LIST = `${CARD} divide-y divide-line overflow-hidden`;

type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-field font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-3 text-sm",
  md: "h-12 px-4 text-base",
  lg: "h-14 px-5 text-base",
};

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-sm",
  secondary: "border border-line bg-surface text-ink",
  soft: "bg-accent-soft text-accent-strong",
  ghost: "text-muted",
  danger: "border border-line bg-surface text-danger",
};

/** Button-Klassen, auch für Links im Button-Stil */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${BUTTON_BASE} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]}`;
}

/** Runder Icon-Button (Schließen, Zurück, Pfeile) */
export const ICON_BUTTON =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition active:scale-95 disabled:opacity-30";

/**
 * Antippbarer Chip; ausgewählt in der Akzentfarbe ("danger" nur für Allergien).
 * "muted" = unsicherer Eintrag (grau, gestrichelt), z. B. "Meintest du …?".
 */
export function chipClass(selected = false, tone: "accent" | "danger" | "muted" | "vorschlag" = "accent"): string {
  const active = tone === "danger" ? "border-danger-line bg-danger-soft text-danger" : "border-accent bg-accent-soft text-accent-strong";
  // „vorschlag“: Satz zum Antippen (weiß, Rand und Text Orange) – klar als Knopf erkennbar
  const idle = tone === "muted" ? "border-dashed border-line-strong bg-fill text-muted" : tone === "vorschlag" ? "border-accent bg-surface text-accent-strong" : "border-line bg-surface text-ink";
  return `hit inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[15px] font-semibold transition active:scale-95 ${
    selected ? active : idle
  }`;
}

/**
 * Kachel mit Icon über dem Text: Auswahl (Einfach-/Mehrfach) oder Aktion;
 * "soft" = hervorgehobene Aktion, "danger" = Löschen.
 * Hinweis: keine widersprüchlichen Klassen anhängen (h-, px-, gap-, border-…) –
 * Tailwind entscheidet dann nach CSS-Reihenfolge, nicht nach Klassen-Reihenfolge.
 */
export function tileClass(selected: boolean, tone: "default" | "danger" | "soft" = "default"): string {
  const idle =
    tone === "danger"
      ? "border-line bg-surface text-danger"
      : tone === "soft"
        ? "border-transparent bg-accent-soft text-accent-strong"
        : "border-line bg-surface text-ink";
  return `flex min-h-14 flex-col items-center justify-center gap-1 rounded-field border px-2 py-3 text-[15px] font-semibold transition active:scale-[0.98] ${
    selected ? "border-accent bg-accent-soft text-accent-strong" : idle
  }`;
}

/**
 * Nur zwei Plus-Arten: Seiten-Plus (34 px, orange, oben rechts im Kopf) und
 * Kachel-Plus (26 px, hellorange). Die Tippfläche ist immer 44 × 44 px.
 */
export const PAGE_PLUS = "hit flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95";
export const TILE_PLUS_DOT = "flex h-[26px] w-[26px] items-center justify-center rounded-full bg-tile-inner text-tile-accent";

/** Feld-Stil ohne Größe (für schmale Felder mit eigener Breite/Höhe) */
export const INPUT_BASE =
  "min-w-0 rounded-field border border-line bg-surface text-base text-ink outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20";

/** Text-Eingabefeld in voller Breite */
export const INPUT = `${INPUT_BASE} h-12 w-full px-4`;

/** Schmales Feld neben Chips (eigene Minuten, Uhrzeit …) – Breite selbst setzen */
export const INPUT_INLINE = `${INPUT_BASE} h-11 px-3`;

/** Feld-Beschriftung über einem Eingabefeld */
export const LABEL = "text-sm font-semibold text-muted";

/** Abschnitts-Überschrift in einer Seite oder Karte */
export const SECTION_TITLE = "text-[15px] font-extrabold text-ink";

/** Kachel-Label: 11/800 in Großbuchstaben – nur innerhalb von Kacheln (Farbe = Kachel-Akzent) */
export const TILE_LABEL = "text-[11px] font-extrabold uppercase tracking-wider text-tile-label";

/**
 * Pastell-Kachel (`data-tone="<id>"` dazu): Fläche je Kachel, Label/Icon/Plus
 * im Kachel-Akzent, Text bleibt dunkel. Innere Karten auf `TILE_INNER`
 * (weiß halbtransparent). Orange nur für Knöpfe und Mia.
 */
export const TILE = "relative rounded-card bg-tile";
export const TILE_INNER = "rounded-field bg-tile-inner";

/** Grauer Untertitel / Hinweis */
export const SUBTLE = "text-sm text-muted";

/** Neutraler Hinweis-Kasten (Icon + Text) */
export const NOTE = "flex items-start gap-2 rounded-field bg-fill px-4 py-3 text-sm text-muted";

/** Warnung (z. B. zu viele Tage) – Rot nur für Warnungen und Löschen */
export const WARNING =
  "flex items-start gap-2 rounded-field border border-danger-line bg-danger-soft px-4 py-3 text-sm font-semibold text-danger";

/**
 * Unterer Abstand: so viel wie die Leiste unten braucht (Safe-Area bzw.
 * 0,75rem Rand + 66px Leiste + 30px herausragende Mia + 1rem Luft), damit am
 * Seitenende nichts unter der Leiste liegt. Auf allen Seiten ans <main>.
 */
export const FAB_CLEARANCE = "pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+66px+30px+1rem)]";

/** Unterkante für Schwebendes über der Leiste (Knöpfe, Karten, Hinweise) */
export const UEBER_LEISTE = "calc(max(0.75rem, env(safe-area-inset-bottom)) + 66px + 12px)";

/**
 * Inhaltsbereich einer Unterseite: 16px Rand, 16px Abstand zwischen Karten,
 * unten Platz für den schwebenden Küchenhelfer-Knopf
 */
export const PAGE_MAIN = `flex flex-1 flex-col gap-4 px-4 pt-2 ${FAB_CLEARANCE}`;
