// Mails an Mia: Adressen. Pro Familie familie-<name>-<4 Zeichen>@<Domain>
// (Raum Familie), pro Person <vorname>-arbeit-<4 Zeichen>@<Domain> (Raum
// Arbeit, nur diese Person). Der Zufallsteil schützt vor Raten; „Adresse
// ändern“ macht eine neue, die alte nimmt nichts mehr an. Rein.

import type { Room } from "@/lib/core/entries";

/** Empfangs-Domain (öffentlich, beim Bauen eingesetzt) */
export const mailDomain = (env: string | undefined = process.env.NEXT_PUBLIC_MAIL_DOMAIN) => (env && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(env) ? env.toLowerCase() : "mia.karamba-eis.de");

/** „Familie Müller“ → „mueller“ */
export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/^familie\s+/, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "mia"
  );
}

/** Lokaler Teil einer neuen Adresse (Zufallsteil von außen, damit es testbar bleibt) */
export function localPart(room: Room, name: string, random: string): string {
  const r = random.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4).padEnd(4, "x");
  return room === "arbeit" ? `${slug(name)}-arbeit-${r}` : `familie-${slug(name)}-${r}`;
}

/** Empfänger einer eingehenden Mail → lokaler Teil, wenn es unsere Domain ist */
export function ourLocalPart(to: string[], domain = mailDomain()): string | null {
  for (const t of to) {
    const m = t.toLowerCase().match(/([a-z0-9-]+)@([a-z0-9.-]+)/);
    if (m && m[2] === domain) return m[1];
  }
  return null;
}

export const roomOfLocalPart = (local: string): Room => (/-arbeit-[a-z0-9]{4}$/.test(local) ? "arbeit" : "familie");
