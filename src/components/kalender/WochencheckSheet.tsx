"use client";

// Wochencheck (Tafel 36): einfach drauflos reden. Zuhören im langen Modus
// (Pausen sind okay, bis „Fertig“), mitlaufender Text mit orange markierten
// Kernwörtern und grauen Füllwörtern, darunter „Ich hab schon“ (grob lokal
// erkannt). „Fertig“ → mit KI ein Rutsch über `woche_eintragen`, ohne KI die
// eigene Erkennung → „Deine Woche“: ruhige Zeilen, Fragen als Chips, Zeile
// antippen = ändern, „Alles übernehmen“ (ein Rückgängig für alles).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { MiaLayer, MiaStage } from "@/components/begleitung/MiaStage";
import { helperName } from "@/lib/einstellungen/profile";
import { buttonClass } from "@/components/ui/styles";
import { MIC_BLOCKED, MicStrip } from "@/components/ui/MicPermission";
import { WeekItemCard, WeekLegend, WeekRow } from "@/components/kalender/WeekPreview";
import { createEntry } from "@/lib/core/entries";
import { todayIso } from "@/lib/core/now";
import { pushUndo } from "@/lib/core/undo";
import { showToast } from "@/lib/core/toast";
import { sanitizeEntry, upsertEntry, mondayOf, type CalendarEntry } from "@/lib/kalender/model";
import { changeEntries } from "@/lib/kalender/store";
import { fillerSpans, itemFromEntry, parseWeekTalk, sortWeek, weekDayLabel, weekEntries, type WeekItem } from "@/lib/kalender/wochencheck";
import { readSentence } from "@/lib/kalender/sentence";
import { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { aiUsable, askAssistant } from "@/lib/begleitung/client";
import type { AssistantData } from "@/lib/begleitung/ops";

type Stage = "zuhoeren" | "sortieren" | "woche";

/** Live: Kernwörter orange, Füllwörter grau */
function TalkText({ text }: { text: string }) {
  const spans = [
    ...fillerSpans(text).map((s) => ({ ...s, kind: "f" as const })),
    ...text
      .split(/(?<=[.!?])\s+/)
      .reduce<{ at: number; out: { start: number; end: number }[] }>(
        (acc, part) => {
          const r = readSentence(part, todayIso());
          acc.out.push(...r.spans.map((s) => ({ start: acc.at + s.start, end: acc.at + s.end })));
          acc.at += part.length + 1;
          return acc;
        },
        { at: 0, out: [] },
      )
      .out.map((s) => ({ ...s, kind: "k" as const })),
  ].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [i, s] of spans.entries()) {
    if (s.start < at) continue;
    parts.push(text.slice(at, s.start));
    parts.push(
      <span key={i} className={s.kind === "k" ? "rounded-field bg-accent-soft px-0.5 text-accent-strong" : "text-faint"}>
        {text.slice(s.start, s.end)}
      </span>,
    );
    at = s.end;
  }
  parts.push(text.slice(at));
  return <p className="text-[17px] leading-relaxed whitespace-pre-wrap">{parts}</p>;
}

