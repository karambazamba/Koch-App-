// Mikro-Check (Tafel 86): Auf dem iPhone braucht Mias Zuhören DREI Schalter
// an drei Stellen (Mikrofon für Safari, Diktierfunktion, Spracherkennung →
// Safari). Der Check prüft der Reihe nach, ordnet Fehler sauber ein und
// liefert NUR die Schritte für den fehlenden Schalter. Ist es nicht
// eindeutig: alle drei als kurze Liste. Rein (ohne Browser), getestet in
// tests/core/mikroCheck.test.ts.

import { APP_NAME } from "@/lib/core/app";
import type { MicPlatform, MicStep } from "@/lib/core/mic";

/**
 * Was fehlt?
 * - gesperrt: Mikrofon für Safari/Chrome nicht erlaubt (getUserMedia „NotAllowedError“)
 * - erkennung_aus: Mikro geht, aber Diktierfunktion oder Spracherkennung → Safari ist aus
 *   („service-not-allowed“, bzw. „not-allowed“ obwohl das Mikro erlaubt ist)
 * - kein_ton: Mikro erlaubt, aber es kommt kein Ton an
 * - haengt: das Mikro antwortet nicht (Zeitlimit)
 * - privat: privater Tab (dort hört Safari nicht zu)
 * - unklar: nicht eindeutig → alle drei Schalter
 * Prüfstand „ungeprueft“ = (noch) nicht geprüft; Spracherkennung „nicht_da“ = gibt es im Browser nicht
 */
export type MicFehler = "gesperrt" | "erkennung_aus" | "kein_ton" | "haengt" | "privat" | "unklar";

/** Die Schalter (iPhone: 1–3, dazu die Sperre auf der Seite selbst) */
export type Schalter = "mikrofon" | "diktat" | "spracherkennung" | "seite";

/**
 * Fehler beim Zuhören/Aufnehmen einordnen. `micGranted`: das Mikrofon ist
 * nachweislich erlaubt (Berechtigung „granted“ oder getUserMedia lief) –
 * dann heißt ein „not-allowed“ der Spracherkennung: Diktieren/Spracherkennung aus.
 */
export function micFehler(error: string, platform: MicPlatform, micGranted = false): MicFehler | null {
  if (error === "MicTimeout") return "haengt";
  if (error === "service-not-allowed") return platform === "ios" ? "erkennung_aus" : "gesperrt";
  if (error === "not-allowed") return micGranted && platform === "ios" ? "erkennung_aus" : "gesperrt";
  if (error === "NotAllowedError" || error === "SecurityError" || error === "PermissionDeniedError") return "gesperrt";
  return null;
}

/** Welche Schalter gehören zum Fehler? (iPhone kennt alle drei, Android/andere nur die Freigabe) */
export function schalterFuer(fehler: MicFehler, platform: MicPlatform): Schalter[] {
  if (fehler === "privat") return [];
  if (platform !== "ios") return ["mikrofon"];
  if (fehler === "gesperrt") return ["mikrofon", "seite"];
  if (fehler === "erkennung_aus") return ["diktat", "spracherkennung"];
  return ["mikrofon", "diktat", "spracherkennung", "seite"];
}

/** Ein Prüfschritt des Checks */
export type PruefStand = "ungeprueft" | "laeuft" | "ok" | "fehler";
export type CheckErgebnis = {
  mikro: PruefStand;
  erkennung: PruefStand;
  ton: PruefStand;
  /** Fehlername von getUserMedia bzw. der Spracherkennung */
  mikroFehler?: string;
  erkennungFehler?: string;
};

const CHECK_ZEILEN: { id: "mikro" | "erkennung" | "ton"; text: string }[] = [
  { id: "mikro", text: "Mikrofon erlaubt" },
  { id: "erkennung", text: "Diktierfunktion und Spracherkennung" },
  { id: "ton", text: "Ton kommt an" },
];

/** Hört Mia über den Server zu, zählt die Spracherkennung des Handys nicht – nur Mikrofon und Ton */
export const checkZeilen = (serverOhr: boolean) => (serverOhr ? CHECK_ZEILEN.filter((z) => z.id !== "erkennung") : CHECK_ZEILEN);

