// Lotte: Tool-Schleife. Läuft nur auf dem Server; das Modell wird übergeben
// (echtes Claude oder Mock), damit beides denselben Weg nimmt. Antworttext
// kommt Stück für Stück über `onText` (Streaming), am Ende die fertige
// Antwort samt Vorschlag.

import { capabilities } from "@/lib/begleitung/wishTools";
import { fetchForecast } from "@/lib/wetter/server";
import { tipsMode, tipsNear } from "@/lib/tipps/server";
import { tipQuestion } from "@/lib/tipps/question";

const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
import { sanitizeNote, type Note } from "@/lib/notizen/model";
import type Anthropic from "@anthropic-ai/sdk";
import { migrateProfile } from "@/lib/einstellungen/profileStore";
import { nextWeekStartFor, weekStartFor } from "@/lib/essen/weekPlan";
import { applyOps, compactOps, type AssistantData, type ChangeOp } from "@/lib/begleitung/ops";
import { contextText, identityPrompt, SYSTEM_PROMPT } from "@/lib/begleitung/prompt";
import { LIMITS, type AssistantReply, type AssistantRequest, type ChatTurn } from "@/lib/begleitung/protocol";
import type { ToolContext } from "@/lib/begleitung/tools";
import { runRegisteredTool, toolDefinitions } from "@/lib/begleitung/toolset";
import { berlinTime } from "@/lib/core/now";
import { sanitizeEntry, type CalendarEntry } from "@/lib/kalender/model";
import { abendsNachUhr } from "@/lib/kalender/mitwandern";
import { feierabendNachUhr } from "@/lib/kalender/aufgaben";
import { sanitizeHome } from "@/lib/core/homeLayout";
import { sanitizeSport } from "@/lib/sport/model";
import { sanitizeMailStyle } from "@/lib/begleitung/mail";
import { kontextThemen } from "@/lib/begleitung/kontextThemen";
import { chooseModel, effortFor, isWeekCheck, type ModelChoice } from "@/lib/begleitung/modellwahl";
import { EINE_RUNDE_WERKZEUGE, kurzBestaetigbar, kurzeBestaetigung } from "@/lib/begleitung/bestaetigung";

/** Eine Modell-Anfrage; `onText` bekommt den Antworttext Stück für Stück */
export type CreateMessage = (params: Anthropic.Beta.MessageCreateParamsNonStreaming, onText?: (delta: string) => void) => Promise<Anthropic.Beta.BetaMessage>;

/** Grenzen pro Anfrage: Antwortlänge (inkl. Nachdenken und Werkzeug-Eingaben wie Rezepte) und Runden */
const ENGINE_LIMITS = { maxTokens: 8000, maxRounds: 6 };

/** Preise je 1 Mio. Tokens in US-Dollar (Eingabe, Ausgabe, Cache schreiben, Cache lesen) – nur fürs Protokoll */
const PRICES: Record<string, { in: number; out: number; write: number; read: number }> = {
  "claude-sonnet-5-5": { in: 2, out: 10, write: 2.5, read: 0.2 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5, write: 0.125, read: 0.01 },
};

/** Modelle mit serverseitigem Ausweichen bei einer Ablehnung (nur Claude API) */
const FALLBACK_MODELS = /^claude-(sonnet-5-5|opus-5-5|opus-5|fable-5-1)$/;

/** Ereignisse während der Antwort (für das Streaming zur App) */
type EngineEvents = { onText?: (delta: string) => void; onRound?: () => void };

export class AssistantInputError extends Error {}

const OP_TYPES = new Set(["add_timer", "stop_timer", "stopwatch", "cook_step", "start_cooking", "set_jetzt", "set_household", "set_dislike", "add_training", "set_sport_goal", "add_pin", "upsert_note", "remove_note", "set_meal", "set_double", "clear_slot", "move_meal", "update_week", "add_recipe", "add_shopping", "set_shop_rule", "add_pantry", "add_wish", "upsert_entry", "remove_entry", "done_entry", "move_entry", "remove_shopping", "clear_shopping", "clear_week", "home", "undo_last", "set_persons", "set_pause", "app_command", "set_feature"]);

