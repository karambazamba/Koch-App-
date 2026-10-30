"use client";

// „Für Entwickler“ → Mitteilungen (A-069): letzter Versand-Lauf, Abos im
// Haushalt, die letzten 10 Versände (Zeit, Art, Status – nie Inhalt).

import { useEffect, useState } from "react";
import { CARD, SECTION_TITLE } from "@/components/ui/styles";
import { pushProtokollLaden, type PushProtokoll as Daten } from "@/lib/heute/mitteilungen/pushPruefen";

const zeit = (iso: string | null) => (iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Berlin" }) : "–");

export function PushProtokoll() {
  const [d, setD] = useState<Daten | null | undefined>(undefined);
  useEffect(() => {
    let an = true;
    void pushProtokollLaden().then((x) => an && setD(x));
    return () => {
      an = false;
    };
  }, []);
  return (
    <section className="flex flex-col gap-2" aria-label="Mitteilungen (Server)" data-push-protokoll>
      <h2 className={`px-1 ${SECTION_TITLE}`}>Mitteilungen (Server)</h2>
      <div className={`${CARD} flex flex-col gap-3 p-4 text-[15px]`}>
        {d === null ? (
          <p className="text-muted">Nur mit Konto.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <span>Letzter Lauf</span>
              <span className="text-right font-bold tabular-nums">{d ? zeit(d.letzterLauf) : "…"}</span>
              <span>Abos im Haushalt</span>
              <span className="text-right font-bold tabular-nums">{d?.abos ?? "…"}</span>
            </div>
            {d && d.versaende.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {d.versaende.map((v, i) => (
                  <li key={`${v.at}-${i}`} className="flex justify-between gap-2 tabular-nums">
                    <span>{zeit(v.at)}</span>
                    <span className="text-muted">{v.art}</span>
                    <span className="font-semibold">{v.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              d && <p className="text-sm text-muted">Noch keine Versände.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
