"use client";

// Kopf des Chats: Stift links = neues Gespräch, Begleitung mittig, "Fertig" rechts.

import { SquarePen } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";

type Props = {
  name: string;
  onNewChat: () => void;
  onClose: () => void;
};

export function HelperHeader({ name, onNewChat, onClose }: Props) {
  return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button type="button" onClick={onNewChat} aria-label="Neues Gespräch" className="hit flex h-10 w-10 items-center justify-center justify-self-start text-accent-strong active:opacity-60">
            <SquarePen className="h-6 w-6" strokeWidth={2} aria-hidden />
          </button>
          <span className="flex min-w-0 items-center gap-2">
            <BegleitungAvatar size={32} />
            <h2 className="truncate text-[17px] font-extrabold">{name}</h2>
          </span>
          <button type="button" onClick={onClose} className="hit h-10 justify-self-end px-1 text-[17px] font-bold text-accent-strong active:opacity-60">
            Fertig
          </button>
        </div>
  );
}
