// Design-System: Klassen für Karten, Buttons, Chips und Felder. Überall diese
// Konstanten bzw. die Komponenten in diesem Ordner verwenden – keine eigenen
// Farben oder Radien in den Seiten (Regeln in CLAUDE.md).

/** Weiße Karte mit feinem Rahmen und leisem Schatten */
export const CARD = "rounded-card border border-line bg-surface shadow-card";

/** Liste in einer Karte mit Trennlinien */
export const CARD_LIST = `${CARD} divide-y divide-line overflow-hidden`;

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

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
  danger: "border border-line bg-surface text-red-600",
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
export function chipClass(selected = false, tone: "accent" | "danger" | "muted" = "accent"): string {
  const active = tone === "danger" ? "border-red-300 bg-red-50 text-red-700" : "border-accent bg-accent-soft text-accent-strong";
  const idle = tone === "muted" ? "border-dashed border-stone-300 bg-stone-100 text-stone-500" : "border-line bg-surface text-ink";
  return `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[15px] font-semibold transition active:scale-95 ${
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
      ? "border-line bg-surface text-red-600"
      : tone === "soft"
        ? "border-transparent bg-accent-soft text-accent-strong"
        : "border-line bg-surface text-ink";
  return `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-[15px] font-semibold transition active:scale-[0.98] ${
    selected ? "border-accent bg-accent-soft text-accent-strong" : idle
  }`;
}

/** Feld-Stil ohne Größe (für schmale Felder mit eigener Breite/Höhe) */
/** Sichtbarer Kreis der kleinen Schnell-Knöpfe (20 px) – Tippfläche liefert der Knopf drumherum */
export const quickDot = (tone: "quick" | "kladde" | "sport" = "quick") =>
  `flex h-5 w-5 items-center justify-center rounded-full ${tone === "kladde" ? "bg-kladde-line text-kladde-ink" : tone === "sport" ? "bg-sport-line text-sport-ink" : "bg-quick text-quick-ink"}`;

export const INPUT_BASE =
  "min-w-0 rounded-xl border border-line bg-surface text-base text-ink outline-none transition placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20";

/** Text-Eingabefeld in voller Breite */
export const INPUT = `${INPUT_BASE} h-12 w-full px-4`;

/** Feld-Beschriftung über einem Eingabefeld */
export const LABEL = "text-sm font-semibold text-muted";

/** Abschnitts-Überschrift in einer Seite oder Karte */
export const SECTION_TITLE = "text-lg font-bold text-ink";

/** Grauer Untertitel / Hinweis */
export const SUBTLE = "text-sm text-muted";

/** Neutraler Hinweis-Kasten (Icon + Text) */
export const NOTE = "flex items-start gap-2 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-700";

/** Warnung (z. B. zu viele Tage) – Rot nur für Warnungen und Löschen */
export const WARNING =
  "flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";

/**
 * Unterer Abstand: Home-Leiste (Safe-Area) plus Platz für den Küchenhelfer-Knopf
 * (56px + Rand + Luft), damit am Seitenende nichts unter dem Knopf liegt.
 * Auf allen Seiten ans <main> – auch über einer StickyActions-Leiste, denn der
 * Knopf schwebt dann direkt über der Leiste.
 */
export const FAB_CLEARANCE = "pb-[calc(max(1rem,env(safe-area-inset-bottom))+6.5rem)]";

/**
 * Inhaltsbereich einer Unterseite: 16px Rand, 16px Abstand zwischen Karten,
 * unten Platz für den schwebenden Küchenhelfer-Knopf
 */
export const PAGE_MAIN = `flex flex-1 flex-col gap-4 px-4 pt-2 ${FAB_CLEARANCE}`;
