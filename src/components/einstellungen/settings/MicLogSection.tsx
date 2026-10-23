"use client";

// Mikro-Protokoll (versteckt, 5× auf die Version tippen): die letzten 20
// Ereignisse rund um Mikrofon und Sprachnachrichten – für einen Screenshot,
// falls es hakt. Nur auf dem Gerät.

import { useRef, useState } from "react";
import { Info } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";
import { CARD_LIST, SECTION_TITLE } from "@/components/ui/styles";
import { versionLabel } from "@/lib/core/app";
import { clearMicLog, useMicLog } from "@/lib/core/micLog";

/** So oft auf die Version tippen, dann erscheint das Protokoll */
const TAPS = 5;

const clock = (ms: number) => new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Berlin" });

/** Zeile „Version“ – 5× antippen zeigt das Mikro-Protokoll darunter */
export function VersionRow() {
  const taps = useRef(0);
  const [open, setOpen] = useState(false);
  return (
    <>
      <li>
        <button
          type="button"
          onClick={() => {
            taps.current += 1;
            if (taps.current >= TAPS) setOpen(true);
          }}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
        >
          <IconBadge icon={Info} />
          <span className="flex-1 text-base font-bold">Version</span>
          <span className="text-sm text-muted" data-testid="app-version">
            {versionLabel().replace(/^Version /, "")}
          </span>
        </button>
      </li>
      {open && <MicLogList />}
    </>
  );
}

function MicLogList() {
  const entries = useMicLog();
  return (
    <li className="flex flex-col gap-2 px-4 py-3" aria-label="Mikro-Protokoll">
      <span className="flex items-center justify-between gap-3">
        <span className={SECTION_TITLE}>Mikro-Protokoll</span>
        {entries.length > 0 && (
          <button type="button" onClick={clearMicLog} className="hit text-sm font-bold text-muted">
            Leeren
          </button>
        )}
      </span>
      {entries.length ? (
        <ol className={`${CARD_LIST} text-[13px] leading-snug`}>
          {[...entries].reverse().map((e, i) => (
            <li key={`${e.at}-${i}`} className="flex gap-3 px-3 py-1.5">
              <span className="shrink-0 tabular-nums text-muted">{clock(e.at)}</span>
              <span className="min-w-0 break-words">{e.text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <span className="text-sm text-muted">Noch nichts aufgezeichnet.</span>
      )}
    </li>
  );
}
