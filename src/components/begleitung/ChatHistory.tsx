"use client";

// Verlauf des Chats: Begrüßung, Einwilligung, Nachrichten (Ideen-Antworten
// offen bzw. eingeklappt), Gesundheits-Tipp, "denkt …"/Antwort Wort für
// Wort und der offene Vorschlag mit "Übernehmen".

import { miaSatz } from "@/lib/mia/persona";
import { now } from "@/lib/core/now";
import Link from "next/link";
import { useRef, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from "react";
import { NOTE } from "@/components/ui/styles";
import { stockNearlyEmpty } from "@/lib/essen/dishIdeas";
import type { useAssistantStatus } from "@/lib/begleitung/client";
import { helperName, type HelperVoice } from "@/lib/einstellungen/profile";
import type { AssistantData } from "@/lib/begleitung/ops";
import { speechSupported, toggleSpeak } from "@/lib/begleitung/speech";
import { ConsentCard, SpeakButton } from "@/components/begleitung/ChatBits";
import { ChatTurnItem } from "@/components/begleitung/ChatTurnItem";
import { MiaBubble, OwnBubble, StageTopic } from "@/components/begleitung/MiaStage";
import { useStickToBottom } from "@/components/begleitung/useStickToBottom";
import { firstOfRun } from "@/lib/begleitung/stage";
import { IdeaCarousel, IdeaRow, IdeaSuggestions, StaysLine } from "@/components/essen/kochtipp/KochideeViews";
import type { Kochidee } from "@/components/essen/kochtipp/useKochidee";
import type { ChatState, ChatTurnView } from "@/components/begleitung/chatTypes";
import { ProposalCard } from "@/components/begleitung/ProposalCard";
import { ImHausKarte } from "@/components/vorrat/ImHausKarte";
import { isImHausVorschlag } from "@/lib/vorrat/reinsprechen";
import { EinsprechenKarte, EinsprechenLive } from "@/components/einkauf/EinsprechenKarte";
import { isEinkaufVorschlag } from "@/lib/einkauf/einsprechen";
import { AdjustSheet, EarlierIdeas, SpontanAnswer } from "@/components/begleitung/SpontanBoard";
import { TipBubble } from "@/components/begleitung/TipBubble";
import { kiOkKarteZeigen, stimmeVomServer } from "@/lib/begleitung/kiOk";
import type { useMarketChat } from "@/components/begleitung/useMarketChat";
import type { SpontanChat } from "@/components/begleitung/useSpontanChat";

/** Fragt die KI nach der Basis? Dann Basis-Chips anbieten */
function asksForBase(turn: ChatTurnView | undefined): boolean {
  return Boolean(turn && turn.role === "assistant" && !turn.local && !turn.error && /basis/i.test(turn.text) && turn.text.includes("?"));
}

type Props = {
  scrollRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  status: ReturnType<typeof useAssistantStatus>;
  data: AssistantData | null | undefined;
  name: string;
  voice: HelperVoice;
  /** KI-OK-Karte mit „Nicht jetzt“ weggeklickt (nur die Karte, nicht der Zugangscode) */
  consentLater: boolean;
  onConsentLater: () => void;
  chat: ChatState;
  setChat: Dispatch<SetStateAction<ChatState>>;
  busy: boolean;
  streaming: string | null;
  speakingId: string | null;
  tipsOn: boolean | undefined;
  adjusting: boolean;
  setAdjusting: (on: boolean) => void;
  spontan: SpontanChat;
  kochidee: Kochidee;
  market: ReturnType<typeof useMarketChat>;
  rules: (t: string) => boolean;
  onSubmit: (text: string) => void;
  onAsk: (text: string) => void;
  onApply: (selected: Set<string>) => void;
  onClose: () => void;
  /** Mia hört nochmal zu („Ändern“ in „Hab ich so verstanden:“) */
  onListen?: () => void;
  /** Bühne: nur ab dieser Nachricht zeigen (sonst alles = „Verlauf“) */
  from?: number;
  /** Begrüßung als erste Blase („Was steht an?“, morgens „Moin! Was steht an?“) */
  showGreeting?: boolean;
  /** Bereichs-Kopf über Mias erster Blase („KOCHIDEE“, „TERMIN“ …) */
  topic?: string;
  /** Gerade Gesagtes – erscheint live als eigene Blase */
  heard?: string;
  /** Mia antwortet gerade: das live Gesagte geht danach raus (Blase „wartet“) */
  heardWaits?: boolean;
  /** Gemerkt, während Mia antwortete – geht gleich raus */
  waiting?: string;
  /** Am Ende des Gesprächs (Beispiele, schönere Stimme) */
  children?: ReactNode;
};

/** Mia stellt sich nie vor: „Was steht an?“, morgens (5–11 Uhr) „Moin! Was steht an?“ */
export const greetingText = (hour: number, minute = 0) => (hour >= 22 || hour < 6 ? miaSatz("nachtWach", null, () => (minute % 4) / 4) : hour >= 5 && hour < 11 ? "Moin! Was steht an?" : "Was steht an?");

export function ChatHistory({ scrollRef, inputRef, status, data, voice, consentLater, onConsentLater, chat, setChat, busy, streaming, speakingId, tipsOn, adjusting, setAdjusting, spontan, kochidee, market, rules, onSubmit, onAsk, onApply, onClose, onListen, from = 0, showGreeting = true, topic, heard, heardWaits = false, waiting = "", children }: Props) {
  const { ideasFor, stockFor, headingFor, speechFor, takeIdea, moreIdeas, adjusting2, setAdjusting2, applyFilters, acceptUnsure } = spontan;
  /** Einen Punkt des offenen Vorschlags an- oder abwählen */
  const toggleOp = (id: string) =>
    setChat((c) => {
      if (!c.proposal) return c;
      const selected = new Set(c.proposal.selected);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      return { ...c, proposal: { ...c.proposal, selected } };
    });
  // Offene Ideen-Antwort (die letzte, solange Spontan kochen läuft) und eingeklappte frühere
  const spontanIndexes = chat.turns.flatMap((t, i) => (t.spontan ? [i] : []));
  const liveSpontan = chat.spontan !== null && spontanIndexes.length ? spontanIndexes[spontanIndexes.length - 1] : -1;
  // Nur der neueste Mail-Entwurf lässt sich ändern
  const lastMailIndex = chat.turns.map((t) => Boolean(t.mail)).lastIndexOf(true);
  const earlier = spontanIndexes.filter((i) => i !== liveSpontan);
  const firstEarlier = earlier[0] ?? -1;
  const earlierTitles = [...new Set(earlier.flatMap((i) => ideasFor(chat.turns[i]).map((idea) => idea.title)))];
  const roles = chat.turns.map((t) => t.role);
  // Kochidee-Ergebnis: „Dann mach doch …!“ samt Karussell oben ins Bild holen
  // (nach dem allgemeinen Scrollen ans Ende, sonst läge das Karussell oben außer Sicht)
  const shownResult = useRef(-1);
  const showResult = (index: number) => (el: HTMLDivElement | null) => {
    if (!el || shownResult.current === index) return;
    shownResult.current = index;
    window.setTimeout(() => el.scrollIntoView({ block: "start", behavior: "smooth" }), 400);
  };
  const greeting = showGreeting && data;
  const stick = useStickToBottom(scrollRef);

  return (
      <div className="relative flex min-h-0 flex-1 flex-col" data-daneben>
        <div ref={scrollRef} className="mia-gespraech flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3" aria-live="polite" data-gespraech data-daneben>
          <StageTopic topic={topic} />
          {status === undefined || data === undefined ? (
            <div className="h-20 animate-pulse rounded-card bg-surface" />
          ) : data === null ? (
            <p className={NOTE} role="note">
              <span>
                Leg zuerst euer{" "}
                <Link href="/profil" onClick={onClose} className="font-bold text-accent-strong underline">
                  Haushaltsprofil
                </Link>{" "}
                an, dann weiß ich, für wen ich plane.
              </span>
            </p>
          ) : greeting ? (
            <MiaBubble lead>{chat.einkauf ? "Zähl einfach auf." : greetingText(now().getHours(), now().getMinutes())}</MiaBubble>
          ) : null}
          {/* Kochidee geht ohne KI – der Zugangscode schiebt sich nicht davor */}
          {data && status && kiOkKarteZeigen({ askConsent: status.askConsent, weggeklickt: consentLater, kochtipp: Boolean(chat.kochtipp) }) && (
            <ConsentCard name={helperName(data.profile)} stimme={stimmeVomServer(status)} onLater={onConsentLater} />
          )}
          {chat.turns.map((turn, i) => {
            if (i < from) return null;
            const last = i === chat.turns.length - 1;
            const showBases = last && !busy && !chat.spontan && asksForBase(turn);
            // Ideen-Antworten: nur die letzte (im Spontan-Modus) ist offen, ältere eingeklappt
            if (turn.spontan) {
              if (i === liveSpontan && data) {
                const ideas = ideasFor(turn);
                const stock = stockFor(turn);
                return (
                  <div key={i} className="flex w-full flex-col items-start gap-2">
                    <SpontanAnswer
                      heading={headingFor(turn, ideas)}
                      ideas={ideas}
                      stock={stock}
                      nearlyEmpty={stockNearlyEmpty(stock)}
                      speaker={speechSupported() ? <SpeakButton speaking={speakingId === `turn-${i}`} onClick={() => toggleSpeak(speechFor(turn), `turn-${i}`, voice)} /> : null}
                      onToday={takeIdea}
                      onAdjust={() => setAdjusting2(turn)}
                      onMore={() => moreIdeas(turn)}
                      onNavigate={onClose}
                    />
                  </div>
                );
              }
              if (i !== firstEarlier) return null;
              return <EarlierIdeas key={i} titles={earlierTitles} />;
            }
            if (turn.idea) {
              const idea = turn.idea;
              // Nur die neueste Kochidee ist lebendig (Knöpfe, Vorschläge)
              const live = chat.kochtipp != null && i === chat.turns.map((t) => Boolean(t.idea)).lastIndexOf(true);
              const session = chat.kochtipp;
              return (
                <div key={i} ref={idea.kind === "ergebnis" && live ? showResult(i) : undefined} className="flex w-full scroll-mt-2 flex-col gap-2.5">
                  <ChatTurnItem turn={{ role: "assistant", text: turn.text }} lead={i === from ? !greeting : firstOfRun(roles, i)} last={false} data={data} showBases={false} mailActive={false} speaking={speakingId === `turn-${i}`} onSpeak={() => toggleSpeak(turn.text, `turn-${i}`, voice)} onSubmit={onSubmit} onAsk={onAsk} onAcceptUnsure={() => undefined} onMarketAdd={market.addMarketItems} onMarketPlan={market.planMarketIdea} onClose={onClose} />
                  {idea.kind === "start" ? (
                    <>
                      {idea.planned && <StaysLine dish={idea.planned} />}
                      {idea.cards.map((c) => (
                        <IdeaRow key={c.title} card={c} live={live} onTake={() => kochidee.take(c, session)} />
                      ))}
                      {live && <IdeaSuggestions suggestions={idea.suggest ?? []} onPick={onSubmit} />}
                    </>
                  ) : (
                    <>
                      {idea.keywords && idea.keywords.length > 0 && <p className="ml-11 self-start rounded-full bg-fill px-3 py-1 text-[13px] font-semibold text-muted">{idea.keywords.join(" · ")}</p>}
                      {idea.cards.length > 0 && <IdeaCarousel cards={idea.cards} persons={idea.persons ?? 2} live={live} onTake={(c) => kochidee.take(c, session, idea.persons)} onMore={() => session && kochidee.more(session)} onNavigate={onClose} />}
                      {idea.remembered && <p className="text-[13px] font-semibold text-good-ink">{idea.remembered}</p>}
                      {live && <IdeaSuggestions suggestions={idea.suggest ?? []} onPick={onSubmit} />}
                    </>
                  )}
                </div>
              );
            }
            return (
              <ChatTurnItem
                key={i}
                turn={turn}
                lead={i === from ? turn.role === "assistant" && !greeting : firstOfRun(roles, i)}
                last={last}
                data={data}
                showBases={showBases}
                mailActive={last || i === lastMailIndex}
                speaking={speakingId === `turn-${i}`}
                onSpeak={() => toggleSpeak(turn.text, `turn-${i}`, voice)}
                onSubmit={onSubmit}
                onAsk={onAsk}
                onAcceptUnsure={(u) => acceptUnsure(i, u)}
                onMarketAdd={market.addMarketItems}
                onMarketPlan={market.planMarketIdea}
                onClose={onClose}
              />
            );
          })}

          {adjusting2 && data && (
            <AdjustSheet filters={adjusting2.ideaFilters ?? []} bases={data.profile.bases} onApply={(f) => applyFilters(adjusting2, f)} onClose={() => setAdjusting2(null)} />
          )}

          {/* Sanfter Gesundheits-Tipp (laut Einstellung, nie als Pop-up) */}
          {data && tipsOn && !chat.spontan && !busy && <TipBubble recipes={data.recipes} />}

          {heard && (
            <OwnBubble live wartet={heardWaits}>
              {chat.einkauf ? <EinsprechenLive text={heard} /> : heard}
            </OwnBubble>
          )}
          {waiting && <OwnBubble wartet>{waiting}</OwnBubble>}

          {/* Antwort erscheint Wort für Wort; das Überlegen zeigt die große Mia unten */}
          {busy && streaming && <MiaBubble lead={roles[roles.length - 1] !== "assistant"}>{streaming}</MiaBubble>}

          {chat.proposal && data && !busy && chat.imHaus && isImHausVorschlag(chat.proposal.ops) && (
            <ImHausKarte
              ops={chat.proposal.ops}
              selected={chat.proposal.selected}
              onToggle={toggleOp}
              onApply={() => chat.proposal && onApply(chat.proposal.selected)}
              onAdjust={() => onListen?.()}
            />
          )}
          {chat.proposal && data && !busy && chat.einkauf && isEinkaufVorschlag(chat.proposal.ops) && (
            <EinsprechenKarte ops={chat.proposal.ops} selected={chat.proposal.selected} onToggle={toggleOp} onApply={() => chat.proposal && onApply(chat.proposal.selected)} onMore={() => onListen?.()} />
          )}
          {chat.proposal && data && !busy && !(chat.imHaus && isImHausVorschlag(chat.proposal.ops)) && !(chat.einkauf && isEinkaufVorschlag(chat.proposal.ops)) && (
            <ProposalCard
              data={data}
              proposal={chat.proposal}
              adjusting={adjusting}
              onToggle={toggleOp}
              onApply={() => {
                if (!chat.proposal) return;
                // App-Bedienung, die die KI vorgeschlagen hat: nach "Übernehmen" mit den eigenen Regeln ausführen
                const commands = chat.proposal.ops.flatMap((op) => (op.type === "app_command" && chat.proposal!.selected.has(op.id) ? [op.text] : []));
                onApply(chat.proposal.selected);
                for (const text of commands) {
                  if (!rules(text)) setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: `„${text}“ kann ich so nicht umsetzen. Sag’s mir anders?`, local: true }] }));
                }
              }}
              onAdjust={() => {
                setAdjusting(true);
                inputRef.current?.focus();
              }}
              onDiscard={() => {
                setAdjusting(false);
                setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: "Okay, verworfen.", local: true }], proposal: null }));
              }}
            />
          )}
          {children}
        </div>
        {stick.neu && (
          <button type="button" onClick={stick.runter} className="hit absolute bottom-2 left-1/2 flex min-h-9 -translate-x-1/2 items-center gap-1 rounded-full bg-surface px-3.5 text-[14px] font-bold text-accent-strong shadow-float" data-neu>
            ↓ Neu
          </button>
        )}
      </div>
  );
}