export function WochencheckSheet({ data, onClose }: { data: AssistantData; onClose: () => void }) {
  const today = todayIso();
  const router = useRouter();
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>("zuhoeren");
  const [items, setItems] = useState<WeekItem[]>([]);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<WeekItem | null>(null);
  const persons = data.profile.persons.filter((p) => p.name.trim()).map((p) => ({ id: p.id, name: p.name.trim() }));
  const entries = data.entries ?? [];
  const speech = useSpeechInput({ long: true, onTranscript: setText, onEnd: (t) => t && setText(t) });
  // grob mitlesen (ohne KI) – nur zum Zeigen, was schon angekommen ist
  const rough = text.trim() ? parseWeekTalk(text, today, persons, entries).items : [];

  const understand = async () => {
    speech.reset();
    if (!text.trim()) return;
    setStage("sortieren");
    let found: WeekItem[] | null = null;
    try {
      if (await aiUsable()) {
        const reply = await askAssistant([{ role: "user", text: `[Wochencheck] ${text.trim()}` }], [], data, today, mondayOf(today));
        const ops = reply.ops.filter((o) => o.type === "upsert_entry");
        if (ops.length) found = ops.flatMap((o, i): WeekItem[] => (o.type === "upsert_entry" ? [itemFromEntry(o.entry, `k${i}`, o.hint)] : []));
      }
    } catch {
      // ohne KI geht es auch
    }
    setItems(sortWeek(found ?? parseWeekTalk(text, today, persons, entries).items));
    setOff(new Set());
    setStage("woche");
  };

  const take = () => {
    const chosen = items.filter((i) => !off.has(i.id) && !i.already);
    const made = weekEntries(chosen, today, (typ, d, raum) => sanitizeEntry(createEntry(typ, d, { raum }) as CalendarEntry));
    if (!made.length) return onClose();
    // Ein Rückgängig für den ganzen Wochencheck
    const undo = pushUndo("den Wochencheck", changeEntries((list) => made.reduce((l, e) => upsertEntry(l, e), list)));
    showToast({ text: `${made.length} ${made.length === 1 ? "Sache" : "Sachen"} eingetragen ✓`, small: true, seconds: 3, undo, undoneText: "Wieder weg" });
    onClose();
    // Erst wenn der Verlaufseintrag des Fensters weg ist, sonst nähme dessen Zurück den Kalender wieder weg
    setTimeout(() => router.push("/?seite=kalender"), 400);
  };

  if (stage === "woche") {
    const count = items.filter((i) => !i.already).length;
    const questions = items.filter((i) => i.question && !off.has(i.id)).length;
    return (
      <Sheet title="Deine Woche" onClose={onClose} tall>
        <div className="flex flex-col gap-2 pb-3">
          <p className="-mt-2 text-sm text-muted">
            {count} {count === 1 ? "Sache" : "Sachen"}
            {questions ? ` · ${questions} ${questions === 1 ? "Frage" : "Fragen"}` : ""}
          </p>
          <WeekLegend />
          {items.length ? (
            <ul className="flex flex-col divide-y divide-line rounded-card bg-surface px-3">
              {items.map((i) => (
                <WeekRow
                  key={i.id}
                  item={i}
                  today={today}
                  on={!off.has(i.id)}
                  onToggle={() => setOff((s) => (s.has(i.id) ? new Set([...s].filter((x) => x !== i.id)) : new Set([...s, i.id])))}
                  onOpen={() => setEdit(i)}
                  onAnswer={(time) => setItems((list) => list.map((x) => (x.id === i.id ? { ...x, question: undefined, ...(time ? { time, minutes: x.minutes ?? 60 } : {}) } : x)))}
                />
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted">Hm, da hab ich nichts Eindeutiges gefunden. Magst du es nochmal sagen?</p>
          )}
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => setStage("zuhoeren")} className={buttonClass("ghost", "md")}>
              Nochmal
            </button>
            <button type="button" onClick={take} disabled={!count} className={buttonClass("primary", "md")}>
              Alles übernehmen
            </button>
          </div>
        </div>
        {edit && (
          <WeekItemCard
            item={edit}
            today={today}
            onClose={() => setEdit(null)}
            onDrop={() => (setOff((s) => new Set([...s, edit.id])), setEdit(null))}
            onSave={(next) => (setItems((list) => sortWeek(list.map((x) => (x.id === next.id ? next : x)))), setEdit(null))}
          />
        )}
      </Sheet>
    );
  }

  // Zuhören in derselben Mia-Ansicht wie sonst (Tafel 53): Mia in der Mitte, darunter der Text
  return (
    <MiaLayer name="Wochencheck" onClose={onClose} closeText="Abbrechen">
      <MiaStage name={helperName(data.profile)} status={speech.listening ? "hoert" : stage === "sortieren" ? "denkt" : "bereit"} text={speech.listening ? "Ich höre zu – Pausen sind okay" : "Wochencheck – sag einfach alles, ich sortiere."} live={false} compact names={[]} done={false} />
      <div className="safe-bottom flex min-h-0 flex-1 flex-col gap-3 px-4 pb-3 pt-3">
        <MicStrip />
        <div className="min-h-40 flex-1 overflow-y-auto rounded-card bg-surface p-4">
          {speech.listening ? (
            text || speech.interim ? <TalkText text={`${text}${speech.interim ? ` ${speech.interim}` : ""}`.trim()} /> : <p className="text-[17px] text-faint">Erzähl einfach, was diese Woche ansteht …</p>
          ) : (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="Erzähl einfach, was diese Woche ansteht – oder tipp es hier ein." aria-label="Was steht an?" className="h-full min-h-40 w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-faint" />
          )}
        </div>
        {rough.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-[13px] font-bold text-muted">Ich hab schon</span>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {rough.slice(0, 12).map((i) => (
                <span key={i.id} className="inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] font-semibold">
                  <span className={`h-2 w-2 rounded-full ${i.raum === "arbeit" ? "bg-work" : i.raum === "privat" ? "bg-muted" : "bg-accent"}`} aria-hidden />
                  {weekDayLabel(i, today)} {i.title}
                </span>
              ))}
            </div>
          </div>
        )}
        {stage === "sortieren" ? (
          <p className="py-3 text-center text-base font-semibold text-muted" role="status">
            Ich sortiere …
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-label={speech.blocked ? "Mikro aus – so machst du es an" : speech.listening ? "Zuhören anhalten" : "Erzählen"}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${speech.blocked ? MIC_BLOCKED : "bg-accent-soft text-accent-strong"} ${speech.listening ? "animate-pulse" : ""}`}
            >
              {speech.listening ? <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden /> : <Mic className="h-6 w-6" strokeWidth={2.25} aria-hidden />}
            </button>
            <span className="min-w-0 flex-1 text-[13px] text-muted">{speech.listening ? "Ich höre zu – Pausen sind okay" : "Tipp aufs Mikro"}</span>
            <button type="button" onClick={() => void understand()} disabled={!text.trim() && !speech.listening} className={`${buttonClass("primary", "lg")} px-7`}>
              Fertig
            </button>
          </div>
        )}
      </div>
    </MiaLayer>
  );
}
