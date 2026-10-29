"use client";

// Jetzt-Karte (Tafel 60/66 B, A-054): oben auf "Heute", volle Breite,
// Pfirsich-Verlauf. Nur, was man heute braucht – EIN Thema, höchstens zwei
// (Rangliste in `lib/heute/jetztTopics.ts`); nichts dran = gar keine Karte.
// Links das Symbol des Themas in einem weißen Kreis (46 px, Orange; Uhr,
// Wolke, Topf, Geschenk – nie Glitzer), Zeile 1 fett = was, Zeile 2 =
// Hinweis oder ein Knopf („Auf die Liste: Eier“). Texte brechen um, nie abgeschnitten;
// die Karte ist mindestens 78 px hoch. Antippen öffnet wie jede Kachel „Dein
// Tag“ (läuft ein Timer: den Timer); nach links wischen = nächstes Thema.
// Freitags 12–20 Uhr die Wochenende-Karte: Vorschläge als Chips, „Mit Mia
// planen“ und „Später“. Die Reihenfolge bleibt stehen, bis die App wieder
// geöffnet wird, 15 Minuten vergehen oder etwas sehr Dringendes dazukommt.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, CalendarDays, Clock, CloudRain, CookingPot, Gift, Heart, Lightbulb, Mail, MapPin, Sunrise, Timer, Wind, type LucideIcon } from "lucide-react";
import type { JetztTopic } from "@/lib/heute/jetztTopics";
import type { WochenendChip } from "@/lib/heute/wochenende";
import { topicIcon, type TopicIcon } from "@/lib/heute/deinTag";
import { withoutEmoji } from "@/lib/core/text";
import { buttonClass, chipClass } from "@/components/ui/styles";

const ROSE = new Set<TopicIcon>(["Heart", "Gift"]);
const ICON: Record<TopicIcon, LucideIcon> = { Clock, CloudRain, CookingPot, Gift, Heart, Timer, Sunrise, CalendarDays, Bell, Mail, MapPin, Lightbulb, Wind };

const REFRESH_MS = 15 * 60_000;
/** Rang bis hier (Erinnerung, Gleich) gilt als sehr dringend */
const URGENT = 10;
const MAX_TOPICS = 2;

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
  const urgentNew = topics.some((t) => t.rang <= URGENT + 1 && !order.includes(t.id));
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

/** Was die Wochenende-Karte kann (Vorschlag, „Mit Mia planen“, „Später“) */
export type WochenendAktionen = { onChip: (chip: WochenendChip) => void; onPlan: () => void; onSpaeter: (t: JetztTopic) => void };

