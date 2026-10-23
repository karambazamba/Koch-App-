"use client";

// Verlauf des Chats: Begrüßung, Zugangscode, Nachrichten (Ideen-Antworten
// offen bzw. eingeklappt), Gesundheits-Tipp, "denkt …"/Antwort Wort für
// Wort und der offene Vorschlag mit "Übernehmen".

import Link from "next/link";
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { NOTE } from "@/components/ui/styles";
import { stockNearlyEmpty } from "@/lib/essen/dishIdeas";
import type { useAssistantStatus } from "@/lib/begleitung/client";
import type { HelperVoice } from "@/lib/einstellungen/profile";
import type { AssistantData } from "@/lib/begleitung/ops";
import { speechSupported, toggleSpeak } from "@/lib/begleitung/speech";
import { AccessCodeCard, SpeakButton } from "@/components/begleitung/ChatBits";
import { ChatTurnItem } from "@/components/begleitung/ChatTurnItem";
import { MiaBubble, OwnBubble, StageTopic } from "@/components/begleitung/MiaStage";
import { firstOfRun } from "@/lib/begleitung/stage";
import { KochtippCard } from "@/components/essen/kochtipp/KochtippCard";
import type { KochtippChat } from "@/components/essen/kochtipp/useKochtippChat";
import type { ChatState, ChatTurnView } from "@/components/begleitung/chatTypes";
import { ProposalCard } from "@/components/begleitung/ProposalCard";
import { AdjustSheet, EarlierIdeas, SpontanAnswer } from "@/components/begleitung/SpontanBoard";
import { TipBubble } from "@/components/begleitung/TipBubble";
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
  /** Zugangscode "Später" */
  codeLater: boolean;
  onCodeLater: () => void;
  chat: ChatState;
  setChat: Dispatch<SetStateAction<ChatState>>;
  busy: boolean;
  streaming: string | null;
  speakingId: string | null;
  tipsOn: boolean | undefined;
  adjusting: boolean;
  setAdjusting: (on: boolean) => void;
  spontan: SpontanChat;
  kochtipp: KochtippChat;
  market: ReturnType<typeof useMarketChat>;
  rules: (t: string) => boolean;
  onSubmit: (text: string) => void;
  onAsk: (text: string) => void;
  onApply: (selected: Set<string>) => void;
  onClose: () => void;
  /** Bühne: nur ab dieser Nachricht zeigen (sonst alles = „Verlauf“) */
  from?: number;
  /** Begrüßung als erste Blase („Hi, ich bin Mia – was steht an?“) */
  showGreeting?: boolean;
  /** Bereichs-Kopf über Mias erster Blase („KOCHIDEE“, „TERMIN“ …) */
  topic?: string;
  /** Gerade Gesagtes – erscheint live als eigene Blase */
  heard?: string;
  /** Am Ende des Gesprächs (Beispiele, schönere Stimme) */
  children?: ReactNode;
};

export function ChatHistory({ scrollRef, inputRef, status, data, name, voice, codeLater, onCodeLater, chat, setChat, busy, streaming, speakingId, tipsOn, adjusting, setAdjusting, spontan, kochtipp, market, rules, onSubmit, onAsk, onApply, onClose, from = 0, showGreeting = true, topic, heard, children }: Props) {
  const { ideasFor, stockFor, headingFor, speechFor, takeIdea, moreIdeas, adjusting2, setAdjusting2, applyFilters, acceptUnsure } = spontan;
  // Offene Ideen-Antwort (die letzte, solange Spontan kochen läuft) und eingeklappte frühere
  const spontanIndexes = chat.turns.flatMap((t, i) => (t.spontan ? [i] : []));
  const liveSpontan = chat.spontan !== null && spontanIndexes.length ? spontanIndexes[spontanIndexes.length - 1] : -1;
  // Nur der neueste Mail-Entwurf lässt sich ändern
  const lastMailIndex = chat.turns.map((t) => Boolean(t.mail)).lastIndexOf(true);
  const earlier = spontanIndexes.filter((i) => i !== liveSpontan);
  const firstEarlier = earlier[0] ?? -1;
  const earlierTitles = [...new Set(earlier.flatMap((i) => ideasFor(chat.turns[i]).map((idea) => idea.title)))];
  const roles = chat.turns.map((t) => t.role);
  const greeting = showGreeting && data;

  return (
        <div ref={scrollRef} className="mia-gespraech flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3" aria-live="polite">
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
                an – dann weiß ich, für wen ich plane.
              </span>
            </p>
          ) : greeting ? (
            <MiaBubble lead>Hi, ich bin {name} – was steht an?</MiaBubble>
          ) : null}
          {status?.askCode && data && !codeLater && <AccessCodeCard onLater={onCodeLater} />}
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
            if (turn.cook) {
              const cook = turn.cook;
              const live = last && chat.kochtipp != null;
              return (
                <KochtippCard
                  key={i}
                  card={cook.card}
                  persons={cook.persons}
                  live={live}
                  onPersons={(n) => kochtipp.setPersons(i, n)}
                  onAnother={() => chat.kochtipp && kochtipp.another(chat.kochtipp)}
                  onTake={() => kochtipp.take(cook.card, cook.persons)}
                  onNavigate={onClose}
                />
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

          {heard && <OwnBubble live>{heard}</OwnBubble>}

          {/* Antwort erscheint Wort für Wort; das Überlegen zeigt die große Mia unten */}
          {busy && streaming && <MiaBubble lead={roles[roles.length - 1] !== "assistant"}>{streaming}</MiaBubble>}

          {chat.proposal && data && !busy && (
            <ProposalCard
              data={data}
              proposal={chat.proposal}
              adjusting={adjusting}
              onToggle={(id) =>
                setChat((c) => {
                  if (!c.proposal) return c;
                  const selected = new Set(c.proposal.selected);
                  if (selected.has(id)) selected.delete(id);
                  else selected.add(id);
                  return { ...c, proposal: { ...c.proposal, selected } };
                })
              }
              onApply={() => {
                if (!chat.proposal) return;
                // App-Bedienung, die die KI vorgeschlagen hat: nach "Übernehmen" mit den eigenen Regeln ausführen
                const commands = chat.proposal.ops.flatMap((op) => (op.type === "app_command" && chat.proposal!.selected.has(op.id) ? [op.text] : []));
                onApply(chat.proposal.selected);
                for (const text of commands) {
                  if (!rules(text)) setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: `„${text}“ kann ich in der App so nicht umsetzen – sag’s mir gern anders.`, local: true }] }));
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
  );
}
