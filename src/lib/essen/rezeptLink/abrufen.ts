// Rezept-Link über den Server lesen (/api/rezept-link); Fehler als Satz.

import type { LinkRezept } from "@/lib/essen/rezeptLink/lesen";

export async function fetchRezeptLink(url: string): Promise<{ rezept: LinkRezept } | { error: string }> {
  try {
    const res = await fetch("/api/rezept-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    const body = (await res.json().catch(() => ({}))) as { rezept?: LinkRezept; error?: string };
    return body.rezept ? { rezept: body.rezept } : { error: body.error ?? "Die Seite konnte ich gerade nicht öffnen." };
  } catch {
    return { error: "Gerade keine Verbindung – schick mir den Link gleich nochmal." };
  }
}
