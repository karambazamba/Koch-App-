"use client";

// Kleine Bausteine für Tipps aus der Region: Icon (Linien, lila), „von
// KARAMBA“ (Pink), Etiketten, Zeitangaben und die Zeile für Listen.

import { Baby, Bike, Heart, Leaf, Music, ShoppingBasket, Ticket, type LucideIcon } from "lucide-react";
import { tipIcon, tipTags, type TipIcon as IconKind } from "@/lib/tipps/categories";
import { tipDate, tipTime, weekday, type TipView } from "@/lib/tipps/model";

const ICONS: Record<IconKind, LucideIcon> = { musik: Music, markt: ShoppingBasket, sport: Bike, kinder: Baby, ticket: Ticket, natur: Leaf, herz: Heart };

export function TipIcon({ tip, size = 40 }: { tip: TipView; size?: number }) {
  const Icon = ICONS[tipIcon(tip)];
  return (
    <span className="flex shrink-0 items-center justify-center rounded-field bg-tipp-soft text-tipp" style={{ width: size, height: size }} aria-hidden>
      <Icon className="h-[52%] w-[52%]" strokeWidth={2} />
    </span>
  );
}

export const KarambaLine = () => <span className="block text-[11px] font-extrabold uppercase tracking-wide text-karamba">von KARAMBA</span>;

export const SampleMark = () => <span className="rounded-full bg-fill px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted">Beispiel</span>;

const DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const LONG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** „Samstag, 24. Oktober“ */
export const dayTitle = (date: string) => LONG.format(new Date(`${date}T12:00:00Z`));

/** „Sa 15:00“ bzw. „Sa · ganztägig“ */
export function tipWhen(t: TipView): string {
  const day = DAY_SHORT[weekday(tipDate(t))];
  const time = tipTime(t);
  return time ? `${day} ${time}` : `${day} · ganztägig`;
}

/** „15:00 · Eutin · 3 km“ */
export function tipMeta(t: TipView, withDay = false): string {
  const time = withDay ? tipWhen(t) : (tipTime(t) ?? "ganztägig");
  const km = t.km < 1 ? "hier" : `${String(Math.round(t.km)).replace(".", ",")} km`;
  return [time, t.ort_name, km].join(" · ");
}

export function TipTags({ tip, max = 3 }: { tip: TipView; max?: number }) {
  const tags = tipTags(tip, max);
  if (!tags.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded-full bg-tipp-soft px-2 py-0.5 text-[11.5px] font-bold text-tipp">
          {t}
        </span>
      ))}
    </span>
  );
}

/** Zeile in Listen (/tipps, Kalender, Chat): Icon, Titel, „Zeit · Ort · Entfernung“, Etiketten */
export function TipRow({ tip, onOpen, withDay = false, action }: { tip: TipView; onOpen: () => void; withDay?: boolean; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`${tip.titel} – ${tipMeta(tip, true)}`}>
        <TipIcon tip={tip} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {tip.karamba && <KarambaLine />}
          <span className="flex items-center gap-1.5">
            <span className="line-clamp-2 text-[15.5px] font-bold leading-snug">{tip.titel}</span>
            {tip.quelle === "demo" && <SampleMark />}
          </span>
          <span className="truncate text-[13px] font-semibold text-muted">{tipMeta(tip, withDay)}</span>
          <TipTags tip={tip} />
        </span>
      </button>
      {action}
    </div>
  );
}
