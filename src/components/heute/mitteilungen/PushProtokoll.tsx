"use client";

// „Für Entwickler“ → Mitteilungen (A-069): letzter Versand-Lauf, Abos im
// Haushalt, die letzten 10 Versände (Zeit, Art, Status – nie Inhalt). Dazu
// der letzte Fehler-Code der Anmeldung dieses Geräts und was der Server meldet
// (Migration gelaufen, Zeitplan, Adresse).

import { useEffect, useState } from "react";
import { CARD, SECTION_TITLE } from "@/components/ui/styles";
import { anmeldeStand, pushProtokollLaden, serverStandLaden, type PushProtokoll as Daten } from "@/lib/heute/mitteilungen/pushPruefen";
import type { ServerStatus } from "@/lib/heute/mitteilungen/pushStatus";

const jn = (v: boolean | undefined) => (v === undefined ? "–" : v ? "ja" : "nein");

const zeit = (iso: string | null) => (iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Berlin" }) : "–");

export function PushProtokoll() {
  const [d, setD] = useState<Daten | null | undefined>(undefined);
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [anmeldung] = useState(anmeldeStand);
  useEffect(() => {
    let an = true;
    void pushProtokollLaden().then((x) => an && setD(x));
    void serverStandLaden().then((x) => an && setServer(x));
    return () => {
      an = false;
    };
  }, []);
  return (
    <section className="flex flex-col gap-2" aria-label="Mitteilungen (Server)" data-push-protokoll>
      <h2 className={`px-1 ${SECTION_TITLE}`}>Mitteilungen (Server)</h2>
      <div className={`${CARD} flex flex-col gap-3 p-4 text-[15px]`}>
        <div className="grid grid-cols-2 gap-2" data-push-anmeldung>
          <span>Letzte Anmeldung</span>
          <span className="text-right font-bold">{anmeldung ? anmeldung.code : "–"}</span>
          {anmeldung && (
            <>
              <span>am</span>
              <span className="text-right tabular-nums">{zeit(anmeldung.at)}</span>
            </>
          )}
          <span>Migration push_zuverlaessig</span>
          <span className="text-right font-bold" data-push-migration>{server ? jn(server.migration) : "–"}</span>
          <span>Zeitplan (pg_cron + pg_net)</span>
          <span className="text-right font-bold">{server ? jn(server.zeitplan) : "–"}</span>
          <span>Adresse für den Zeitplan</span>
          <span className="text-right font-bold">{server ? jn(server.ziel) : "–"}</span>
          <span>Dieses Handy angemeldet</span>
          <span className="text-right font-bold">{server ? jn(server.abo) : "–"}</span>
        </div>
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
