// Lotte: Timer, Kochen, Sport und der Tagesablauf (Bereich "alltag").
// Timer, Stoppuhr, Kochschritt und "Ich koche jetzt" sind kleine, flüchtige
// Dinge – die App führt sie sofort aus und meldet sie kurz (Machen statt
// fragen). Sport eintragen, Wochenziel, Trainings planen und der
// Startseiten-Modus kommen als Vorschau mit "Übernehmen".

import { createEntry } from "../core/entries";
import { addDays } from "../core/now";
import { sanitizeEntry, type CalendarEntry, type TerminData } from "../aufgaben/model";
import { isRainy } from "../wetter/forecast";
import {
  SPORTS,
  guessMinutes,
  guessSport,
  hoursLabel,
  monthName,
  monthStats,
  planTrainings,
  sanitizeSport,
  sportById,
  trainingsBetween,
  weekStatus,
  weekStreak,
  type DayPart,
} from "../sport/model";
import { formatLeft } from "../timer/model";
import type { LotteTool } from "./registry";
import { nextId, propose, type ToolContext, type ToolResult } from "./tools";

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null);
const fail = (content: string): ToolResult => ({ content, isError: true });
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Kontext-Zeilen: Timer, Kochen, Sport, Startseite */
export function dayContextLines(ctx: { data: ToolContext["data"]; today: string }): string[] {
  const d = ctx.data;
  const lines: string[] = [];
  if (d.tagesablauf) lines.push(`Startseite: Kacheln bleiben, wie sortiert; Jetzt-Karte ${d.tagesablauf.jetzt ? "an" : "aus"} (Morgens bis ${d.tagesablauf.morgenBis}, Feierabend ab ${d.tagesablauf.feierabendAb})`);
  const timers = d.timers ?? [];
  lines.push(`Timer: ${timers.length ? timers.map((t) => `${t.name} ${t.done ? "fertig" : `${formatLeft(t.leftSec * 1000)} übrig${t.paused ? " (pausiert)" : ""}`}`).join("; ") : "keiner"}${d.stopwatch ? `; Stoppuhr ${formatLeft(d.stopwatch.sec * 1000)}${d.stopwatch.running ? " (läuft)" : ""}` : ""}`);
  if (d.kochen) {
    const cur = d.kochen.steps.findIndex((_, i) => !d.kochen!.done.includes(i));
    lines.push(`Kochen${d.kochen.active ? " (Kochen-Modus an)" : ""}: ${d.kochen.dish}${d.kochen.steps.length ? `, Schritt ${cur < 0 ? "alle fertig" : `${cur + 1} von ${d.kochen.steps.length}: ${d.kochen.steps[cur]}`}` : ", ohne Schritte"}`);
  }
  if (d.sport) {
    const week = weekStatus(sanitizeSport(d.sport), d.entries ?? [], ctx.today, d.me);
    lines.push(`Sport: Wochenziel ${week.goal}×, diese Woche ${week.count}`);
  }
  return lines;
}

