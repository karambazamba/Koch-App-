"use client";

// „Ansagen erzeugen“ auf „Für Entwickler“ (A-051): löst auf dem Server einmal
// die Erzeugung der Durchatmen-Ansagen aus (ElevenLabs → öffentlicher Bucket).
// Geschützt mit dem Prüfstand-Geheimnis (nur eingetippt, nie gespeichert);
// kein Schlüssel im Browser. Spätere Läufe erzeugen nur Fehlendes.

import { useState } from "react";
import { SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { helperName } from "@/lib/einstellungen/profile";

export function AnsagenErzeugen({ secret }: { secret: string }) {
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const los = async () => {
    setLaeuft(true);
    setMeldung(null);
    const r = await fetch("/api/durchatmen/ansagen-erzeugen", { method: "POST", headers: { authorization: `Bearer ${secret}` } }).catch(() => null);
    setLaeuft(false);
    if (!r) return setMeldung("Kein Netz. Nochmal?");
    if (r.status === 401) return setMeldung("Das Geheimnis passt nicht.");
    if (r.status === 503) return setMeldung("Auf dem Server ist die Stimme oder der Speicher noch nicht eingerichtet. Bis dahin spricht die Handy-Stimme.");
    const d = (await r.json().catch(() => null)) as { neu?: number; schon?: number; fehler?: number } | null;
    if (!r.ok || !d) return setMeldung("Hat grad nicht geklappt. Nochmal?");
    setMeldung(`${d.neu ?? 0} neu, ${d.schon ?? 0} schon da${d.fehler ? `, ${d.fehler} hakten (einfach nochmal)` : ""}.`);
  };
  return (
    <section className="flex flex-col gap-2" aria-label="Durchatmen-Ansagen">
      <h2 className={`px-1 ${SECTION_TITLE}`}>Durchatmen-Ansagen</h2>
      <p className="px-1 text-sm text-muted">Einmal mit {helperName(null)}s Stimme erzeugen. Danach kostet es nichts mehr; erzeugt wird nur, was fehlt oder sich geändert hat.</p>
      <button type="button" disabled={!secret || laeuft} onClick={los} className={buttonClass("secondary", "md")}>
        {laeuft ? "Erzeuge …" : "Ansagen erzeugen"}
      </button>
      {meldung && (
        <p className="px-1 text-sm font-semibold" role="status">
          {meldung}
        </p>
      )}
    </section>
  );
}
