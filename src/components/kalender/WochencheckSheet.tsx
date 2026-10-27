"use client";

// Wochencheck (Tafel 36): einfach drauflos reden. Zuhören im langen Modus
// (Pausen sind okay, bis „Fertig“ oder Mia antippen) auf der Bühne, das Gesagte
// als eigene Blase (Kernwörter fett), darunter „Ich hab schon“ (grob lokal
// erkannt). „Fertig“ → mit KI ein Rutsch über `woche_eintragen`, ohne KI die
// eigene Erkennung → „Deine Woche“: ruhige Zeilen, Fragen als Chips, Zeile
// antippen = ändern, „Alles übernehmen“ (ein Rückgängig für alles).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { MiaBubble, MiaLayer, OwnBubble, StageFoot, StageMia, StageTopic } from "@/components/begleitung/MiaStage";
import { stageHint, stageLabel, stageLayout, stageState, stageTap } from "@/lib/begleitung/stage";
import { helperName } from "@/lib/einstellungen/profile";
import { buttonClass, INPUT_BASE } from "@/components/ui/styles";
import { MicStrip } from "@/components/ui/MicPermission";
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

/** Live in der eigenen (orangen) Blase: Kernwörter fett unterstrichen, Füllwörter blasser */
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
      <span key={i} className={s.kind === "k" ? "font-extrabold underline decoration-2 underline-offset-2" : "opacity-70"}>
        {text.slice(s.start, s.end)}
      </span>,
    );
    at = s.end;
  }
  parts.push(text.slice(at));
  return <span className="text-[17px] leading-relaxed whitespace-pre-wrap">{parts}</span>;
}

export function WochencheckSheet({ data, onClose }: { data: AssistantData; onClose: () => void }) {
  const today = todayIso();
  const router = useRouter();
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>("zuhoeren");
  const [items, setItems] = useState<WeekItem[]>([]);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<WeekItem | null>(null);
  const [typing, setTyping] = useState(false);
  const name = helperName(data.profile);
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

  // Zuhören auf derselben Bühne wie jedes Gespräch: oben Mias Satz und das Gesagte, unten Mia
  const spoken = `${text}${speech.listening && speech.interim ? ` ${speech.interim}` : ""}`.trim();
  const state = stageState({ listening: speech.listening, thinking: stage === "sortieren", speaking: false });
  const mic = { blocked: speech.blocked, supported: speech.supported };
  const layout = stageLayout({ typing, ...mic });
  const tapMia = () => {
    const what = stageTap(state, mic);
    if (what === "fertig") void understand();
    else if (what === "tippen") setTyping(true);
    else if (stage !== "sortieren") speech.start();
  };
  const hint = stage === "sortieren" ? "Ich sortiere …" : speech.listening ? "Pausen sind okay – fertig? Einfach antippen" : stageHint(state, name, !text.trim());
  const mia = <StageMia state={state} size={layout.size} hint={layout.field ? undefined : hint} label={stageLabel(state, mic)} onTap={tapMia} />;
  const done = (
    <button type="button" onClick={() => void understand()} disabled={!text.trim() || stage === "sortieren"} className={`${buttonClass("primary", "md")} px-7`}>
      Fertig
    </button>
  );
  return (
    <MiaLayer name="Wochencheck" onClose={onClose}>
      <div className="mia-gespraech flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3">
        <StageTopic topic="WOCHENCHECK" />
        <MiaBubble lead>Sag einfach alles, was diese Woche ansteht – ich sortiere.</MiaBubble>
        {spoken && !layout.field && (
          <OwnBubble live={speech.listening}>
            <TalkText text={spoken} />
          </OwnBubble>
        )}
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
      </div>
      {layout.field ? (
        <div className="safe-bottom flex shrink-0 flex-col items-center gap-2 px-4 pt-1">
          {mia}
          <div className="w-full">
            <MicStrip />
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Erzähl einfach, was diese Woche ansteht – oder tipp es hier ein." aria-label="Was steht an?" className={`${INPUT_BASE} w-full resize-none px-4 py-3 leading-relaxed`} />
          <div className="flex w-full justify-end">{done}</div>
        </div>
      ) : (
        <StageFoot>
          {mia}
          <div className="mia-gespraech flex items-center gap-5">
            <button type="button" onClick={() => setTyping(true)} className="hit min-h-11 text-[15px] font-semibold text-muted active:text-ink">
              Lieber schreiben
            </button>
            {text.trim() && !speech.listening && done}
          </div>
        </StageFoot>
      )}
    </MiaLayer>
  );
}