/** Läden aus der App: feste Regeln (höchstens 200) und „Meine Läden“ (höchstens 20), nur Texte */
function sanitizeLaeden(raw: unknown): AssistantData["laeden"] {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as { regeln?: unknown; meine?: unknown };
  const regeln = Object.fromEntries(
    Object.entries(r.regeln && typeof r.regeln === "object" ? (r.regeln as Record<string, unknown>) : {})
      .filter((e): e is [string, string] => typeof e[1] === "string" && Boolean(e[0].trim()) && Boolean(e[1].trim()))
      .slice(0, 200)
      .map(([k, v]) => [k.slice(0, 60), v.slice(0, 30)]),
  );
  const meine = (Array.isArray(r.meine) ? r.meine : []).filter((x): x is string => typeof x === "string").slice(0, 20).map((x) => x.slice(0, 30));
  return { regeln, meine };
}

/** Anfrage prüfen und auf das Nötige kürzen */
export function parseRequest(body: unknown): AssistantRequest {
  if (!body || typeof body !== "object") throw new AssistantInputError("Leere Anfrage.");
  const b = body as Partial<AssistantRequest>;
  if (typeof b.deviceId !== "string" || !/^[\w-]{8,64}$/.test(b.deviceId)) throw new AssistantInputError("Geräte-Kennung nicht erkannt.");
  if (typeof b.today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.today)) throw new AssistantInputError("Datum nicht erkannt.");
  const messages = (Array.isArray(b.messages) ? b.messages : [])
    .filter((m): m is ChatTurn => Boolean(m) && (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
    .map((m) => ({ role: m.role, text: m.text.slice(0, LIMITS.messageChars) }))
    .slice(-LIMITS.historyTurns);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user" || !messages[messages.length - 1].text.trim()) {
    throw new AssistantInputError("Keine Frage gestellt.");
  }
  const profile = migrateProfile(b.data?.profile);
  if (!profile) throw new AssistantInputError("Bitte zuerst das Haushaltsprofil anlegen.");
  const obj = <T,>(v: unknown, fallback: T): T => (v && typeof v === "object" ? (v as T) : fallback);
  const data: AssistantData = {
    profile,
    weekPlans: obj(b.data?.weekPlans, {}),
    mealPlans: obj(b.data?.mealPlans, {}),
    recipes: obj(b.data?.recipes, {}),
    shopping: obj(b.data?.shopping, {}),
    pantry: (Array.isArray(b.data?.pantry) ? b.data.pantry : [])
      .filter((p) => Boolean(p) && typeof p === "object" && typeof p.name === "string")
      .slice(0, 80),
    home: sanitizeHome(b.data?.home),
    features: (Array.isArray(b.data?.features) ? b.data.features : []).filter((f): f is string => typeof f === "string").slice(0, 30),
    entries: (Array.isArray(b.data?.entries) ? b.data.entries : []).map(sanitizeEntry).filter((e): e is CalendarEntry => e !== null).slice(0, 400),
    mail: sanitizeMailStyle(b.data?.mail),
    pinnwand: (Array.isArray(b.data?.pinnwand) ? b.data.pinnwand : [])
      .filter((p): p is { author: string; text: string; at: string } => Boolean(p) && typeof p === "object" && typeof p.text === "string" && typeof p.author === "string")
      .slice(0, 10)
      .map((p) => ({ author: p.author.slice(0, 40), text: p.text.slice(0, 140), at: typeof p.at === "string" ? p.at.slice(0, 30) : "" })),
    wetterOrt: typeof b.data?.wetterOrt === "string" ? b.data.wetterOrt.slice(0, 60) : "Eutin",
    notes: (Array.isArray(b.data?.notes) ? b.data.notes : []).map(sanitizeNote).filter((n): n is Note => n !== null).slice(0, 80),
    timers: (Array.isArray(b.data?.timers) ? b.data.timers : [])
      .filter((t) => Boolean(t) && typeof t === "object" && typeof t.name === "string")
      .slice(0, 6)
      .map((t) => ({ name: t.name.slice(0, 30), leftSec: Math.max(0, Math.round(Number(t.leftSec) || 0)), paused: t.paused === true, done: t.done === true })),
    stopwatch: b.data?.stopwatch && typeof b.data.stopwatch === "object" ? { sec: Math.max(0, Math.round(Number(b.data.stopwatch.sec) || 0)), running: b.data.stopwatch.running === true } : null,
    kochen:
      b.data?.kochen && typeof b.data.kochen === "object" && typeof b.data.kochen.dish === "string"
        ? {
            dish: b.data.kochen.dish.slice(0, 80),
            recipe: String(b.data.kochen.recipe ?? "").slice(0, 80),
            steps: (Array.isArray(b.data.kochen.steps) ? b.data.kochen.steps : []).filter((x): x is string => typeof x === "string").slice(0, 30).map((x) => x.slice(0, 300)),
            done: (Array.isArray(b.data.kochen.done) ? b.data.kochen.done : []).filter((x): x is number => Number.isInteger(x)).slice(0, 30),
            active: b.data.kochen.active === true,
          }
        : null,
    sport: sanitizeSport(b.data?.sport),
    tagesablauf: b.data?.tagesablauf && typeof b.data.tagesablauf === "object" ? { jetzt: b.data.tagesablauf.jetzt !== false, feierabendAb: String(b.data.tagesablauf.feierabendAb ?? "20:00").slice(0, 5), morgenBis: String(b.data.tagesablauf.morgenBis ?? "10:00").slice(0, 5) } : undefined,
    me: typeof b.data?.me === "string" ? b.data.me.slice(0, 60) : null,
    laeden: sanitizeLaeden(b.data?.laeden),
  };
  const pending = (Array.isArray(b.pending) ? b.pending : []).filter(
    (op): op is ChangeOp => Boolean(op) && typeof op === "object" && typeof op.id === "string" && OP_TYPES.has(op.type),
  );
  const tipsThisWeek = typeof b.tipsThisWeek === "number" && b.tipsThisWeek >= 0 ? Math.min(10, Math.round(b.tipsThisWeek)) : 0;
  const clock = typeof b.clock === "string" && /^\d{2}:\d{2}$/.test(b.clock) ? b.clock : berlinTime().clock;
  const shoppingNames = (Array.isArray(b.shoppingNames) ? b.shoppingNames : []).filter((n): n is string => typeof n === "string").map((n) => n.slice(0, 60)).slice(0, 80);
  const sofort = typeof b.sofort === "string" && b.sofort.trim() ? b.sofort.trim().slice(0, 300) : undefined;
  return { deviceId: b.deviceId, today: b.today, messages, pending, data, tipsThisWeek, clock, shoppingNames, stream: b.stream === true, ...(sofort ? { sofort } : {}) };
}

