"use client";

// Eine Nachricht im Chat: Blase, Lautsprecher, Mail-Karte, Antwort-Knöpfe,
// Supermarkt-/Back-Karten und Basis-Chips.

import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { bumpBase, sortedBases } from "@/lib/essen/bases";
import { hasKids } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import type { ParsedLeftover } from "@/lib/essen/leftovers/parser";
import type { MarketIdea } from "@/lib/essen/market";
import type { AssistantData } from "@/lib/lotte/ops";
import { speechSupported } from "@/lib/lotte/speech";
import { chipClass } from "@/components/ui/styles";
import type { ChatTurnView } from "./chatTypes";
import { SpeakButton } from "./ChatBits";
import { MailCard } from "./MailCard";
import { MarketBoard, type MarketTarget } from "./MarketBoard";
import { BakingBoard } from "./BakingBoard";

export const BUBBLE = "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-base leading-snug";

type Props = {
  turn: ChatTurnView;
  last: boolean;
  data: AssistantData | null | undefined;
  /** Basis-Chips zeigen (die KI fragt nach der Basis) */
  showBases: boolean;
  mailActive: boolean;
  speaking: boolean;
  onSpeak: () => void;
  onSubmit: (text: string) => void;
  onAsk: (text: string) => void;
  onAcceptUnsure: (item: ParsedLeftover) => void;
  onMarketAdd: (product: string, idea: MarketIdea) => void;
  onMarketPlan: (idea: MarketIdea, target: MarketTarget) => void;
  onClose: () => void;
};

export function ChatTurnItem({ turn, last, data, showBases, mailActive, speaking, onSpeak, onSubmit, onAsk, onAcceptUnsure, onMarketAdd, onMarketPlan, onClose }: Props) {
  return (
      <div className={`flex flex-col gap-2 ${turn.role === "user" ? "items-end" : "items-start"}`}>
        <div className={`flex w-full items-end gap-1 ${turn.role === "user" ? "justify-end" : ""}`}>
        <div
          className={`${BUBBLE} ${
            turn.role === "user"
              ? `rounded-br-md bg-accent text-on-accent ${turn.text.length > 300 ? "line-clamp-6" : ""}`
              : "rounded-bl-md border border-line bg-surface text-ink"
          }`}
        >
          {turn.text}
          {(turn.items?.length || turn.unsure?.length) ? (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {turn.items?.map((item) => (
                <span key={item} className={chipClass(true)}>
                  {item}
                </span>
              ))}
              {turn.unsure?.map((u) => (
                <button
                  key={u.heard}
                  type="button"
                  onClick={() => onAcceptUnsure(u)}
                  className={chipClass(false, "muted")}
                >
                  {u.suggestion ? `Meintest du ${u.suggestion}?` : `${u.name} übernehmen?`}
                  <CircleHelp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </button>
              ))}
            </span>
          ) : null}
          {turn.items?.length ? (
            <Link href="/vorrat" onClick={onClose} className="mt-2 block text-sm font-semibold text-accent-strong underline">
              Im Vorrat ansehen
            </Link>
          ) : null}
        </div>
        {turn.role === "assistant" && speechSupported() && (
          <SpeakButton speaking={speaking} onClick={onSpeak} />
        )}
        </div>
        {turn.mail && (
          <MailCard
            draft={turn.mail}
            active={mailActive}
            onRevise={onSubmit}
          />
        )}
        {turn.chips && last && (
          <div className="flex flex-wrap gap-2" aria-label="Antworten">
            {turn.chips.map((c) => (
              <button key={c} type="button" onClick={() => onSubmit(c)} className={chipClass(false)}>
                {c}
              </button>
            ))}
          </div>
        )}
        {turn.choices && last && (
          <div className="flex flex-wrap gap-2">
            {turn.choices.map((c) => (
              <button key={c.label} type="button" onClick={c.onClick} className={chipClass(false)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
        {turn.undo && turn.deleted && last && (
          <button type="button" onClick={turn.undo} className={chipClass(false, "muted")}>
            Rückgängig
          </button>
        )}
        {turn.market && (
          <MarketBoard
            answer={turn.market}
            target={turn.market.target}
            onAdd={(idea) => onMarketAdd(turn.market!.product, idea)}
            onPlan={onMarketPlan}
          />
        )}
        {turn.baking && data && <BakingBoard recipes={turn.baking} withKids={hasKids(data.profile)} onNavigate={onClose} />}
        {showBases && data && (
          <div className="flex flex-wrap gap-2" aria-label="Basis wählen">
            {sortedBases(data.profile.bases).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  saveProfile({ ...data.profile, bases: bumpBase(data.profile.bases, b.id) });
                  onAsk(b.label);
                }}
                className={chipClass(false)}
              >
                {b.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onAsk("Egal")}
              className={chipClass(false, "muted")}
            >
              Egal
            </button>
          </div>
        )}
      </div>
  );
}
