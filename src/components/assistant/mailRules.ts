// Mails ohne KI (ohne Postfach – nie automatisch senden): eingefügte Mail
// zusammenfassen und beantworten, neue Mail, Änderung am letzten Entwurf.

import { changeEntries } from "@/lib/aufgaben";
import { pushUndo } from "@/lib/core/undo";
import { toIsoDate } from "@/lib/essen/weekPlan";
import { eventsIn, greetingCommand, localNewMail, localReply as mailReply, looksLikeMail, REPLY_CHOICES, reviseDraft, revisionOf, splitInstruction, summaryOf, withTone, type MailDraft, type MailRevision } from "@/lib/lotte/mail";
import { loadMailStyle, saveMailStyle } from "@/lib/lotte/mailSettings";
import { draftSummary, upsertEntry, type CalendarEntry } from "@/lib/aufgaben";
import { createEntry } from "@/lib/core/entries";

import type { ChatTurnView } from "./chatTypes";
import type { RuleContext } from "./localRules";

/** "Auf Du"/"Auf Sie" für diesen Empfänger merken */
export function rememberTone(draft: MailDraft, rev: MailRevision | null) {
  const key = draft.to || draft.recipient || "";
  if (key && (rev === "du" || rev === "sie")) saveMailStyle(withTone(loadMailStyle(), key, rev));
}

const nameOf = (data: RuleContext["data"]) => data?.profile.persons[0]?.name?.trim() ?? "";

const mailTurn = (draft: MailDraft, text: string, extra: Partial<ChatTurnView> = {}): ChatTurnView => ({ role: "assistant", local: true, text, mail: draft, ...extra });

/** Termin/Frist aus der Mail als Knopf "📅 … eintragen" (mit Rückgängig) */
function eventChoices(ctx: RuleContext, mail: string): { label: string; onClick: () => void }[] {
  const { today, setChat } = ctx;
  if (!today) return [];
  return eventsIn(mail, toIsoDate(today)).map((draft) => ({
    label: `📅 ${draft.data.title} eintragen`,
    onClick: () => {
      const entry = createEntry(draft.typ, draft.data, { raum: draft.raum }) as CalendarEntry;
      const undo = changeEntries((list) => upsertEntry(list, entry));
      const text = `Eingetragen ✓ ${draftSummary(draft)}`;
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text, local: true, undo: pushUndo(text, undo) }] }));
    },
  }));
}

/** Ohne KI: eingefügte Mail, neue Mail ("Mail an die Kita: …") oder Änderung am letzten Entwurf */
export function mailRule(ctx: RuleContext, turns: ChatTurnView[], t: string): boolean {
  const { data, setChat, setInput } = ctx;
  const myName = () => nameOf(data);
  const style = loadMailStyle();
  const greeting = greetingCommand(t);
  if (greeting) {
    setInput("");
    saveMailStyle({ ...style, greeting });
    const text = `Gemerkt ✓ Deine Mails enden jetzt mit „${greeting}“. Ändern kannst du das auch unter Einstellungen → Mails.`;
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text, local: true, undo: pushUndo(text, () => saveMailStyle(style)) }] }));
    return true;
  }
  const { instruction, mail } = splitInstruction(t);
  if (looksLikeMail(mail)) {
    setInput("");
    const events = eventChoices(ctx, mail);
    const eventLine = events.length ? " Da steht auch ein Termin drin – soll ich ihn eintragen?" : "";
    const summary = `Kurz gesagt: ${summaryOf(mail)}`;
    if (instruction) {
      const draft = mailReply(mail, { instruction }, style, myName());
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, mailTurn(draft, `${summary}${eventLine}`, events.length ? { choices: events } : {})] }));
      return true;
    }
    const answerWith = (choice: (typeof REPLY_CHOICES)[number]) => () => {
      const draft = mailReply(mail, { choice: choice.id }, loadMailStyle(), myName());
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: choice.label, local: true }, mailTurn(draft, "Hier mein Vorschlag:")] }));
    };
    setChat((c) => ({
      ...c,
      turns: [
        ...c.turns,
        { role: "user", text: t, local: true },
        { role: "assistant", local: true, text: `${summary} Wie willst du antworten?${eventLine}`, choices: [...REPLY_CHOICES.map((r) => ({ label: r.label, onClick: answerWith(r) })), ...events] },
      ],
    }));
    return true;
  }
  const rev = revisionOf(t);
  const previous = [...turns].reverse().find((x) => x.mail)?.mail;
  if (rev && previous) {
    setInput("");
    const draft = reviseDraft(previous, rev);
    rememberTone(draft, rev);
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, mailTurn(draft, "So vielleicht?")] }));
    return true;
  }
  const fresh = localNewMail(t, style, myName(), data?.profile.persons.map((p) => p.name) ?? []);
  if (fresh) {
    setInput("");
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, mailTurn(fresh, "Hier mein Vorschlag – senden machst du selbst.")] }));
    return true;
  }
  return false;
}