/** Nach einer Ausweich-Antwort (fallback) nur den Teil ab dem letzten Wechsel weitergeben */
function cleanContent(content: Anthropic.Beta.BetaContentBlock[]): Anthropic.Beta.BetaContentBlock[] {
  const last = content.map((b) => b.type).lastIndexOf("fallback");
  if (last < 0) return content;
  return content.filter(
    (b, i) => i > last || !(b.type === "thinking" || b.type === "redacted_thinking" || b.type === "tool_use"),
  );
}

function pendingSummary(ops: ChangeOp[]): string {
  if (ops.length === 0) return "";
  const lines = ops.map((op) => {
    switch (op.type) {
      case "set_meal":
        return `${op.slot.weekday}: ${op.dish.title}${op.double ? " (doppelt)" : ""}`;
      case "set_double":
        return `${op.slot.weekday}: ${op.double ? "doppelt kochen" : "nicht doppelt"}`;
      case "clear_slot":
        return `${op.slot.weekday}: leeren`;
      case "move_meal":
        return `${op.from.weekday} → ${op.to.weekday}`;
      case "update_week":
        return `Vorgaben: ${JSON.stringify(op.changes)}`;
      case "add_recipe":
        return `Neues Rezept: ${op.recipe.title}`;
      case "add_shopping":
        return `Einkaufsliste: ${op.name}`;
      case "set_shop_rule":
        return `Laden merken: ${op.name} → ${op.shop || "egal wo"}`;
      case "add_pantry":
        return `Vorrat: ${op.name}`;
      case "add_wish":
        return `Wunsch: ${op.who} – ${op.dish}`;
      case "remove_shopping":
        return `Von der Einkaufsliste: ${op.names.join(", ")}`;
      case "clear_shopping":
        return "Einkaufsliste leeren";
      case "clear_week":
        return `Wochenplan ab ${op.weekStart} leeren`;
      case "home":
        return `Startseite: ${op.change.tile} ${op.change.action}`;
      case "undo_last":
        return "Letzte Änderung zurücknehmen";
      case "set_persons":
        return `${op.slot.weekday}: für ${op.persons ?? "alle"} Personen`;
      case "set_pause":
        return op.pause ? `Pause ${op.pause.from} bis ${op.pause.until ?? "offen"}` : "Pause beenden";
      case "app_command":
        return `In der App: ${op.text}`;
      case "set_feature":
        return `Baustein ${op.feature} ${op.on ? "an" : "aus"}`;
      case "upsert_entry":
        return `${op.isNew ? "Neu" : "Ändern"} (${op.entry.typ}): ${op.entry.data.title}`;
      case "remove_entry":
        return `Löschen: ${op.title}${op.onlyDate ? ` (nur ${op.onlyDate})` : ""}`;
      case "done_entry":
        return `Erledigt: ${op.title}`;
      case "move_entry":
        return `Verschieben: ${op.title} → ${op.to}${op.time ? ` ${op.time}` : ""}`;
      case "upsert_note":
        return `Notiz ${op.isNew ? "neu" : "ändern"}: ${op.note.data.title}${op.change ? ` (${op.change})` : ""}`;
      case "remove_note":
        return `Notiz löschen: ${op.title}`;
      case "add_pin":
        return `Pinnwand: ${op.text}`;
    }
  });
  return `\n\nNoch nicht übernommener Vorschlag (in den Daten schon enthalten; auf Wunsch anpassen):\n${lines.join("\n")}`;
}

