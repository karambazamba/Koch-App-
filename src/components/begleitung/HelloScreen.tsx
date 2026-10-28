"use client";

// Erster Start (nur ganz am Anfang oder nach "Neu anfangen"): der
// Hallo-Bildschirm nach Tafel 55 – Mia groß und rund, „Moin, ich bin Mia.“
// (Name in Orange, eine Zeile; die einzige Stelle, an der sie sich vorstellt), „Erzähl einfach, was ansteht. / Ich sortier das.“ (zwei
// Zeilen), darunter klein die drei Sätze zur Zustimmung und das Pflicht-
// Häkchen (A-027: „Bevor’s losgeht“ ist kein eigener Schritt mehr; das
// Häkchen speichert die Einwilligung sofort, `BedingungenHaken`), „Los
// geht’s“ erst mit Häkchen, mit Konten „Schon ein Konto? Anmelden“ und unten nur
// ein ruhiger, mittiger Abschluss (Tafel 84, Variante A – kein kleines Logo,
// die große Mia reicht): „Gemacht in Eutin von KARAMBA Eis“, darunter leiser
// „Nutzungsbedingungen · Datenschutz · Impressum“ (Links mit 44-px-Tippfläche). Ablauf:
//   0,0 s Mia ploppt auf, 0,95 s Überschrift tippt sich ein (sie spricht
//   dabei), 1,8 s Zeile, 2,0 s Freudensprung (ducken, eine Drehung, Landung
//   mit Funken, „Ich bin bereit!“, zwei kleine Hüpfer, „Los geht’s“
//   pulsiert zweimal), 2,2 s „Los geht’s“, Link und Abschluss unten
// Danach blinzelt sie, die Augen folgen dem Finger (max. ~3 px); antippen =
// kitzelig: kichernd wackeln, Smiley-Augen, drei Herzen, kleiner Satz
// (während des Sprungs erst danach). „Los geht’s“ führt zu „Für wen soll ich
// sortieren?“ (Bildschirm 2), das startet frisch (`startFresh`), Mia fliegt in
// die Jetzt-Karte (`hello.ts`). Braucht die KI einen Zugangscode, kommt danach
// höchstens noch „Fast geschafft.“ (`CodeGate`) – zusammen höchstens 3. Die Begrüßung läuft genau einmal: erst wenn die Seite fertig
// ist (nach dem Laden, Schrift da) – vorher ist alles unsichtbar; ein
// Neuaufbau setzt sie fort statt neu. Bewegung reduzieren = alles sofort.

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { DEFAULT_HELPER, avatarHex } from "@/lib/einstellungen/profile";
import { startFresh } from "@/lib/einstellungen/welcomeStore";
import { ZeigMalStep } from "@/components/begleitung/ZeigMalStep";
import { BedingungenHaken, useBedingungenOk } from "@/components/datenschutz/BedingungenHaken";
import { VOR_DEM_START } from "@/lib/datenschutz/rechtstexte";
import { expectReplace } from "@/lib/core/navigation";
import { useCloudMode } from "@/lib/konten/backend";
import { HELLO_JUMP_MS, HELLO_READY, HELLO_T, helloElapsed, helloJump, helloTapText, markErsterStart, markHelloShown, reducedMotion, setHelloElapsed, setHelloFlight } from "@/lib/core/hello";
import { helperMessage, helperName } from "@/lib/einstellungen/profile";
import { buzz } from "@/components/heute/actions";
import type { AvatarZustand } from "@/lib/core/avatarState";
import type { Haushalt } from "@/lib/core/haushalt";

