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
  primary: "bg-accent text-white shadow-sm",
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

/** Antippbarer Chip; ausgewählt in der Akzentfarbe ("danger" nur für Allergien) */
export function chipClass(selected = false, tone: "accent" | "danger" = "accent"): string {
  const active = tone === "danger" ? "border-red-300 bg-red-50 text-red-700" : "border-accent bg-accent-soft text-accent-strong";
  return `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[15px] font-semibold transition active:scale-95 ${
    selected ? active : "border-line bg-surface text-ink"
  }`;
}

/** Auswahl-Kachel (Einfach-/Mehrfachauswahl) */
export function tileClass(selected: boolean): string {
  return `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-[15px] font-semibold transition active:scale-[0.98] ${
    selected ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-surface text-ink"
  }`;
}

/** Text-Eingabefeld */
export const INPUT =
  "h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none transition placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20";

/** Feld-Beschriftung über einem Eingabefeld */
export const LABEL = "text-sm font-semibold text-muted";

/** Abschnitts-Überschrift in einer Seite oder Karte */
export const SECTION_TITLE = "text-lg font-bold text-ink";

/** Grauer Untertitel / Hinweis */
export const SUBTLE = "text-sm text-muted";

/** Inhaltsbereich einer Unterseite: 16px Rand, 16px Abstand zwischen Karten */
export const PAGE_MAIN = "safe-bottom flex flex-1 flex-col gap-4 px-4 pb-8 pt-2";
