"use client";

// Nach der Anmeldung ohne Familie: keine Frage – still „Familie <Name>“
// anlegen (umbenennbar), dann geht’s weiter. Wer eingeladen wurde, kommt über
// den Link (/e/…) direkt in die richtige Familie.

import { useEffect, useRef, useState } from "react";
import { CARD, NOTE, buttonClass } from "@/components/ui/styles";
import { ensureFamily } from "@/lib/konten/account";

export function AutoFamily({ name, displayName, personId, onDone }: { name: string; displayName: string; personId: string | null; onDone: () => void }) {
  const [error, setError] = useState("");
  const started = useRef(false);
  const run = async () => {
    setError("");
    const r = await ensureFamily(name, displayName, personId);
    if (!r.ok) return setError(r.error);
    onDone();
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // nur einmal beim Anzeigen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return error ? (
    <div className="flex flex-col gap-3">
      <p className={NOTE}>{error}</p>
      <button type="button" onClick={() => void run()} className={`${buttonClass("primary")} w-full`}>
        Nochmal
      </button>
    </div>
  ) : (
    <div className={`${CARD} flex h-28 items-center justify-center p-4 text-[15px] text-muted`} role="status">
      Ich lege „{name}“ an …
    </div>
  );
}
