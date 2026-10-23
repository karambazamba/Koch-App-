"use client";

// Erster Start (nur ganz am Anfang oder nach "Neu anfangen"): der
// Hallo-Bildschirm nach Tafel 55 – Mia groß und rund, „Hallo, ich bin Mia.“
// („Mia.“ in Orange), „Erzähl mir einfach, was ansteht. Ich sortiere für
// euch.“, „Los geht’s“, „Daten wiederherstellen“ und klein unten die Marke
// (BrandMark, gedämpft) mit „möglich gemacht von KARAMBA“. Ablauf:
//   0,0 s Mia ploppt auf, 0,95 s Überschrift tippt sich ein (sie spricht
//   dabei), 1,8 s Zeile, 2,2 s „Los geht’s“, Link und Marke
// Danach blinzelt sie, die Augen folgen dem Finger (max. ~3 px); antippen:
// hüpfen, Smiley-Augen, Herzchen, kleiner Satz. „Los geht’s“ fragt einmal
// den Look und startet frisch (`startFresh`), Mia fliegt in die Jetzt-Karte
// (`hello.ts`). Die Begrüßung läuft genau einmal: erst wenn die Seite fertig
// ist (nach dem Laden, Schrift da) – vorher ist alles unsichtbar; ein
// Neuaufbau setzt sie fort statt neu. Bewegung reduzieren = alles sofort.

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { BrandMark } from "@/components/ui/BrandMark";
import { DEFAULT_HELPER, avatarHex, helperName } from "@/lib/einstellungen/profile";
import { startFresh } from "@/lib/einstellungen/welcomeStore";
import { LookStep } from "@/components/einstellungen/aussehen/LookStep";
import type { AppLook } from "@/lib/einstellungen/profile";
import { expectReplace } from "@/lib/core/navigation";
import { helloElapsed, markHelloShown, reducedMotion, setHelloElapsed, setHelloFlight } from "@/lib/core/hello";
import type { AvatarZustand } from "@/lib/core/avatarState";

const T = { title: 950, sub: 1800, buttons: 2200 };
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
  const name = helperName(null);
  const title = `Hallo, ich bin ${name}.`;
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

  // „Los geht’s“ → einmal der Look (Farbig/Schlicht), dann die Startseite
  const [asking, setAsking] = useState(false);
  const start = (look: AppLook = "farbig") => {
    const r = face.current?.getBoundingClientRect();
    setHelloFlight(r && r.width ? { x: r.left, y: r.top, size: r.width } : null);
    startFresh(look);
    if (path !== "/") {
      expectReplace();
      router.replace("/");
    }
  };
  const prefix = title.slice(0, title.length - name.length - 1);
  const shown = title.slice(0, typed);
  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-background" aria-label="Willkommen">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.5rem)] text-center [@media(max-height:620px)]:pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex w-full flex-1 flex-col items-center justify-center pb-4">
          <div className="relative">
            <button
              ref={face}
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => {
                const n = taps.current++;
                setTap({ n, text: TAPS[n % TAPS.length] });
              }}
              className={`hello-face block rounded-full ${ms === null ? "opacity-0" : ""}`}
              style={{ "--ex": `${look.x}px`, "--ey": `${look.y}px` } as CSSProperties}
              data-hello={ms === null ? "wartet" : "laeuft"}
            >
              <BegleitungAvatar size={132} color={color} zustand={zustand} groesse="gross" stabil />
            </button>
            {tap && (
              <>
                <span key={`b${tap.n}`} className="hello-bubble absolute -top-3 left-1/2 whitespace-nowrap rounded-card bg-surface px-3 py-1.5 text-sm font-bold shadow-card" role="status">
                  {tap.text}
                </span>
                {[0, 1, 2].map((i) => (
                  <span key={`h${tap.n}-${i}`} className="hello-heart pointer-events-none absolute text-lg" style={{ left: `${18 + i * 28}%`, top: "10%", animationDelay: `${i * 90}ms`, color }} aria-hidden>
                    {i === 1 ? "✦" : "♥"}
                  </span>
                ))}
              </>
            )}
          </div>
          <h1 tabIndex={-1} className="mt-8 min-h-[38px] text-[31px] font-extrabold leading-tight tracking-tight outline-none" aria-label={title}>
            <span aria-hidden>
              {shown.slice(0, prefix.length)}
              <span className="text-accent">{shown.slice(prefix.length)}</span>
            </span>
            {typing && <span className="hello-caret" aria-hidden />}
          </h1>
          <p className={`mt-2 max-w-[19rem] text-[16px] font-medium leading-snug text-muted ${show(T.sub)}`}>Erzähl mir einfach, was ansteht. Ich sortiere für euch.</p>
        </div>
        <div className={`flex w-full flex-col items-center gap-1 ${show(T.buttons)}`}>
          <button type="button" onClick={() => setAsking(true)} className="h-14 w-full rounded-field text-[17px] font-bold text-on-color active:scale-[0.98]" style={{ backgroundColor: color }}>
            Los geht’s
          </button>
          <Link href="/profil/daten" className="hit inline-flex h-11 items-center gap-1 whitespace-nowrap text-[clamp(12px,3.6vw,14px)] font-semibold text-muted">
            Schon mal genutzt? <span className="text-accent-strong">Daten wiederherstellen</span>
          </Link>
          <div className="mt-3 flex flex-col items-center gap-1 opacity-60" data-hello-marke>
            <BrandMark height={22} />
            <span className="text-xs font-semibold text-muted">möglich gemacht von KARAMBA</span>
          </div>
        </div>
      </div>
      {asking && <LookStep onDone={start} />}
    </main>
  );
}