/** Aus den Prüfschritten den Fehler bestimmen (null = alles gut bzw. noch nicht fertig) */
export function diagnose(r: CheckErgebnis, platform: MicPlatform, privat = false): MicFehler | null {
  const failed = r.mikro === "fehler" || r.erkennung === "fehler" || r.ton === "fehler";
  if (!failed) return null;
  if (privat) return "privat";
  if (r.mikro === "fehler") return micFehler(r.mikroFehler ?? "", platform) ?? "unklar";
  if (r.erkennung === "fehler") {
    // Mikro erlaubt, Erkennung nicht: auf dem iPhone fehlen Diktieren oder Spracherkennung
    if (r.erkennungFehler === "nicht_da") return "unklar";
    return micFehler(r.erkennungFehler ?? "", platform, r.mikro === "ok") ?? "unklar";
  }
  return "kein_ton";
}

/** Aus einem bekannten Fehler (automatisch beim Scheitern) die Häkchen-Liste ableiten */
export function ergebnisAusFehler(fehler: MicFehler): CheckErgebnis {
  if (fehler === "gesperrt") return { mikro: "fehler", erkennung: "ungeprueft", ton: "ungeprueft" };
  if (fehler === "erkennung_aus") return { mikro: "ok", erkennung: "fehler", ton: "ungeprueft" };
  if (fehler === "kein_ton") return { mikro: "ok", erkennung: "ungeprueft", ton: "fehler" };
  return { mikro: "ungeprueft", erkennung: "ungeprueft", ton: "ungeprueft" };
}

/** Kurzer Satz über der Anleitung */
export function fehlerSatz(fehler: MicFehler, platform: MicPlatform): string {
  const ios = platform === "ios";
  switch (fehler) {
    case "gesperrt":
      return ios ? "Safari darf das Mikrofon nicht benutzen. So machst du es an:" : `Das Mikrofon ist für ${APP_NAME} gesperrt. So machst du es an:`;
    case "erkennung_aus":
      return "Das Mikrofon ist an, aber das Zuhören ist aus. So machst du es an:";
    case "kein_ton":
      return ios ? "Das Mikrofon ist an, aber es kommt kein Ton an. Prüf diese drei Schalter:" : "Das Mikrofon ist an, aber es kommt kein Ton an. Prüf die Freigabe:";
    case "haengt":
      return `Das Mikrofon antwortet gerade nicht. Prüf diese Schalter, dann ${APP_NAME} neu öffnen:`;
    case "privat":
      return PRIVAT_TEXT;
    default:
      return ios ? "Ich bin nicht ganz sicher, woran’s liegt. Prüf diese drei Schalter:" : "Ich bin nicht ganz sicher, woran’s liegt. Prüf die Freigabe:";
  }
}

export const PRIVAT_TEXT = `Du bist in einem privaten Tab. Da hört Safari nicht zu. Öffne ${APP_NAME} normal oder vom Home-Bildschirm.`;

/** „Immer noch durchgestrichen?“ (iPhone): die Seiten-Sperre schlägt die allgemeine Safari-Einstellung */
export const SEITEN_KASTEN = {
  titel: "Immer noch durchgestrichen?",
  text: `In Safari auf der Seite von ${APP_NAME}: Symbol links neben der Adresse → „Website-Einstellungen“ → „Mikrofon“ → „Erlauben“. Das schlägt die allgemeine Safari-Einstellung. Und ${APP_NAME} nicht im privaten Tab öffnen.`,
};

export const MENUE_HINWEIS = "Menünamen können je nach Handy leicht abweichen.";

/** Privater Tab? Nur ein Verdacht (wo möglich): sehr wenig Speicher erlaubt und nicht vom Home-Bildschirm */
export function vielleichtPrivat(quota: number | null, standalone: boolean): boolean {
  return !standalone && quota !== null && quota > 0 && quota < 120 * 1024 * 1024;
}

/** Kam Ton an? Pegel 0–1 aus dem Pegel-Test („Sag mal kurz Moin“) */
export const tonAngekommen = (pegel: number[], schwelle = 0.02) => pegel.some((p) => p >= schwelle);

