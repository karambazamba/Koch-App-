// Eingebaute Backrezepte (später per KI erweiterbar) – siehe data.ts.

export type OvenMode = "ober-unter" | "umluft";

/** Backofen-Angaben */
export type OvenSettings = { mode: OvenMode; temp: number; minutes: number };

/** Schritt für eine Küchenmaschine mit Kochfunktion (z. B. Thermomix) */
export type MachineStep = {
  text: string;
  /** z. B. "10 Sek", "3 Min" */
  time?: string;
  /** z. B. "37 °C", "100 °C", "Varoma" */
  temp?: string;
  /** z. B. "Stufe 5", "Knetstufe", "Stufe 2–4 ansteigend" */
  speed?: string;
  /** Linkslauf */
  reverse?: boolean;
};

export type BuiltinBakingRecipe = {
  /** Eindeutig, a–z, 0–9, "-" (wird zu "b:<id>") */
  id: string;
  title: string;
  /** Stück/Portionen */
  servings: number;
  /** Arbeits- plus Backzeit in Minuten */
  prepMinutes: number;
  /** [Menge, Einheit, Zutat] – Mengen in g bzw. ml (Eier/Päckchen als Stück) */
  ingredients: [number | null, string, string][];
  /** Klassische Schritte, kurz, mit Zeitangaben wie "30 Minuten ruhen lassen" */
  steps: string[];
  /** Indizes (0-basiert) der Schritte, die Kinder gut übernehmen können */
  kidSteps: number[];
  oven: OvenSettings | null;
  /** Formgröße, z. B. "Springform 26 cm", "Blech", "12er-Muffinform" */
  pan: string;
  /** Besonders einfach, gut mit Kindern */
  kidFriendly: boolean;
  /** Schritte für Thermomix bzw. Küchenmaschine mit Kochfunktion */
  machineSteps: MachineStep[];
};