function timerTools(): LotteTool[] {
  return [
    {
      area: "alltag",
      definition: {
        name: "timer_stellen",
        description: "Timer stellen (läuft sofort, bis zu 5 gleichzeitig): 'Timer 10 Minuten für die Nudeln' → minuten 10, name 'Nudeln'. 'Noch ein Timer 25 Minuten Brötchen'. Antworte kurz ('Läuft: Nudeln, 10 Minuten.').",
        input_schema: { type: "object", properties: { minuten: { type: "number", description: "Dauer in Minuten (auch 0.5)" }, name: { type: "string", description: "Wofür, kurz (z. B. 'Nudeln')" } }, required: ["minuten"], additionalProperties: false },
      },
      run: (ctx, raw) => {
        const input = (raw ?? {}) as Input;
        const minutes = num(input.minuten);
        if (!minutes || minutes <= 0 || minutes > 600) return fail("minuten zwischen 1 und 600 angeben.");
        const live = (ctx.data.timers ?? []).filter((t) => !t.done).length + ctx.ops.filter((o) => o.type === "add_timer").length;
        if (live >= 5) return { content: "Es laufen schon 5 Timer – sag das freundlich: sobald einer fertig ist, geht der nächste." };
        propose(ctx, { id: nextId(ctx), type: "add_timer", name: str(input.name).slice(0, 30), minutes });
        return { content: `Läuft gleich (die App startet ihn sofort): ${str(input.name) || "Timer"}, ${minutes} Minuten. Der Timer steht auf der Startseite.` };
      },
    },
    {
      area: "alltag",
      definition: {
        name: "timer_stoppen",
        description: "Einen laufenden Timer beenden ('Stopp den Nudel-Timer' → name 'Nudeln').",
        input_schema: { type: "object", properties: { name: { type: "string", description: "Name des Timers (leer = der einzige/nächste)" } }, additionalProperties: false },
      },
      run: (ctx, raw) => {
        const name = str((raw as Input | null)?.name);
        if (!(ctx.data.timers ?? []).some((t) => !t.done)) return { content: "Gerade läuft kein Timer." };
        propose(ctx, { id: nextId(ctx), type: "stop_timer", name });
        return { content: `Wird beendet: ${name ? name[0].toUpperCase() + name.slice(1) : "der Timer"}.` };
      },
    },
    {
      area: "alltag",
      definition: {
        name: "stoppuhr",
        description: "Stoppuhr starten oder anhalten ('Stoppuhr starten').",
        input_schema: { type: "object", properties: { aktion: { type: "string", enum: ["start", "stopp"] } }, required: ["aktion"], additionalProperties: false },
      },
      run: (ctx, raw) => {
        const stop = str((raw as Input | null)?.aktion) === "stopp";
        propose(ctx, { id: nextId(ctx), type: "stopwatch", action: stop ? "stop" : "start" });
        return { content: stop ? "Stoppuhr wird angehalten." : "Stoppuhr läuft (Timer-Kachel)." };
      },
    },
    {
      area: "alltag",
      definition: {
        name: "timer_status",
        description: "Wie lange laufen die Timer noch? ('Wie lange noch?'). Antworte mit Restzeit in Worten ('Die Nudeln brauchen noch 4 Minuten').",
        input_schema: { type: "object", properties: {}, additionalProperties: false },
      },
      run: (ctx) => {
        const timers = ctx.data.timers ?? [];
        if (!timers.length && !ctx.data.stopwatch) return { content: "Gerade läuft kein Timer." };
        return { content: [...timers.map((t) => `${t.name}: ${t.done ? "fertig" : `${Math.ceil(t.leftSec / 60)} Min (${formatLeft(t.leftSec * 1000)})${t.paused ? ", pausiert" : ""}`}`), ...(ctx.data.stopwatch ? [`Stoppuhr: ${formatLeft(ctx.data.stopwatch.sec * 1000)}`] : [])].join("\n") };
      },
    },
  ];
}

function cookTools(): LotteTool[] {
  return [
    {
      area: "alltag",
      definition: {
        name: "kochen_starten",
        description: "Kochen-Modus starten ('Ich fang an zu kochen', 'Ich koche jetzt'): Startseite zeigt das heutige Essen mit Schritten und Timer oben, Bildschirm bleibt an.",
        input_schema: { type: "object", properties: {}, additionalProperties: false },
      },
      run: (ctx) => {
        propose(ctx, { id: nextId(ctx), type: "start_cooking" });
        const k = ctx.data.kochen;
        const cur = k ? k.steps.findIndex((_, i) => !k.done.includes(i)) : -1;
        return { content: k ? `Kochen-Modus an: ${k.dish}.${cur >= 0 ? ` Jetzt: ${k.steps[cur].replace(/[.!]+$/, "")}.` : ""}` : "Kochen-Modus an (heute ist kein Gericht geplant)." };
      },
    },
    {
      area: "alltag",
      definition: {
        name: "kochschritt",
        description: "Rezept-Schritte beim Kochen: aktion 'weiter' = aktuellen Schritt abhaken und den nächsten sagen ('Nächster Schritt'), 'zeigen' = aktuellen Schritt sagen ('Was kommt jetzt?'). Lies den Schritt kurz vor.",
        input_schema: { type: "object", properties: { aktion: { type: "string", enum: ["weiter", "zeigen"] } }, required: ["aktion"], additionalProperties: false },
      },
      run: (ctx, raw) => {
        const k = ctx.data.kochen;
        if (!k || !k.steps.length) return { content: "Für heute gibt es kein Rezept mit Schritten." };
        const done = [...k.done, ...ctx.ops.flatMap((o) => (o.type === "cook_step" ? [o.index] : []))];
        const cur = k.steps.findIndex((_, i) => !done.includes(i));
        if (cur < 0) return { content: "Alle Schritte sind fertig – guten Appetit!" };
        if (str((raw as Input | null)?.aktion) !== "weiter") return { content: `Schritt ${cur + 1} von ${k.steps.length}: ${k.steps[cur]}` };
        propose(ctx, { id: nextId(ctx), type: "cook_step", recipe: k.recipe || k.dish, index: cur });
        const next = k.steps.findIndex((_, i) => !done.includes(i) && i !== cur);
        return { content: next < 0 ? `Schritt ${cur + 1} abgehakt – das war der letzte. Guten Appetit!` : `Schritt ${cur + 1} abgehakt. Jetzt Schritt ${next + 1} von ${k.steps.length}: ${k.steps[next]}` };
      },
    },
  ];
}