const NEU_OEFFNEN: MicStep = {
  text: `${APP_NAME} ganz schließen und neu öffnen`,
  icon: "neustart",
  screen: { title: "App-Umschalter", rows: [APP_NAME, "Fotos"], target: 0, wischen: true },
};

/**
 * Die Anleitung: nur die Schritte für die fehlenden Schalter. iPhone ab
 * iOS 18 mit „Apps“, bis iOS 17 ohne. Am Ende immer „Mia neu öffnen“.
 */
export function anleitung(platform: MicPlatform, ios: number | null, schalter: Schalter[], host = "mia.app"): MicStep[] {
  if (platform === "android")
    return [
      { text: "Öffne Chrome", icon: "chrome", screen: { title: "Home-Bildschirm", rows: ["Kamera", "Chrome", "Einstellungen"], target: 1 } },
      { text: "Tippe oben rechts auf ⋮ und dann auf „Einstellungen“", icon: "menue", screen: { title: "⋮ Menü", rows: ["Neuer Tab", "Verlauf", "Einstellungen"], target: 2 } },
      { text: "„Website-Einstellungen“ → „Mikrofon“", icon: "mikro", screen: { title: "Website-Einstellungen", rows: ["Standort", "Kamera", "Mikrofon"], target: 2 } },
      { text: `Tippe auf ${host} → „Zulassen“. Steht sie unter „Blockiert“, dort antippen.`, icon: "erlauben", screen: { title: "Mikrofon", rows: ["Blockiert", host, "Zulassen"], target: 1 } },
      { ...NEU_OEFFNEN, text: `${APP_NAME} neu öffnen` },
    ];
  if (platform !== "ios")
    return [
      { text: "Klick links neben der Adresse auf das Schloss bzw. die Regler", icon: "regler", screen: { title: "Browser", rows: [`⊶  ${host}`, "Seite"], target: 0 } },
      { text: "Bei „Mikrofon“ auf „Zulassen“", icon: "erlauben", screen: { title: host, rows: ["Kamera", "Mikrofon: Zulassen"], target: 1 } },
      { ...NEU_OEFFNEN, text: "Seite neu laden" },
    ];
  const alle = schalter.includes("mikrofon") && schalter.includes("diktat") && schalter.includes("spracherkennung");
  const nr = (n: number) => (alle ? `Schalter ${n}: ` : "");
  const withApps = ios === null || ios >= 18;
  const steps: MicStep[] = [{ text: "Öffne die Einstellungen (das graue Zahnrad)", icon: "zahnrad", screen: { title: "Home-Bildschirm", rows: ["Fotos", "Kamera", "Einstellungen", "Uhr"], target: 2 } }];
  if (schalter.includes("mikrofon"))
    steps.push({
      text: withApps
        ? `${nr(1)}„Apps“ → „Safari“ → „Mikrofon“ → „Erlauben“ (unter „Einstellungen für Websites“)`
        : `${nr(1)}„Safari“ → „Mikrofon“ → „Erlauben“ (unter „Einstellungen für Websites“)`,
      icon: "safari",
      schalter: 1,
      screen: { title: "Safari · Mikrofon", rows: ["Fragen", "Ablehnen", "Erlauben"], target: 2 },
    });
  if (schalter.includes("diktat"))
    steps.push({ text: `${nr(2)}„Allgemein“ → „Tastatur“ → „Diktierfunktion“ an`, icon: "diktat", schalter: 2, screen: { title: "Tastaturen", rows: ["Tastaturen", "Auto-Korrektur", "Diktierfunktion"], target: 2 } });
  if (schalter.includes("spracherkennung"))
    steps.push({
      text: `${nr(3)}„Datenschutz & Sicherheit“ → „Spracherkennung“ → „Safari“ an`,
      icon: "berechtigungen",
      schalter: 3,
      screen: { title: "Spracherkennung", rows: ["Notizen", "Safari", "Siri"], target: 1 },
    });
  steps.push(NEU_OEFFNEN);
  return steps;
}
