"use client";

// Zugangscode für Mias KI – EIN ruhiger Bildschirm im Stil des Hallo-Bildschirms
// („Fast geschafft.“), gleich am Anfang statt erst im Chat (höchstens der 3.
// Bildschirm vor der App). Ein Feld (Passwort, ohne Autofill), darunter leise
// „Groß/klein und Leerzeichen sind egal.“ (Prüfung nachsichtig,
// `normalisiereZugangscode`), „Fertig“, darunter „Ohne Code geht’s auch …“
// mit „Später“. Der Code wird nur auf dem Server geprüft.

import { useEffect, useRef, useState } from "react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { INPUT_BASE, buttonClass } from "@/components/ui/styles";
import { saveAccessCode } from "@/lib/begleitung/zugang";
import { CODE_TEXTE, closeCodeScreen, setCodeLater } from "@/lib/begleitung/codeAbfrage";
import { helperName } from "@/lib/einstellungen/profile";
import { useBackCloses } from "@/lib/core/useBackCloses";
import { RechtLinks } from "@/components/datenschutz/RechtstextView";

export function CodeScreen({ change = false }: { change?: boolean }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "falsch" | "pause" | "offline">("idle");
  const input = useRef<HTMLInputElement>(null);
  const later = () => {
    setCodeLater(true);
    closeCodeScreen();
  };
  useBackCloses(later);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  const submit = async () => {
    setState("busy");
    const result = await saveAccessCode(code);
    if (result === "ok") {
      setCodeLater(false);
      closeCodeScreen();
      return;
    }
    setState(result);
    if (result === "falsch") setCode("");
  };
  return (
    <section className="erster-start-in fixed inset-0 z-[60] overflow-y-auto bg-background" aria-labelledby="code-titel" data-code-screen>
      <form
        className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2rem)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim() && state !== "busy") void submit();
        }}
      >
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-5 text-center">
          <span role="img" aria-label={helperName()}>
            <BegleitungAvatar size={96} zustand="ruhig" groesse="gross" stabil />
          </span>
          <h1 id="code-titel" className="text-[30px] font-extrabold leading-tight tracking-tight">
            {change ? CODE_TEXTE.aendern : CODE_TEXTE.titel}
          </h1>
          <p className="max-w-xs text-[17px] leading-snug text-muted">{CODE_TEXTE.satz}</p>
          <input
            ref={input}
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            aria-label={CODE_TEXTE.feld}
            aria-describedby="code-hinweis"
            placeholder={CODE_TEXTE.feld}
            className={`${INPUT_BASE} h-14 w-full max-w-xs px-4 text-center`}
          />
          <p id="code-hinweis" className="-mt-3 text-[13px] text-muted">
            {CODE_TEXTE.hinweis}
          </p>
          <p className="min-h-6 text-[15px] font-semibold text-accent-strong" role="status">
            {state === "falsch" ? "Der Code passt nicht. Nochmal?" : state === "pause" ? "Kurz Pause. Gleich nochmal?" : state === "offline" ? "Komm grad nicht durch. Gleich nochmal?" : ""}
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <button type="submit" disabled={!code.trim() || state === "busy"} className={`${buttonClass("primary", "lg")} w-full`}>
            {CODE_TEXTE.knopf}
          </button>
          <p className="text-center text-sm text-muted">
            Ohne Code geht’s auch: Schreiben mit ＋ funktioniert immer.{" "}
            <button type="button" onClick={later} className="hit font-semibold text-accent-strong underline">
              {change ? "Abbrechen" : "Später"}
            </button>
          </p>
          <RechtLinks dicht nur={["/impressum", "/datenschutz"]} className="mt-1 text-faint" />
        </div>
      </form>
    </section>
  );
}
