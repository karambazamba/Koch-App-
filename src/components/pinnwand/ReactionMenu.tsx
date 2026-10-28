"use client";

// Zettel angetippt oder lange gedrückt (Tafel 106, E): der Zettel hebt sich
// leicht an, der Rest wird abgedunkelt; darüber die Reaktionsleiste 👍 ❤️ 😂
// 😮 🙏 (Reaktionen sind Inhalt), darunter das Menü „Erledigt“, „Antworten“,
// „In Notizen“ (nur Text), „Bleibt hängen“ bzw. „Nicht mehr festhalten“ (nur
// Zettel), „Löschen“ (nur eigene, sofort ganz weg mit Rückgängig); im Archiv
// nur Antworten, In Notizen und Löschen. Bei der eigenen
// Sprachnachricht „Gehört von“. Schließt per Danebentippen, Escape und Zurück.

import { useEffect, useRef, type ReactNode } from "react";
import { Check, CircleCheck, NotebookPen, Pin, Reply, Trash2 } from "lucide-react";
import { useBackCloses } from "@/lib/core/useBackCloses";
import { now } from "@/lib/core/now";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { BLEIBT_HAENGEN, NICHT_MEHR_FESTHALTEN, REACTIONS, changeMemos, setMemoHeard } from "@/lib/pinnwand";
import { deleteItem, mayDelete, moveToNotes, reactTo, reactionsOf, toggleDone, togglePinned } from "@/components/pinnwand/boardActions";
import { entryOf } from "@/components/pinnwand/useBoard";
import type { BoardItem } from "@/components/pinnwand/useBoard";

type Props = { item: BoardItem; me: string; household: string[]; archived?: boolean; onReply: () => void; onClose: () => void; children: ReactNode };

function MenuRow({ icon: Icon, label, danger = false, onClick }: { icon: typeof Reply; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={`flex min-h-12 w-full items-center justify-between px-4 text-left text-[16px] font-semibold active:bg-fill ${danger ? "text-danger" : "text-ink"}`}>
      {label}
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
    </button>
  );
}

export function ReactionMenu({ item, me, household, archived = false, onReply, onClose, children }: Props) {
  useBackCloses(onClose);
  const armed = useRef(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const mine = reactionsOf(item)[me];
  const run = (fn: () => void) => () => (onClose(), fn());
  const ownMemo = item.kind === "memo" && item.memo.data.author === me;
  const others = household.filter((p) => item.kind === "memo" && p !== item.memo.data.author);
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-center gap-2.5 px-4"
      role="dialog"
      aria-modal
      aria-label="Reagieren"
      data-no-swipe
      // Das Loslassen des langen Drückens schickt (Android) noch einen Klick – der gehört nicht hierher.
      // Erst eine neue Berührung im Menü (oder Tastatur/VoiceOver: detail 0) zählt.
      onPointerDownCapture={() => (armed.current = true)}
      onClickCapture={(e) => {
        if (!armed.current && e.detail !== 0) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <button type="button" tabIndex={-1} aria-label="Schließen" onClick={onClose} className="mia-einblenden absolute inset-0 bg-scrim backdrop-blur-[2px]" />
      <div className="relative flex justify-center gap-1 self-center rounded-full bg-surface px-2 py-1.5 shadow-float" role="group" aria-label="Reaktion">
        {REACTIONS.map((r) => (
          <button key={r} type="button" aria-label={`Mit ${r} reagieren`} aria-pressed={mine === r} onClick={run(() => reactTo(item, r, me))} className={`flex h-11 w-11 items-center justify-center rounded-full text-[24px] active:scale-90 ${mine === r ? "bg-accent-soft" : ""}`}>
            {r}
          </button>
        ))}
      </div>
      <div className="pin-angehoben relative">{children}</div>
      <div className="relative self-end overflow-hidden rounded-card bg-surface shadow-float" role="menu" style={{ minWidth: 240 }}>
        <div className="divide-y divide-line">
          {!archived && <MenuRow icon={CircleCheck} label={entryOf(item).data.erledigt ? "Doch nicht erledigt" : "Erledigt"} onClick={run(() => toggleDone(item, me))} />}
          <MenuRow icon={Reply} label="Antworten" onClick={run(onReply)} />
          {item.kind === "pin" && item.pin.data.text && <MenuRow icon={NotebookPen} label="In Notizen" onClick={run(() => moveToNotes(item))} />}
          {item.kind === "pin" && !archived && <MenuRow icon={Pin} label={item.pin.data.pinned ? NICHT_MEHR_FESTHALTEN : BLEIBT_HAENGEN} onClick={run(() => togglePinned(item))} />}
          {mayDelete(item, me) && <MenuRow icon={Trash2} label="Löschen" danger onClick={run(() => deleteItem(item, me))} />}
        </div>
      </div>
      {ownMemo && others.length > 0 && item.kind === "memo" && (
        <section className="relative self-end rounded-card bg-surface px-3 py-2 shadow-float" aria-label="Gehört von" style={{ minWidth: 240 }}>
          <h3 className="px-1 pb-1 text-[13px] font-extrabold text-muted">Gehört von</h3>
          {others.map((p) => {
            const heard = item.memo.data.gehoertVon.includes(p);
            return (
              <button key={p} type="button" role="checkbox" aria-checked={heard} onClick={() => changeMemos((all) => setMemoHeard(all, item.id, p, !heard, household, now().toISOString()))} className="flex min-h-11 w-full items-center gap-3 px-1 text-left">
                <PersonAvatar name={p} size={26} />
                <span className="flex-1 text-[15px]">{p}</span>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${heard ? "bg-good text-on-accent" : "border-2 border-line-strong"}`}>{heard && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}</span>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
