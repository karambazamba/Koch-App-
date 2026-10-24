// Mails an Mia: kurze Anleitung je Postfach – einzelne Mail weiterleiten
// und (Gmail/Outlook) automatisch weiterleiten. Wenig Text, keine
// Fachbegriffe. Rein.

export type Postfach = "gmail" | "outlook" | "apple" | "andere";

export const POSTFACH_NAME: Record<Postfach, string> = { gmail: "Gmail", outlook: "Outlook", apple: "Apple Mail", andere: "Andere" };

/** E-Mail-Adresse → wahrscheinliches Postfach */
export function postfachVon(email: string): Postfach {
  const d = email.toLowerCase().split("@")[1] ?? "";
  if (/^(gmail|googlemail)\./.test(d)) return "gmail";
  if (/^(outlook|hotmail|live|msn)\./.test(d)) return "outlook";
  if (/^(icloud|me|mac)\.com$/.test(d)) return "apple";
  return "andere";
}

/** Eine Mail weiterleiten – geht überall */
export const EINZELN = ["Mail öffnen", "„Weiterleiten“ tippen", "Die Adresse von oben als Empfänger einsetzen", "Senden – ich mache Vorschläge daraus"];

/** Automatisch weiterleiten (nur für ausgewählte Absender) */
export function automatisch(p: Postfach): string[] {
  if (p === "gmail") return ["Am Computer: Gmail → Einstellungen → „Weiterleitung und POP/IMAP“", "„Weiterleitungsadresse hinzufügen“: die Adresse von oben", "Den Bestätigungs-Code zeige ich euch hier in der App", "Dann die Filter-Datei unten importieren (Einstellungen → Filter → Filter importieren)"];
  if (p === "outlook") return ["Outlook im Browser → Einstellungen → E-Mail → Regeln", "Neue Regel: Absender ist …", "Aktion „Weiterleiten an“: die Adresse von oben"];
  if (p === "apple") return ["Am Mac: Mail → Einstellungen → Regeln", "Neue Regel: Von enthält …", "Aktion „Nachricht weiterleiten“ an die Adresse von oben", "Auf dem iPhone geht nur einzeln weiterleiten"];
  return ["In den Einstellungen eures Postfachs nach „Weiterleitung“ oder „Regeln“ suchen", "Nur bestimmte Absender an die Adresse von oben weiterleiten"];
}
