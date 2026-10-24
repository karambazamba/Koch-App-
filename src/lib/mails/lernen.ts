// Mails an Mia lernt die Absender: pro Person und Raum wird gezählt. Beim 2.
// Mal vom selben Absender (und mindestens ein übernommener Vorschlag) fragt
// Mia einmal: „Von der Kita kommt öfter was. Soll ich deren Mails künftig
// automatisch bekommen?“ – „Nein“ = nie wieder fragen. „Ja“ → Liste
// „Automatisch an Mia“ und ein fertiger Gmail-Filter (Suchtext oder Datei).
// Rein.

export type Absender = { sender: string; count: number; accepted: number; decision: "ja" | "nein" | null };

/** Absender zählen (Domain, bei Freemailern die ganze Adresse) */
export function absenderSchluessel(email: string): string {
  const e = email.toLowerCase();
  const domain = e.split("@")[1] ?? e;
  return /^(gmail|googlemail|gmx|web|t-online|yahoo|outlook|hotmail|live|icloud|me|mac|posteo|mailbox|freenet|aol)\.(com|de|net|org)$/.test(domain) ? e : domain;
}

/** Fragen? (2. Mail, mindestens einmal etwas übernommen, noch nie entschieden) */
export const fragen = (a: Absender) => a.decision === null && a.count >= 2 && a.accepted >= 1;

/** „kita-eutin.de“ → „Kita Eutin“ (für die Frage) */
export function absenderName(sender: string): string {
  const base = sender.includes("@") ? sender.split("@")[0] : sender.split(".").slice(0, -1).join(" ");
  return base
    .split(/[-_. ]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const frageText = (a: Absender) => `Von ${absenderName(a.sender)} kommt öfter was. Soll ich deren Mails künftig automatisch bekommen?`;

/** Gmail-Suchtext für den Filter: from:(kita-eutin.de OR tsv-eutin.de) */
export function gmailSuche(senders: string[]): string {
  const list = [...new Set(senders.map((s) => s.toLowerCase().trim()).filter(Boolean))].sort();
  return list.length ? `from:(${list.join(" OR ")})` : "";
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Gmail-Filter-Datei zum Importieren (Einstellungen → Filter → „Filter importieren“) */
export function gmailFilterXml(senders: string[], forwardTo: string, now: string): string {
  const query = gmailSuche(senders);
  return [
    "<?xml version='1.0' encoding='UTF-8'?>",
    "<feed xmlns='http://www.w3.org/2005/Atom' xmlns:apps='http://schemas.google.com/apps/2006'>",
    "  <title>Mail Filters</title>",
    `  <updated>${now}</updated>`,
    "  <entry>",
    "    <category term='filter'></category>",
    "    <title>Mail Filter</title>",
    `    <updated>${now}</updated>`,
    `    <apps:property name='hasTheWord' value='${xml(query)}'/>`,
    `    <apps:property name='forwardTo' value='${xml(forwardTo)}'/>`,
    "  </entry>",
    "</feed>",
    "",
  ].join("\n");
}