/** Sofort-Weg: die App hat schon gehandelt – die KI prüft nur (Antwort „OK“) oder korrigiert mit Werkzeugen */
export const SOFORT_OK = "OK";
function sofortHinweis(sofort: string | undefined): string {
  if (!sofort) return "";
  return `\n\nDie App hat die letzte Nachricht schon selbst erledigt (ohne dich): ${sofort}. Prüf nur, ob das passt. Passt es, antworte genau „${SOFORT_OK}“, ohne Werkzeug. Verstehst du etwas anderes, mach es mit Werkzeugen richtig (die App nimmt ihres dann zurück) und sag in höchstens einem Satz, was du gemacht hast.`;
}

type Usage = { in: number; out: number; write: number; read: number; rounds: number };

/** Kosten in Millionstel US-Dollar (fürs Guthaben später; null = Preis unbekannt) */
function costMicro(model: string, u: Usage): number | null {
  const price = PRICES[model];
  return price ? Math.round(u.in * price.in + u.out * price.out + u.write * price.write + u.read * price.read) : null;
}

/** Nur Zahlen ins Server-Log (nie Inhalte): Tokens und grobe Kosten der ganzen Anfrage */
function logUsage(model: string, u: Usage, upgraded: boolean) {
  if (model === "mock") return;
  const micro = costMicro(model, u);
  console.info("Lotte Tokens", { modell: model, hochgeschaltet: upgraded, runden: u.rounds, ein: u.in, aus: u.out, cache_gelesen: u.read, cache_geschrieben: u.write, kosten_usd: micro === null ? "?" : (micro / 1_000_000).toFixed(5) });
}

/** Klingt nach Wetter? ("Wie wird das Wetter morgen?", "Brauch ich einen Schirm?") */
const WEATHER_QUESTION = /\b(wetter|schirm|regn\w*|regen|sonnig|sonne|warm|kalt|grad|temperatur|frost|glatt|schnee|wind\w*|sturm|stürm\w*|böen|gewitter)\b/i;

/** Trainings planen: Wetter für draußen-Sport mitdenken */
const TRAINING_PLAN = /\bplan\w*\b.*\b(trainings?|sport\w*|läufe|laufen|einheiten)\b/i;

