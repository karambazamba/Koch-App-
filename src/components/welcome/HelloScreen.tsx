"use client";

// Erster Start (nur ganz am Anfang oder nach "Neu anfangen"): der
// Hallo-Bildschirm – Ablauf nach dem Mockup „Mia Begrüßung“:
//   0,0 s Mia ploppt einmal auf, 0,7 s winkt
//   0,95 s „Hallo, ich bin Mia.“ tippt sich ein (Mia spricht dabei)
//   2,1 s Untertitel, 2,5 s Mikrofon-Hinweis (Puls-Ring), 2,9 s Knöpfe
// Danach blinzelt Mia alle paar Sekunden, die Augen folgen dem Finger (max.
// ~3 px). Antippen: hüpfen, Smiley-Augen, drei Herzchen und ein kleiner Satz.
// "Los geht’s": Mia fliegt in die Jetzt-Karte der Startseite (`hello.ts`).
// Die Begrüßung läuft genau einmal: erst wenn die Seite fertig ist (nach dem
// Laden, Schrift da) – vorher ist alles unsichtbar; ein Neuaufbau setzt sie
// fort statt neu. Bewegung reduzieren = alles sofort, ohne Animation.

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { LotteAvatar } from "@/components/LotteAvatar";
import { DEFAULT_HELPER, avatarHex } from "@/lib/einstellungen/profile";
import { startFresh } from "@/lib/einstellungen/welcomeStore";
import { expectReplace } from "@/lib/core/navigation";
import { helloElapsed, markHelloShown, reducedMotion, setHelloElapsed, setHelloFlight } from "@/lib/core/hello";
import type { AvatarZustand } from "@/lib/core/avatarState";

const T = { title: 950, sub: 2100, mic: 2500, buttons: 2900 };
const CHAR_MS = 45;
const STEP = 30;
const TAPS = ["Hihi!", "Bereit, wenn du es bist!", "Kitzelig!", "Los geht’s?"];

/** Seite fertig: nach dem ersten Zeichnen und wenn die Schrift geladen ist (höchstens 600 ms warten) */
function usePageReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const timer = window.setTimeout(go, 600);
    void document.fonts?.ready.then(() => requestAnimationFrame(go));
    return () => {
      done = true;
      window.clearTimeout(timer);
    };
  }, []);
  return ready;
}