const T = HELLO_T;
type Schritt = "hallo" | "zeigmal";
const CHAR_MS = 45;
const STEP = 30;
/** So lange läuft der Takt (bis die Sprechblase nach dem Sprung weg ist) */
const TICK_END = T.jump + 1050 + 2500 + 100;
/** Funken bei der Landung: Richtung (px) und Farbe */
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.3;
  return { dx: Math.round(Math.cos(a) * 64), dy: Math.round(Math.sin(a) * 34 - 26), tone: i % 2 ? "var(--app-spark-yellow)" : "var(--app-spark-orange)" };
});

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
  const cloud = useCloudMode();
  // Einzige Vorstellung: beim allerersten Start (sonst stellt sie sich nie vor)
  const name = helperName();
  const lead = "Moin, ich bin ";
  const title = `${lead}${name}.`;
  const ready = usePageReady();
  useEffect(markHelloShown, []);
  const [still] = useState(reducedMotion);
  // Lief der Sprung schon (Neuaufbau mitten in der Begrüßung)? Dann nicht doppelt
  const [jumpDone] = useState(() => helloElapsed() > T.jump);
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
      if (now >= TICK_END) return;
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
  // Freudensprung bei 2,0 s (einmal, ohne Antippen)
  const jump = helloJump(at, jumpDone || still);
  const landed = jump.on && at - T.jump >= 950;
  useEffect(() => {
    if (landed) buzz();
  }, [landed]);
  // Bewegung reduzieren: kein Sprung, nur die Sprechblase
  const [stillBubble, setStillBubble] = useState(false);
  useEffect(() => {
    if (!still || !ready || jumpDone) return;
    const show = window.setTimeout(() => setStillBubble(true), T.jump);
    const hide = window.setTimeout(() => setStillBubble(false), T.jump + 2500);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [still, ready, jumpDone]);
  const readyBubble = jump.bubble || stillBubble;
  // Sprunghöhe: bis ~115 px, aber nie oben aus dem Bild (kleine Bildschirme)
  const [jumpHeight, setJumpHeight] = useState(115);
  useEffect(() => {
    if (!jump.on) return;
    const top = face.current?.getBoundingClientRect().top ?? 200;
    setJumpHeight(Math.max(24, Math.min(115, Math.round(top - 6))));
  }, [jump.on]);
  // Antippen = kitzelig: wackeln, Smiley-Augen, Herzen, kleiner Satz (im Sprung erst danach)
  const [tap, setTap] = useState<{ n: number; text: string } | null>(null);
  const taps = useRef(0);
  const jumpEndsIn = jump.on ? T.jump + HELLO_JUMP_MS - at : 0;
  const tickle = () => {
    const n = taps.current++;
    const go = () => setTap({ n, text: helloTapText(n) });
    if (jumpEndsIn > 0) window.setTimeout(go, jumpEndsIn);
    else go();
  };
  useEffect(() => {
    if (!tap) return;
    const t = window.setTimeout(() => setTap(null), 1800);
    return () => window.clearTimeout(t);
  }, [tap]);
  // Vor dem Start ruhig (unsichtbar) – so beginnt das Aufploppen erst, wenn Mia sichtbar wird
  const zustand: AvatarZustand = still || ms === null ? "ruhig" : tap ? "freuen" : at < T.title ? "begruessen" : typing ? "sprechen" : "ruhig";
  const bubbleText = tap?.text ?? (readyBubble ? HELLO_READY : null);
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

  // Häkchen + „Los geht’s“ → „Für wen soll ich sortieren?“ → Startseite mit Beispiel-Tag.
  // Jeder Schritt ist ein Eintrag im Verlauf: die Zurück-Geste geht genau einen Schritt zurück.
  const [schritt, setSchritt] = useState<Schritt>("hallo");
  const tiefe = useRef(0);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { hallo?: Schritt } | null)?.hallo;
      tiefe.current = Math.max(0, tiefe.current - 1);
      setSchritt(s === "zeigmal" ? s : "hallo");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const weiterZu = (s: Schritt) => {
    window.history.pushState({ ...window.history.state, hallo: s }, "");
    tiefe.current += 1;
    setSchritt(s);
  };
  // Zustimmung ist Pflicht für alle: „Los geht’s“ erst mit Häkchen (gespeichert wird beim Antippen des Häkchens)
  const zugestimmt = useBedingungenOk();
  const losGehts = () => {
    if (zugestimmt) weiterZu("zeigmal");
  };
  const start = (r: DOMRect | null, haushalt: Haushalt) => {
    setHelloFlight(r && r.width ? { x: r.left, y: r.top, size: r.width } : null);
    // Standard „Farbig“ (die Look-Frage entfällt; „Lieber schlicht?“ kommt nach 3 Tagen einmal als Hinweis)
    startFresh("farbig", haushalt);
    markErsterStart();
    // Die Hallo-Schritte aus dem Verlauf nehmen: Zurück auf der Startseite führt nicht in den Hallo-Ablauf
    const t = tiefe.current;
    tiefe.current = 0;
    if (t > 0) window.history.go(-t);
    if (path !== "/") {
      expectReplace();
      router.replace("/");
    }
  };
  // „Moin, ich bin “ dunkel, der Name in Orange, der Punkt wieder dunkel
  const shown = title.slice(0, typed);
  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-background" aria-label="Willkommen">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center px-6 pb-[calc(env(safe-area-inset-bottom)+2.25rem)] [@media(max-height:620px)]:pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+2.5rem)] text-center">
        <div className="flex w-full flex-1 flex-col items-center justify-center pb-4 [@media(max-height:620px)]:pb-2">
          {/* Kleine Bildschirme: Mia etwas kleiner, damit Zustimmung und „Los geht’s“ ohne Scrollen passen;
              auf dem SE (≤ 620 px hoch) noch kleiner, oben bleibt Platz für „Ich bin bereit!“ */}
          <div className="relative [@media(max-height:700px)]:-my-3 [@media(max-height:700px)]:scale-[0.82] [@media(max-height:620px)]:-my-5 [@media(max-height:620px)]:scale-[0.7]">
            <span className="hello-shadow" data-sprung={jump.on ? "an" : undefined} aria-hidden />
            <div className="hello-jump" data-sprung={jump.on ? "an" : undefined} data-kitzel={tap ? "an" : undefined} style={{ "--jump": `${jumpHeight}px` } as CSSProperties}>
              <div className="hello-spin">
                <button
                  ref={face}
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={tickle}
                  className={`hello-face block rounded-full ${ms === null ? "opacity-0" : ""}`}
                  style={{ "--ex": `${look.x}px`, "--ey": `${look.y}px` } as CSSProperties}
                  data-hello={ms === null ? "wartet" : "laeuft"}
                >
                  <BegleitungAvatar size={132} color={color} zustand={zustand} groesse="gross" stabil />
                </button>
              </div>
            </div>
            {landed &&
              SPARKS.map((p, i) => <span key={`s${i}`} className="hello-spark" style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, background: p.tone } as CSSProperties} aria-hidden />)}
            {bubbleText && (
              <span
                key={tap ? `b${tap.n}` : "bereit"}
                className={`absolute whitespace-nowrap rounded-card bg-surface px-3 py-1.5 text-[15px] font-extrabold shadow-card ${tap ? "hello-bubble -top-3 left-1/2 text-ink" : "hello-ready -top-4 left-[58%] text-accent-strong"}`}
                role="status"
                aria-label={helperMessage(null, bubbleText)}
                data-hello-blase
              >
                {bubbleText}
              </span>
            )}
            {tap &&
              [0, 1, 2].map((i) => (
                <span key={`h${tap.n}-${i}`} className="hello-heart pointer-events-none absolute text-lg" style={{ left: `${18 + i * 28}%`, top: "10%", animationDelay: `${i * 110}ms`, color }} aria-hidden>
                  ♥
                </span>
              ))}
          </div>
          <h1 tabIndex={-1} className="mt-8 [@media(max-height:700px)]:mt-5 [@media(max-height:620px)]:mt-4 min-h-[38px] whitespace-nowrap text-[clamp(26px,9vw,38px)] font-extrabold leading-tight tracking-tight outline-none" aria-label={title}>
            <span aria-hidden>
              {shown.slice(0, lead.length)}
              <span className="text-accent">{shown.slice(lead.length, lead.length + name.length)}</span>
              {shown.slice(lead.length + name.length)}
            </span>
            {typing && <span className="hello-caret" aria-hidden />}
          </h1>
          <p className={`mt-2 max-w-[19rem] text-[16px] font-medium leading-snug text-muted ${show(T.sub)}`}>
            Erzähl einfach, was ansteht.
            <br />
            Ich sortier das.
          </p>
        </div>
        <div className={`flex w-full flex-col items-center gap-1 ${show(T.buttons)}`}>
          {/* Zustimmung (früher eigener Schritt „Bevor’s losgeht“): drei kurze Sätze klein, darunter das Häkchen */}
          <div className="mb-2 flex w-full flex-col gap-1 text-left [@media(max-height:620px)]:mb-1 [@media(max-height:620px)]:gap-0.5" data-hallo-zustimmung>
            <p className="text-[13px] leading-snug text-muted [@media(max-height:620px)]:text-[12px]">
              {VOR_DEM_START.saetze.map((satz) => (
                <span key={satz} className="block">
                  {satz}
                </span>
              ))}
            </p>
            <BedingungenHaken links={false} />
          </div>
          <button
            key={`los${jump.nudge}`}
            type="button"
            onClick={losGehts}
            disabled={!zugestimmt}
            className={`h-14 w-full [@media(max-height:620px)]:h-12 rounded-field text-[17px] font-bold text-on-color active:scale-[0.98] disabled:opacity-40 ${jump.nudge && zugestimmt ? "hello-nudge" : ""}`}
            style={{ backgroundColor: color }}
          >
            Los geht’s
          </button>
          {/* Tafel 22: nur mit Konten „Schon ein Konto? Anmelden“ – „Daten wiederherstellen“ steht in Einstellungen → Daten & App */}
          {cloud === "supabase" || cloud === "test" ? (
            <Link href="/anmelden" className="hit inline-flex h-11 [@media(max-height:620px)]:h-8 items-center gap-1 whitespace-nowrap text-[clamp(12px,3.6vw,14px)] font-semibold text-muted">
              Schon ein Konto? <span className="text-accent-strong">Anmelden</span>
            </Link>
          ) : (
            <span className="h-11 [@media(max-height:620px)]:h-8" aria-hidden />
          )}
          {/* Tafel 84 (Variante A): unten nur ein ruhiger Abschluss – die große Mia oben reicht, kein kleines Logo */}
          <div className="mt-4 flex flex-col items-center [@media(max-height:620px)]:mt-1" data-hello-marke>
            <span className="whitespace-nowrap text-[clamp(11.5px,3.9vw,13px)] font-semibold text-muted">Gemacht in Eutin von KARAMBA Eis</span>
            <nav aria-label="Rechtliches" className="mt-2 [@media(max-height:620px)]:mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-faint">
              <Link href="/nutzungsbedingungen" className="hit inline-flex h-4 items-center">
                Nutzungsbedingungen
              </Link>
              <span aria-hidden>·</span>
              <Link href="/datenschutz" className="hit inline-flex h-4 items-center">
                Datenschutz
              </Link>
              <span aria-hidden>·</span>
              <Link href="/impressum" className="hit inline-flex h-4 items-center">
                Impressum
              </Link>
            </nav>
          </div>
        </div>
      </div>
      {schritt === "zeigmal" && <ZeigMalStep onDone={start} />}
    </main>
  );
}