export async function runAssistant(req: AssistantRequest, create: CreateMessage, choice: ModelChoice, events: EngineEvents = {}): Promise<AssistantReply> {
  const today = new Date(`${req.today}T12:00:00`);
  const shoppingDay = req.data.profile.shoppingDay || "Montag";
  const weeks = { aktuell: weekStartFor(today, shoppingDay), naechste: nextWeekStartFor(today, shoppingDay) };

  // Wetterfragen: Vorhersage vorab holen (Werkzeuge laufen synchron; 30 Min zwischengespeichert)
  const lastText = req.messages[req.messages.length - 1]?.text ?? "";
  const wantsWeather = WEATHER_QUESTION.test(lastText) || TRAINING_PLAN.test(lastText);
  // Prüfstand: feste Test-Vorhersage (kein Abruf für ein vergangenes Datum)
  const forecast = !wantsWeather ? undefined : req.forecast !== undefined ? req.forecast : await fetchForecast(req.data.wetterOrt || "Eutin", undefined, req.today).catch(() => null);
  // Fragen nach Tipps aus der Region: Tipps im Umkreis vorab holen (nur mit laufender Quelle)
  const regionTips = tipsMode() !== "off" && tipQuestion(lastText, req.today) ? await tipsNear({ ort: req.data.tippOrt || req.data.wetterOrt || "Eutin", km: req.data.tippKm ?? 20, von: req.today, bis: plusDays(req.today, 20), today: req.today }).then((r) => (r.ort ? r.tips : null)).catch(() => null) : undefined;

  // Abends (Startseite auf morgen): offene Aufgaben wandern mit – nach Uhr, „Feierabend ab“ und Terminen
  const minutesNow = req.clock ? Number(req.clock.slice(0, 2)) * 60 + Number(req.clock.slice(3, 5)) : null;
  const abends = minutesNow !== null ? abendsNachUhr({ entries: req.data.entries ?? [], heute: req.today, minutes: minutesNow, feierabendAb: req.data.tagesablauf?.feierabendAb }) : false;
  // Feierabend: Arbeitsaufgaben ruhen, Mia nennt sie nur auf Nachfrage (Tafel 103)
  const feierabend = minutesNow !== null ? feierabendNachUhr(minutesNow, req.data.tagesablauf?.feierabendAb) : false;
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    // Name/Ton und Arbeitsweise ändern sich selten → gecacht; Kontext pro Anfrage
    // 1 Stunde statt 5 Minuten: auch wer nur ab und zu fragt, trifft den Zwischenspeicher (schneller, günstiger)
    { type: "text", text: `${identityPrompt(req.data.profile)}\n\n${SYSTEM_PROMPT}\n\n${capabilities(toolDefinitions())}`, cache_control: { type: "ephemeral", ttl: "1h" } },
    { type: "text", text: contextText(req.data, req.today, weeks, req.tipsThisWeek, { clock: req.clock, shopping: req.shoppingNames, abends, feierabend, themen: kontextThemen(req) }) + pendingSummary(req.pending) + sofortHinweis(req.sofort) },
  ];

  /** Ein Durchlauf mit einem Modell; `small` = darf bei einem echten Fehler (Ablehnung, abgeschnitten) hochschalten */
  const attempt = async (model: string, small: boolean) => {
    // Arbeitskopie mit dem bisherigen Vorschlag (bei jedem Durchlauf frisch)
    const start = applyOps(req.data, req.pending);
    const numbers = req.pending.flatMap((op) => [op.id, op.type === "add_recipe" ? op.recipe.ref : ""].map((s) => Number(s.match(/(\d+)$/)?.[1] ?? 0)));
    const ctx: ToolContext = { data: start.data, weeks, ops: [...req.pending], refs: start.refs, counter: Math.max(0, ...numbers), today: req.today, abends, feierabend, ...(forecast !== undefined ? { forecast } : {}), ...(regionTips !== undefined ? { regionTips } : {}) };
    const messages: Anthropic.Beta.BetaMessageParam[] = req.messages.map((m) => ({ role: m.role, content: m.text }));
    if (messages[0].role !== "user") messages.shift();
    const usage: Usage = { in: 0, out: 0, write: 0, read: 0, rounds: 0 };
    let reply = "";
    for (let round = 0; round < ENGINE_LIMITS.maxRounds; round++) {
      if (round > 0) events.onRound?.();
      const params: Anthropic.Beta.MessageCreateParamsNonStreaming = {
        model,
        // Wochencheck: viele Punkte in einem Rutsch – mehr Platz (zählt trotzdem als eine Nachricht)
        max_tokens: isWeekCheck(req) ? 16_000 : ENGINE_LIMITS.maxTokens,
        system,
        tools: toolDefinitions(),
        messages,
        // Haiku und Aktionen: wenig Aufwand (schnell); Fragen/Ratschläge beim großen Modell etwas gründlicher
        output_config: { effort: effortFor(model, lastText) },
        // Lehnt das Modell ab, springt serverseitig ein Ersatzmodell ein (nur Claude API)
        ...(FALLBACK_MODELS.test(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      };
      const response = await create(params, events.onText);
      const u = response.usage;
      if (u) {
        usage.in += u.input_tokens;
        usage.out += u.output_tokens;
        usage.write += u.cache_creation_input_tokens ?? 0;
        usage.read += u.cache_read_input_tokens ?? 0;
      }
      usage.rounds++;

      if (response.stop_reason === "refusal") {
        if (small) return { escalate: true as const, usage };
        reply = "Dabei kann ich leider nicht helfen. Frag mich gern etwas anderes.";
        break;
      }
      // Echter Fehler beim kleinen Modell: abgeschnitten → das große übernimmt
      if (small && response.stop_reason === "max_tokens") return { escalate: true as const, usage };
      const content = cleanContent(response.content);
      const text = content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
      if (text) reply = text;
      messages.push({ role: "assistant", content });

      if (response.stop_reason === "pause_turn") continue;
      // Abgeschnitten (auch mitten in einer Werkzeug-Eingabe): nichts davon ausführen
      if (response.stop_reason !== "tool_use") {
        if (response.stop_reason === "max_tokens") reply = `${reply} …`.trim();
        break;
      }
      const before = ctx.ops.length;
      let sauber = req.pending.length === 0;
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = content.flatMap((block) => {
        if (block.type !== "tool_use") return [];
        const opsVorher = ctx.ops.length;
        const result = runRegisteredTool(ctx, block.name, block.input);
        // Eine Runde nur, wenn jedes Werkzeug klein ist und sauber genau etwas vorgemerkt hat
        if (!EINE_RUNDE_WERKZEUGE.has(block.name) || result.isError || ctx.ops.length === opsVorher) sauber = false;
        return [{ type: "tool_result" as const, tool_use_id: block.id, content: result.content, is_error: result.isError }];
      });
      const neu = ctx.ops.slice(before);
      // Eine Runde (kleine, sichere Werkzeuge): Bestätigung aus dem Ergebnis, keine zweite Modell-Runde nur für den Text
      if (sauber && kurzBestaetigbar(neu)) {
        reply = text || kurzeBestaetigung(neu, req.today);
        break;
      }
      messages.push({ role: "user", content: results });
      if (round === ENGINE_LIMITS.maxRounds - 1) reply ||= "Das war mehr, als ich auf einmal schaffe. Hier ist, was ich bisher hab.";
    }
    return { escalate: false as const, usage, reply, ctx };
  };

  // Modell wählen: einmal, vor dem Aufruf (Regeln + große Themen + Gesprächskontext)
  const fixed = typeof choice === "string";
  // Prüfung nach dem Sofort-Weg: immer das kleine Modell (kurz, eindeutig)
  const firstModel = req.sofort && !fixed ? choice.small : chooseModel(req, choice);
  const canUpgrade = !fixed && firstModel === choice.small && choice.small !== choice.large;
  let run: Awaited<ReturnType<typeof attempt>>;
  let model = firstModel;
  let spent: { model: string; usage: Usage }[] = [];
  try {
    run = await attempt(firstModel, canUpgrade);
    spent = [{ model, usage: run.usage }];
  } catch (e) {
    // Echter Fehler beim kleinen Modell (nicht das Tageslimit): einmal das große
    if (!canUpgrade || (e as { status?: number }).status === 429) throw e;
    run = { escalate: true as const, usage: { in: 0, out: 0, write: 0, read: 0, rounds: 0 } };
  }
  if (run.escalate && !fixed) {
    // Bisher Gezeigtes war nur ein Anlauf – die App ersetzt es durch die neue Antwort
    events.onRound?.();
    model = choice.large;
    run = await attempt(model, false);
    spent = [...spent, { model, usage: run.usage }];
  }
  for (const s of spent) logUsage(s.model, s.usage, model !== firstModel);
  if (run.escalate) throw new Error("Hochschalten ohne großes Modell");
  const { ctx, reply } = run;
  const costs = spent.map((s) => costMicro(s.model, s.usage));
  const micro = costs.every((c): c is number => c !== null) ? costs.reduce((a, b) => a + b, 0) : null;
  const extras = { ...(ctx.wishes?.length ? { wishes: ctx.wishes } : {}), ...(ctx.mail ? { mail: ctx.mail } : {}), ...(ctx.chips?.length ? { chips: ctx.chips } : {}), ...(ctx.tipCards?.length ? { tips: ctx.tipCards } : {}) };
  return {
    reply: reply || (ctx.mail ? "Hier mein Vorschlag:" : "Steht unten als Vorschlag."),
    ops: compactOps(ctx.ops),
    ...extras,
    ...(model !== "mock" ? { usage: { size: /haiku/.test(model) ? ("klein" as const) : ("gross" as const), upgraded: model !== firstModel, micro } } : {}),
  };
}
