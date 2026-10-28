"use client";

// Schnelleingabe (Tafel 76): „＋ = schreiben, Mia = sprechen“. Kleines Fenster
// unten über der Tastatur: Kopf in der Farbe des Bereichs („AUF DIE LISTE“),
// EIN Feld (16 px, Tastatur sofort offen), rechts das orange ➤ (leer = blass,
// tut nichts). ➤ oder Return speichert sofort („Notiert: … · Rückgängig“),
// das Feld bleibt leer für die nächste. Termine und Aufgaben haben ihr
// eigenes EINES Fenster (`kalender/eintragen`, Tafel 114). „Mehr Details“
// (Pinnwand, Einkauf) öffnet das volle Formular mit dem Getippten. Kein Mikro:
// sprechen geht über den Mia-Knopf (die iPhone-Tastatur hat ihr eigenes).
// Notiz und Pinnwand: mehrzeilig (`MehrzeilenFeld`, bis 6 Zeilen), Return =
// neue Zeile, gespeichert wird nur mit ➤; bei der Notiz ist die erste Zeile
// der Titel.

import { useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { MehrzeilenFeld } from "@/components/ui/MehrzeilenFeld";
import { ICON_BUTTON, INPUT_BASE } from "@/components/ui/styles";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { QUICK_HEADER, QUICK_LABEL, QUICK_PLACEHOLDER, readQuick, type QuickRead, type QuickRequest } from "@/lib/core/schnelleingabe";
import { saveQuick } from "@/components/ui/quickSave";
import { EinkaufLaden } from "@/components/einkauf/EinkaufLaden";

const TILE: Record<QuickRead["kind"], string> = { einkauf: "einkauf", notiz: "notizen", pinnwand: "pinnwand", imhaus: "vorrat" };

export function QuickEntry({ request: req, onClose }: { request: QuickRequest; onClose: () => void }) {
  const kind = req.kind as QuickRead["kind"];
  const request = { ...req, kind };
  const [text, setText] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const multi = request.kind === "notiz" || request.kind === "pinnwand";
  /** Einkauf: von Hand gewählter Laden (sonst Vorwahl) */
  const [shop, setShop] = useState<{ shop: string; picked: boolean }>({ shop: request.shopping?.shop ?? "", picked: false });
  const inset = useKeyboardInset();
  const read = readQuick(kind, text);
  const ready = Boolean(read.title);
  const color = `var(--app-tile-${TILE[request.kind]}-ac)`;

  const send = () => {
    const req = request.shopping ? { ...request, shopping: { ...request.shopping, ...shop } } : request;
    if (!ready || !saveQuick(read, text, req)) return;
    setText("");
    (multi ? area : field).current?.focus();
  };

  return (
    <Sheet
      title="Schnelleingabe"
      onClose={onClose}
      inset={inset}
      header={
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-extrabold tracking-[0.08em]" style={{ color }}>
            {QUICK_HEADER[request.kind]}
          </h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className={`flex gap-2 ${multi ? "items-end" : "items-center"}`}>
          {multi ? (
            <MehrzeilenFeld ref={area} value={text} onChange={setText} label={QUICK_LABEL[request.kind]} placeholder={QUICK_PLACEHOLDER[request.kind]} autoFocus />
          ) : (
          <input
            ref={field}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={QUICK_PLACEHOLDER[request.kind]}
            aria-label={QUICK_LABEL[request.kind]}
            autoFocus
            enterKeyHint="send"
            autoComplete="off"
            className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
          />
          )}
          <button
            type="submit"
            aria-label="Speichern"
            aria-disabled={!ready}
            // Feld nicht verlassen – die Tastatur bleibt offen
            onPointerDown={(e) => e.preventDefault()}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-opacity active:scale-95 ${ready ? "" : "opacity-35"}`}
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.75} aria-hidden />
          </button>
        </div>

        {request.kind === "einkauf" && <EinkaufLaden text={text} tab={request.shopping?.shop} choice={shop} onChoice={setShop} />}

        {request.more && (
          <button
            type="button"
            onClick={() => {
              const more = request.more!;
              onClose();
              more(text);
            }}
            className="hit self-start text-[15px] font-semibold text-muted"
          >
            Mehr Details
          </button>
        )}
      </form>
    </Sheet>
  );
}