const SPORT_IDS = SPORTS.map((s) => s.id);

function sportTools(): LotteTool[] {
  return [
    {
      area: "alltag",
      definition: {
        name: "sport_eintragen",
        description: `Training eintragen (persönlich): 'War heute 5 km laufen' → sportart laufen, km 5; '45 Minuten Fitnessstudio gestern'. Sportarten: ${SPORT_IDS.join(", ")} oder eigener Name. Ohne Dauer schätzen (Laufen ca. 6 Min/km). Danach konkret loben, wenn passend ('Das ist dein 3. Lauf im Oktober'), nie übertreiben.`,
        input_schema: {
          type: "object",
          properties: { sportart: { type: "string" }, minuten: { type: "number" }, km: { type: "number" }, datum: { type: "string", description: "YYYY-MM-DD, Standard heute" } },
          required: ["sportart"],
          additionalProperties: false,
        },
      },
      run: (ctx, raw) => {
        const input = (raw ?? {}) as Input;
        const said = str(input.sportart).toLowerCase();
        const sport = SPORT_IDS.includes(said) ? said : (guessSport(said) ?? (said.slice(0, 30) || "fitness"));
        const km = num(input.km);
        const minutes = num(input.minuten) ?? guessMinutes(sport, km);
        const date = DATE.test(str(input.datum)) && str(input.datum) <= ctx.today ? str(input.datum) : ctx.today;
        const s = sanitizeSport(ctx.data.sport);
        const week = weekStatus(s, ctx.data.entries ?? [], ctx.today, ctx.data.me);
        const month = trainingsBetween(s, ctx.data.entries ?? [], `${date.slice(0, 7)}-01`, ctx.today, ctx.today, ctx.data.me).filter((t) => t.data.sport === sport).length + 1;
        const after = week.count + (date >= week.monday ? 1 : 0);
        propose(ctx, { id: nextId(ctx), type: "add_training", training: { sport, minutes: Math.round(minutes), date, ...(km ? { km } : {}) } });
        return {
          content: `Vorgemerkt: ${sportById(sport).label}, ${Math.round(minutes)} Min${km ? `, ${km} km` : ""} (${date}). Mit Übernehmen: diese Woche ${after} von ${week.goal}${after > week.goal ? " (Bonusrunde)" : after === week.goal ? " – Wochenziel geschafft" : ""}; ${month}. Mal ${sportById(sport).label} im ${monthName(date)}.`,
        };
      },
    },
    {
      area: "alltag",
      definition: {
        name: "sport_ziel_setzen",
        description: "Wochenziel Sport setzen ('Ich will 4× pro Woche Sport machen' → ziel 4). 1–7.",
        input_schema: { type: "object", properties: { ziel: { type: "integer", minimum: 1, maximum: 7 } }, required: ["ziel"], additionalProperties: false },
      },
      run: (ctx, raw) => {
        const goal = num((raw as Input | null)?.ziel);
        if (!goal || goal < 1 || goal > 7) return fail("ziel zwischen 1 und 7.");
        propose(ctx, { id: nextId(ctx), type: "set_sport_goal", goal: Math.round(goal) });
        return { content: `Vorgemerkt: Wochenziel ${Math.round(goal)}× pro Woche.` };
      },
    },
    {
      area: "alltag",
      definition: {
        name: "trainings_planen",
        description:
          "Trainings in freie Kalender-Lücken legen ('Plan mir 3 Trainings nächste Woche, am liebsten morgens'): keine Überschneidung mit Terminen, Abstand zu Arbeit, Wunsch-Tageszeit, Tage verteilt, draußen-Sport bei Regen auf trockene Zeit oder drinnen. Legt Termine mit Etikett 'Sport' und Erinnerung 30 Min vorher als Vorschlag an. Erkläre kurz Ausnahmen aus dem Ergebnis.",
        input_schema: {
          type: "object",
          properties: {
            anzahl: { type: "integer", minimum: 1, maximum: 7 },
            tageszeit: { type: "string", enum: ["morgens", "mittags", "abends", "egal"] },
            woche: { type: "string", enum: ["diese", "naechste"] },
            sportart: { type: "string" },
            minuten: { type: "integer", minimum: 15, maximum: 180 },
          },
          required: ["anzahl"],
          additionalProperties: false,
        },
      },
      run: (ctx, raw) => {
        const input = (raw ?? {}) as Input;
        const count = Math.min(7, Math.max(1, Math.round(num(input.anzahl) ?? 3)));
        const part = (["morgens", "mittags", "abends"].includes(str(input.tageszeit)) ? str(input.tageszeit) : null) as DayPart | null;
        const said = str(input.sportart).toLowerCase();
        const sport = SPORT_IDS.includes(said) ? said : (guessSport(said) ?? "laufen");
        const fc = ctx.forecast;
        const plan = planTrainings({
          entries: ctx.data.entries ?? [],
          today: ctx.today,
          count,
          part,
          week: str(input.woche) === "diese" ? "diese" : "naechste",
          sport,
          minutes: num(input.minuten) ?? 60,
          me: ctx.data.me,
          rainAt: fc ? (date, hour) => {
            const h = fc.hours.find((x) => x.date === date && x.hour === hour);
            return h ? isRainy(h) : null;
          } : undefined,
        });
        for (const slot of plan.slots) {
          const data: TerminData = { title: slot.title, date: slot.date, start: slot.start, end: slot.end, label: "Sport", reminder: "30", ...(ctx.data.me ? { who: [ctx.data.me] } : {}) };
          const entry = sanitizeEntry(createEntry("termin", data) as CalendarEntry);
          if (entry) propose(ctx, { id: nextId(ctx), type: "upsert_entry", entry, isNew: true });
        }
        if (!plan.slots.length) return { content: `Keine freie Lücke gefunden. ${plan.notes.join(" ")}` };
        return { content: `Vorgemerkt (Termine mit Etikett Sport, Erinnerung 30 Min vorher): ${plan.slots.map((s) => `${s.date} ${s.start}–${s.end} ${s.title}`).join("; ")}.${plan.notes.length ? ` Hinweise: ${plan.notes.join("; ")}.` : ""}` };
      },
    },
    {
      area: "alltag",
      definition: {
        name: "sport_statistik",
        description: "Sport-Statistik lesen ('Wie oft war ich diese Woche beim Sport?', 'Wie viele Kilometer im Oktober?'). Antworte konkret, Erfolge zeigen, nie Versäumnisse.",
        input_schema: { type: "object", properties: { zeitraum: { type: "string", enum: ["woche", "monat"] }, monat: { type: "string", description: "YYYY-MM, Standard aktueller Monat" } }, additionalProperties: false },
      },
      run: (ctx, raw) => {
        const input = (raw ?? {}) as Input;
        const s = sanitizeSport(ctx.data.sport);
        const entries = ctx.data.entries ?? [];
        const week = weekStatus(s, entries, ctx.today, ctx.data.me);
        const streak = weekStreak(s, entries, ctx.today, ctx.data.me);
        const month = /^\d{4}-\d{2}$/.test(str(input.monat)) ? str(input.monat) : ctx.today.slice(0, 7);
        const m = monthStats(s, entries, ctx.today, ctx.data.me, month);
        const lines = [`Diese Woche: ${week.count} von ${week.goal}${week.bonus ? " (Bonusrunde)" : ""}.`, `${monthName(`${month}-01`)}: ${m.count} Einheiten, ${hoursLabel(m.minutes)}${m.km ? `, ${m.km} km` : ""}.`];
        if (streak >= 2) lines.push(`${streak} Wochen in Folge geschafft.`);
        const last = trainingsBetween(s, entries, addDays(ctx.today, -14), ctx.today, ctx.today, ctx.data.me).slice(-3);
        if (last.length) lines.push(`Zuletzt: ${last.map((t) => `${t.data.date} ${sportById(t.data.sport).label} ${t.data.minutes} Min${t.data.km ? ` ${t.data.km} km` : ""}`).join("; ")}.`);
        return { content: lines.join("\n") };
      },
    },
  ];
}

function jetztTool(): LotteTool {
  return {
    area: "alltag",
    definition: {
      name: "jetzt_karte",
      description:
        "Jetzt-Karte oben auf der Startseite an- oder ausschalten ('Blende die Jetzt-Karte aus', 'Zeig die Jetzt-Karte wieder'). Die Kacheln selbst bleiben immer so, wie sortiert – auch 'Lass die Startseite immer gleich' meint höchstens: Jetzt-Karte aus.",
      input_schema: { type: "object", properties: { an: { type: "boolean" } }, required: ["an"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const on = (raw as Input | null)?.an !== false;
      propose(ctx, { id: nextId(ctx), type: "set_jetzt", on });
      return { content: on ? "Vorgemerkt: Jetzt-Karte an (Einstellungen → Startseite & Tageszeiten)." : "Vorgemerkt: Jetzt-Karte aus – die Kacheln bleiben, wie sie sind (Einstellungen → Startseite & Tageszeiten)." };
    },
  };
}

export const DAY_TOOLS: LotteTool[] = [...timerTools(), ...cookTools(), ...sportTools(), jetztTool()];