/** Wochenende planen? (nur freitags 12–20 Uhr): Zeile 1, was schon steht, 2–3 Vorschläge, zwei Knöpfe */
function WochenendKarte({ topic, name, aktionen }: { topic: JetztTopic; name: string; aktionen: WochenendAktionen }) {
  return (
    <section aria-label={`${name}: Jetzt`} aria-roledescription="Jetzt-Karte" data-no-swipe data-jetzt="wochenende" className="flex shrink-0 flex-col gap-2.5 rounded-card bg-linear-to-br from-jetzt-from to-jetzt-to px-3 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-surface text-accent shadow-card" data-thema={topicIcon(topic.kind)}>
          <CalendarDays className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col" role="status">
          <span className="break-words text-[15.5px] font-extrabold leading-snug text-ink">{topic.title}</span>
          {topic.detail && (
            <span className="break-words text-[13px] font-semibold leading-snug text-accent-strong">
              {withoutEmoji(topic.detail)}
            </span>
          )}
        </span>
      </div>
      {Boolean(topic.chips?.length) && (
        <div className="flex flex-wrap gap-1.5" data-chips>
          {topic.chips!.map((c) => (
            <button key={c.id} type="button" onClick={() => aktionen.onChip(c)} className={chipClass(false, "vorschlag")} data-chip={c.id}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={aktionen.onPlan} className={buttonClass("primary", "sm")}>
          Mit {name} planen
        </button>
        <button type="button" onClick={() => aktionen.onSpaeter(topic)} className={buttonClass("ghost", "sm")}>
          Später
        </button>
      </div>
    </section>
  );
}

export function JetztCard({
  topics,
  name,
  onOpen,
  onSkip,
  onAktion,
  wochenende,
  arrive = null,
}: {
  topics: JetztTopic[];
  name: string;
  onOpen: (t: JetztTopic) => void;
  onSkip: (t: JetztTopic) => void;
  /** Knopf in Zeile 2 („Auf die Liste: Eier“) */
  onAktion: (t: JetztTopic) => void;
  wochenende: WochenendAktionen;
  /** Vom Hallo-Bildschirm: Mia fliegt von dort hierher, der erste Satz tippt sich ein */
  arrive?: { x: number; y: number; size: number } | null;
}) {
  const order = useStableOrder(topics);
  const shown = order.map((id) => topics.find((t) => t.id === id)).filter((t): t is JetztTopic => Boolean(t));
  const [index, setIndex] = useState(0);
  const i = shown.length ? index % shown.length : 0;
  const topic = shown[i];
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  // Ankunft vom Hallo-Bildschirm: der Kreis fliegt (0,7 s), dann tippt sich der erste Satz ein
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
  if (topic.kind === "wochenende") return <WochenendKarte topic={topic} name={name} aktionen={wochenende} />;
  const Icon = ICON[topicIcon(topic.kind)];
  const next = (dir: 1 | -1) => {
    // 1 → 2 und nicht weiter (kein Kreisel)
    const to = i + dir;
    if (to < 0 || to >= shown.length) return;
    if (dir === 1) onSkip(topic);
    setIndex(to);
  };
  return (
    <section
      aria-label={`${name}: Jetzt`}
      aria-roledescription="Jetzt-Karte"
      data-no-swipe
      data-jetzt={topic.kind}
      className="relative min-h-[78px] shrink-0 rounded-card bg-linear-to-br from-jetzt-from to-jetzt-to"
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
          // Der Klick nach dem Wischen öffnet nichts – danach zählt der nächste Tipp wieder
          swiped.current = true;
          window.setTimeout(() => (swiped.current = false), 400);
          next(dx < 0 ? 1 : -1);
        }
      }}
    >
      {/* Die ganze Karte ist EINE Fläche (wie jede Kachel); nur der Knopf in Zeile 2 liegt darüber */}
      <button
        type="button"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onOpen(topic);
        }}
        aria-label={`${fullTitle}${topic.detail ? ` – ${withoutEmoji(topic.detail)}` : ""}. ${topic.kind === "timer" ? "Timer öffnen" : "Dein Tag öffnen"}`}
        className="absolute inset-0 rounded-card"
      />
      <div className="pointer-events-none relative flex min-h-[78px] items-center gap-3 py-2.5 pl-3 pr-8">
        <span ref={face} className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-surface text-accent shadow-card" data-thema={topicIcon(topic.kind)}>
          {/* Besondere Tage (Herz, Geschenk) in Rosé – sonst Orange */}
          <Icon className={`h-[22px] w-[22px] ${ROSE.has(topicIcon(topic.kind)) ? "text-rosee" : ""}`} strokeWidth={2} aria-hidden />
        </span>
        <span key={topic.id} className="flex min-w-0 flex-1 flex-col items-start" style={{ animation: "jetzt-in 0.35s ease-out" }} role="status">
          <span className="break-words text-[15.5px] font-extrabold leading-snug text-ink">
            {typed >= 0 ? fullTitle.slice(0, typed) || "\u00a0" : fullTitle}
          </span>
          {topic.detail && (
            <span className="break-words text-[13px] font-semibold leading-snug text-accent-strong">
              {withoutEmoji(topic.detail)}
            </span>
          )}
          {topic.aktion && (
            <button type="button" onClick={() => onAktion(topic)} className="hit pointer-events-auto mt-1 inline-flex min-h-8 items-center rounded-full bg-surface px-3 py-1 text-left text-[13px] font-bold leading-tight text-accent-strong shadow-card active:scale-95" data-aktion={topic.aktion.art}>
              {topic.aktion.label}
            </button>
          )}
        </span>
      </div>
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
      <span className="text-[13px] leading-snug">passt sich automatisch an, fester Platz oben, nicht verschiebbar</span>
    </div>
  );
}
