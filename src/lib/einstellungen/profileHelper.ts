// Profil – die Begleitung: Sie heißt seit v0.67 fest Mia (Assistentin,
// weibliche Stimme, Orange – „App heißt Mia“), dazu wie oft sie sich meldet.
// Texte trotzdem nur über diese Hilfen (helperName, helperTitle,
// helperMessage) – so bleibt der Name an einer Stelle.

import type { HouseholdProfile } from "@/lib/einstellungen/profileModel";
import { APP_NAME } from "@/lib/core/app";

/** Stimme der Begleitung für die Sprachausgabe (folgt der Art) */
export type HelperVoice = "weiblich" | "maennlich";

/** Die Begleitung ist eine Assistentin oder ein Assistent (Anrede und Stimme) */
export type HelperArt = "assistentin" | "assistent";

/** Farbe des Begleitungs-Icons (die einzige frei wählbare Farbe der App) */
export type AvatarColor = "orange" | "nachtblau" | "himmelblau" | "lila" | "beere" | "rosa" | "koralle" | "senf" | "waldgruen" | "anthrazit";

export const AVATAR_COLORS: { id: AvatarColor; label: string; hex: string }[] = [
  { id: "orange", label: "Orange", hex: "#F26B21" },
  { id: "nachtblau", label: "Nachtblau", hex: "#2B4470" },
  { id: "himmelblau", label: "Himmelblau", hex: "#3B82C4" },
  { id: "lila", label: "Lila", hex: "#7357C4" },
  { id: "beere", label: "Beere", hex: "#A33B67" },
  { id: "rosa", label: "Rosa", hex: "#E06C9F" },
  { id: "koralle", label: "Koralle", hex: "#E8615A" },
  { id: "senf", label: "Senf", hex: "#C9962B" },
  { id: "waldgruen", label: "Waldgrün", hex: "#3F7A5A" },
  { id: "anthrazit", label: "Anthrazit", hex: "#3E3A37" },
];

export const avatarHex = (color: AvatarColor | undefined) => AVATAR_COLORS.find((c) => c.id === color)?.hex ?? AVATAR_COLORS[0].hex;

/**
 * Die Begleitung (Profil v19): Name, Art (Assistentin/Assistent → Anrede und
 * Stimme), Icon-Farbe. `voice` folgt immer der Art. Der Name ist eine
 * Nutzereinstellung – nie fest einbauen.
 */
export type HelperSettings = {
  name: string;
  art: HelperArt;
  voice: HelperVoice;
  farbe: AvatarColor;
};

/** Die Begleitung – fest Mia (Name wie die App, APP_NAME) */
export const DEFAULT_HELPER: HelperSettings = { name: APP_NAME, art: "assistentin", voice: "weiblich", farbe: "orange" };

/** Name der Begleitung – immer Mia (das Profil bleibt Parameter, falls es je wieder wählbar wird) */
export function helperName(profile?: Pick<HouseholdProfile, "helper"> | null): string {
  void profile;
  return DEFAULT_HELPER.name;
}

export const helperArtOf = (profile?: Pick<HouseholdProfile, "helper"> | null): HelperArt => {
  void profile;
  return DEFAULT_HELPER.art;
};

/** „deine Assistentin“ */
export function helperTitle(profile?: Pick<HouseholdProfile, "helper"> | null): string {
  void profile;
  return "deine Assistentin";
}

/** Mitteilung im Namen der Begleitung, z. B. "Mia: Heute gibt's Gulasch" (auch für Push) */
export function helperMessage(profile: Pick<HouseholdProfile, "helper"> | null | undefined, text: string): string {
  return `${helperName(profile)}: ${text}`;
}

/** Wie oft sich Lotte von selbst meldet (Profil v15) */
export type HelperMode = "locker" | "normal" | "dranbleiben";

export const HELPER_MODES: { value: HelperMode; label: string; hint: string }[] = [
  { value: "locker", label: "Ganz locker", hint: "Meldet sich selten – nur wenn’s wirklich zeitkritisch ist." },
  { value: "normal", label: "Normal", hint: "Freundliche Erinnerungen, wenn sie helfen." },
  { value: "dranbleiben", label: "Dranbleiben", hint: "Schubst öfter und hilft beim Planen – immer freundlich." },
];
