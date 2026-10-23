"use client";

// Jetzt-Karte (Tafel 60): oben auf "Heute", volle Breite, feste Höhe (zwei
// Zeilen, wird nie größer), Pfirsich-Verlauf. Links Mia (32 px, beim Wechsel
// kurz "sprechen"), Zeile 1 fett ohne Emoji = was, Zeile 2 in Dunkelorange =
// warum. Rechts höchstens EIN Knopf (Erledigt / Öffnen / Antworten / Liste /
// Kochen / Packliste); „Erledigt“ zeigt kurz ✓ und wechselt weich zum
// nächsten Thema. Die ganze Karte ist antippbar; nach links wischen =
// nächstes Thema (höchstens drei, kleine Punkte oben rechts).
// Die Reihenfolge der Themen bleibt stehen, bis die App wieder geöffnet wird,
// 15 Minuten vergehen oder etwas sehr Dringendes dazukommt – nichts springt.
// Später Geladenes (Wetter, Tipps) kommt hinten dazu, solange Platz ist.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import type { JetztTopic } from "@/lib/heute/jetztTopics";
import { withoutEmoji } from "@/lib/core/text";

const REFRESH_MS = 15 * 60_000;
const URGENT = 90;
const MAX_TOPICS = 3;

/** Reihenfolge einfrieren: neu nur beim Zurückkehren, alle 15 Min, bei Wegfall oder sehr Dringendem */
function useStableOrder(topics: JetztTopic[]): string[] {
  const ids = topics.map((t) => t.id);
  const [order, setOrder] = useState(ids);
  const latest = useRef(ids);
  useEffect(() => {
    latest.current = topics.map((t) => t.id);
  });
  useEffect(() => {
    const refresh = () => setOrder(latest.current);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    const tick = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const missing = order.some((id) => !ids.includes(id)) || !order.length;
  const urgentNew = topics.some((t) => t.score >= URGENT && !order.includes(t.id));
  if ((missing || urgentNew) && ids.join("|") !== order.join("|")) {
    setOrder(ids);
    return ids;
  }
  // Später Geladenes (Wetter, Tipps) hinten anhängen, solange Platz ist – das Gezeigte bleibt stehen
  const added = ids.filter((id) => !order.includes(id));
  if (order.length < MAX_TOPICS && added.length) {
    const next = [...order, ...added].slice(0, MAX_TOPICS);
    setOrder(next);
    return next;
  }
  return order;
}

export function JetztCard({
  topics,
  name,
  onOpen,
  onDone,
  onSkip,
  arrive = null,
}: {
  topics: JetztTopic[];
  name: string;
  onOpen: (t: JetztTopic) => void;
  onDone: (t: JetztTopic) => void;
  onSkip: (t: JetztTopic) => void;
  /** Vom Hallo-Bildschirm: Mia fliegt von dort hierher, der erste Satz tippt sich ein */
  arrive?: { x: number; y: number; size: number } | null;
}) {
  const order = useStableOrder(topics);
  const shown = order.map((id) => topics.find((t) => t.id === id)).filter((t): t is JetztTopic => Boolean(t));
  const [index, setIndex] = useState(0);
  const i = shown.length ? index % shown.length : 0;
  const topic = shown[i];
  // Beim Wechsel spricht Mia kurz
  const [speaking, setSpeaking] = useState(false);
  const shownId = topic?.id ?? "";
  const [lastId, setLastId] = useState(shownId);
  if (shownId !== lastId) {
    setLastId(shownId);
    setSpeaking(true);
  }
  useEffect(() => {
    if (!speaking) return;
    const t = window.setTimeout(() => setSpeaking(false), 1400);
    return () => window.clearTimeout(t);
  }, [speaking]);
  // „Erledigt“: kurz ✓, dann weich weiter
  const [ticked, setTicked] = useState<string | null>(null);
  useEffect(() => {
    if (!ticked) return;
    const t = window.setTimeout(() => {
      const done = shown.find((x) => x.id === ticked);
      setTicked(null);
      if (done) onDone(done);
    }, 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Abhaken
  }, [ticked]);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  // Ankunft vom Hallo-Bildschirm: Mia fliegt (0,7 s), dann tippt sich der erste Satz ein
  const face = useRef<HTMLSpanElement>(null);
  const [typed, setTyped] = useState(arrive ? 0 : -1);
  useLayoutEffect(() => {
    const el = face.current;
    if (!arrive || !el) return;
    const r = el.getBoundingClientRect();
    const s = arrive.size / r.width;
    el.style.transformOrigin = "0 0";
    el.style.transform = `translate(${arrive.x - r.left}px, ${arrive.y - r.top}px) scale(${s})`;
    el.style.position = "relative";
    el.style.zIndex = "50";
    void el.offsetWidth;
    el.style.transition = "transform 0.7s cubic-bezier(0.5, 0, 0.2, 1)";
    el.style.transform = "none";
    const done = window.setTimeout(() => {
      el.style.transition = "";
      el.style.zIndex = "";
    }, 750);
    return () => window.clearTimeout(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten Zeichnen
  }, []);
  const fullTitle = withoutEmoji(topic?.title ?? "");
  useEffect(() => {
    if (typed < 0) return;
    const t = window.setTimeout(() => setTyped((n) => (n + 1 > fullTitle.length ? -1 : n + 1)), typed === 0 ? 720 : 28);
    return () => window.clearTimeout(t);
  }, [typed, fullTitle.length]);
  if (!topic) return null;
  const next = (dir: 1 | -1) => {
    if (shown.length < 2) return;
    if (dir === 1) onSkip(topic);
    setIndex((n) => (((n + dir) % shown.length) + shown.length) % shown.length);
  };
  return (
    <section
      aria-label={`${name}: Jetzt`}
      aria-roledescription="Jetzt-Karte"
      data-no-swipe
      data-jetzt={topic.kind}
      className="relative h-[78px] shrink-0 overflow-hidden rounded-card bg-linear-to-br from-jetzt-from to-jetzt-to"
      onTouchStart={(e) => {
        start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        swiped.current = false;
      }}
      onTouchEnd={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          swiped.current = true;
          next(dx < 0 ? 1 : -1);
        }
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onOpen(topic);
        }}
        className={`flex h-full w-full items-center gap-3 pl-3.5 text-left ${topic.button ? "pr-[104px]" : "pr-8"}`}
      >
        <span ref={face} className="shrink-0">
          <BegleitungAvatar size={32} zustand={speaking || typed >= 0 ? "sprechen" : undefined} stabil />
        </span>
        <span key={topic.id} className="flex min-w-0 flex-1 flex-col" style={{ animation: "jetzt-in 0.35s ease-out" }} role="status">
          <span className="truncate text-[15.5px] font-extrabold leading-snug text-ink">{typed >= 0 ? fullTitle.slice(0, typed) || "\u00a0" : fullTitle}</span>
          {topic.detail && <span className="truncate text-[13px] font-semibold leading-snug text-accent-strong">{withoutEmoji(topic.detail)}</span>}
        </span>
      </button>
      {topic.button && (
        <button
          type="button"
          onClick={() => (topic.button === "Erledigt" ? setTicked(topic.id) : onOpen(topic))}
          aria-label={ticked === topic.id ? "Erledigt" : `${topic.button}: ${fullTitle}`}
          className="absolute right-3 top-1/2 flex h-11 min-w-[84px] -translate-y-1/2 items-center justify-center rounded-full bg-accent px-3.5 text-[14px] font-bold text-on-accent transition-transform active:scale-95"
        >
          {ticked === topic.id ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden style={{ animation: "check-pop 0.4s ease-out" }} /> : topic.button}
        </button>
      )}
      {shown.length > 1 && (
        <span className="pointer-events-none absolute right-3.5 top-1.5 flex gap-1 text-jetzt-hint" aria-hidden>
          {shown.map((t, n) => (
            <span key={t.id} className={`h-1.5 rounded-full bg-current transition-all ${n === i ? "w-3.5 opacity-80" : "w-1.5 opacity-30"}`} />
          ))}
        </span>
      )}
    </section>
  );
}

/** Bearbeiten-Modus: fester, gestrichelter Platz oben (nicht verschiebbar) */
export function JetztPlaceholder() {
  return (
    <div className="flex h-[78px] shrink-0 flex-col justify-center rounded-card border-2 border-dashed border-line px-4 text-muted" aria-label="Jetzt-Karte (fester Platz)">
      <span className="text-[15px] font-bold text-ink">Jetzt-Karte</span>
      <span className="text-[13px] leading-snug">passt sich automatisch an – fester Platz oben, nicht verschiebbar</span>
    </div>
  );
}