export function HelloScreen() {
  const router = useRouter();
  const path = usePathname();
  const color = avatarHex(DEFAULT_HELPER.farbe);
  const title = `Hallo, ich bin ${DEFAULT_HELPER.name}.`;
  const ready = usePageReady();
  useEffect(markHelloShown, []);
  const [still] = useState(reducedMotion);
  // Zeit seit Beginn der Begrüßung (läuft weiter, wenn der Bildschirm neu aufgebaut wird)
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!ready) return;
    // Takt über setTimeout (läuft auch, wenn die Uhr in Tests steht); Stand im Modul merken
    const from = still ? 99_999 : helloElapsed();
    const base = performance.now();
    let now = from;
    let timer = 0;
    const tick = () => {
      setMs(now);
      setHelloElapsed(now);
      if (now >= T.buttons + 600) return;
      timer = window.setTimeout(() => {
        // echte Zeit, mindestens aber ein Schritt (steht die Uhr, läuft der Ablauf trotzdem)
        now = Math.max(now + STEP, from + performance.now() - base);
        tick();
      }, STEP);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [ready, still]);
  const at = ms ?? -1;
  const typed = still ? title.length : at < T.title ? 0 : Math.min(title.length, Math.floor((at - T.title) / CHAR_MS) + 1);
  const typing = typed > 0 && typed < title.length;
  // Antippen: hüpfen, Smiley-Augen, Herzchen, kleiner Satz
  const [tap, setTap] = useState<{ n: number; text: string } | null>(null);
  const taps = useRef(0);
  useEffect(() => {
    if (!tap) return;
    const t = window.setTimeout(() => setTap(null), 1800);
    return () => window.clearTimeout(t);
  }, [tap]);
  // Vor dem Start ruhig (unsichtbar) – so beginnt das Aufploppen erst, wenn Mia sichtbar wird
  const zustand: AvatarZustand = still || ms === null ? "ruhig" : tap ? "freuen" : at < T.title ? "begruessen" : typing ? "sprechen" : "ruhig";
  // Augen folgen dem Finger (max. ~3 px)
  const face = useRef<HTMLButtonElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (still) return;
    const move = (e: PointerEvent) => {
      const r = face.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 200) * 2;
      setLook({ x: (dx / d) * k, y: (dy / d) * k });
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
    };
  }, [still]);
  const show = (from: number) => (still ? "" : at >= from ? "hello-in" : "opacity-0");

  const start = () => {
    const r = face.current?.getBoundingClientRect();
    setHelloFlight(r ? { x: r.left, y: r.top, size: r.width } : null);
    startFresh();
    if (path !== "/") {
      expectReplace();
      router.replace("/");
    }
  };
  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-background" aria-label="Willkommen">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-[8vh]">
          <div className="relative">
            <button
              ref={face}
              type="button"
              onClick={() => {
                const n = taps.current++;
                setTap({ n, text: TAPS[n % TAPS.length] });
              }}
              aria-label={`${DEFAULT_HELPER.name} antippen`}
              className={`hello-face block rounded-full ${ms === null ? "opacity-0" : ""}`}
              style={{ "--ex": `${look.x}px`, "--ey": `${look.y}px` } as CSSProperties}
              data-hello={ms === null ? "wartet" : "laeuft"}
            >
              <LotteAvatar size={150} color={color} zustand={zustand} groesse="gross" stabil />
            </button>
            {tap && (
              <>
                <span key={`b${tap.n}`} className="hello-bubble absolute -top-4 left-1/2 whitespace-nowrap rounded-2xl bg-surface px-3 py-1.5 text-sm font-bold shadow-card" role="status">
                  {tap.text}
                </span>
                {[0, 1, 2].map((i) => (
                  <span key={`h${tap.n}-${i}`} className="hello-heart pointer-events-none absolute text-lg" style={{ left: `${22 + i * 26}%`, top: "12%", animationDelay: `${i * 90}ms`, color }} aria-hidden>
                    {i === 1 ? "✦" : "♥"}
                  </span>
                ))}
              </>
            )}
          </div>
          <h1 className="mt-2 min-h-[38px] text-[30px] font-extrabold leading-tight tracking-tight" aria-label={title}>
            <span aria-hidden>{title.slice(0, typed)}</span>
            {typing && <span className="hello-caret" aria-hidden />}
          </h1>
          <p className={`-mt-2 text-base font-medium text-muted ${show(T.sub)}`}>Ich behalte euren Alltag im Blick.</p>
          <p className={`relative inline-flex items-center gap-2 rounded-full bg-quick px-4 py-2 text-sm font-semibold text-quick-ink ${show(T.mic)}`} role="note">
            {!still && at >= T.mic && <span className="hello-pulse absolute inset-0 rounded-full" aria-hidden />}
            <Mic className="relative h-4 w-4" strokeWidth={2.25} aria-hidden />
            <span className="relative">Du kannst auch einfach mit mir sprechen</span>
          </p>
        </div>
        <div className={`flex w-full flex-col items-center gap-2 ${show(T.buttons)}`}>
          <button type="button" onClick={start} className="h-14 w-full rounded-[18px] text-[17px] font-bold text-white active:scale-[0.98]" style={{ backgroundColor: color }}>
            Los geht’s
          </button>
          <Link href="/profil/daten" className="hit inline-flex h-11 items-center text-sm font-semibold text-muted">
            Ich habe eine Sicherung
          </Link>
        </div>
      </div>
    </main>
  );
}
