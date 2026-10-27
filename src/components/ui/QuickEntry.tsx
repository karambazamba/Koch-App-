"use client";

// Schnelleingabe (Tafel 76): „＋ = schreiben, Mia = sprechen“. Kleines Fenster
// unten über der Tastatur: Kopf in der Farbe des Bereichs („NEUER TERMIN“),
// EIN Feld (16 px, Tastatur sofort offen), rechts das orange ➤ (leer = blass,
// tut nichts). Darunter erkennt die App ohne KI Tag, Uhrzeit, Raum als Chips
// (antippen = ändern, nötig sind sie nie). ➤ oder Return speichert sofort
// („Eingetragen: … · Rückgängig“), das Feld bleibt leer für die nächste.
// „Mehr Details“ öffnet das volle Formular mit dem Getippten. Kein Mikro:
// sprechen geht über den Mia-Knopf (die iPhone-Tastatur hat ihr eigenes).
// Notiz und Pinnwand: mehrzeilig (`MehrzeilenFeld`, bis 6 Zeilen), Return =
// neue Zeile, gespeichert wird nur mit ➤; bei der Notiz ist die erste Zeile
// der Titel.

import { useRef, useState } from "react";
import { BellOff, Bell, ArrowUp, CalendarDays, X } from "lucide-react";
import { quickReminderLabel } from "@/lib/heute/mitteilungen/erinnerungen";
import { useNotify } from "@/lib/heute/mitteilungen/einstellungen";
import { Sheet } from "@/components/ui/Sheet";
import { MehrzeilenFeld } from "@/components/ui/MehrzeilenFeld";
import { ICON_BUTTON, INPUT_BASE, chipClass } from "@/components/ui/styles";
import { todayIso } from "@/lib/core/now";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { QUICK_HEADER, QUICK_LABEL, QUICK_PLACEHOLDER, dayChoices, quickChips, readQuick, type QuickPick, type QuickRequest } from "@/lib/core/schnelleingabe";
import { WHEN_CHOICES } from "@/lib/kalender/quick";
import { saveQuick } from "@/components/ui/quickSave";
import { looksLikeList, openListe } from "@/lib/kalender/liste/einfuegen";
import { EinkaufLaden } from "@/components/einkauf/EinkaufLaden";
import { useRaumName } from "@/lib/einstellungen/useHaushalt";

const TILE: Record<QuickRequest["kind"], string> = { termin: "termine", aufgabe: "aufgaben", einkauf: "einkauf", notiz: "notizen", pinnwand: "pinnwand", imhaus: "vorrat" };

export function QuickEntry({ request, onClose }: { request: QuickRequest; onClose: () => void }) {
  const today = todayIso();
  const [text, setText] = useState("");
  const [pick, setPick] = useState<QuickPick>({});
  const [editing, setEditing] = useState<"tag" | null>(null);
  const [remind, setRemind] = useState(true);
  const field = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const multi = request.kind === "notiz" || request.kind === "pinnwand";
  /** Einkauf: von Hand gewählter Laden (sonst Vorwahl) */
  const [shop, setShop] = useState<{ shop: string; picked: boolean }>({ shop: request.shopping?.shop ?? "", picked: false });
  const inset = useKeyboardInset();
  const work = useWorkRoom();
  const raum = useRaumName();
  const notify = useNotify();
  const read = readQuick(request.kind, text, today, { date: request.date, pick });
  const chips = text.trim() || request.date ? quickChips(read, today, raum) : [];
  const ready = Boolean(read.title);
  const bell = (read.kind === "termin" || read.kind === "aufgabe") && chips.length ? quickReminderLabel(read.kind, read.time, notify?.defaultReminder ?? "30", remind) : null;
  const color = `var(--app-tile-${TILE[request.kind]}-ac)`;

  const send = () => {
    const req = request.shopping ? { ...request, shopping: { ...request.shopping, ...shop } } : request;
    if (!ready || !saveQuick(read, text, req, remind)) return;
    setText("");
    setPick({});
    setRemind(true);
    setEditing(null);
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
            onPaste={(e) => {
              // Eine ganze To-do-Liste eingefügt → „Liste einfügen“ mit Vorschau
              const pasted = e.clipboardData.getData("text");
              if (request.kind === "aufgabe" && looksLikeList(pasted)) {
                e.preventDefault();
                onClose();
                openListe(pasted);
              }
            }}
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

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Erkannt">
            {chips.map((c) => {
              const canRoom = c.id === "raum" && (work || c.room === "arbeit");
              if (c.id === "raum" && !canRoom) {
                return (
                  <span key={c.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[14px] font-semibold text-muted">
                    <span className={`h-2 w-2 rounded-full ${c.room === "arbeit" ? "bg-work" : "bg-accent"}`} aria-hidden />
                    {c.label}
                  </span>
                );
              }
              return (
                <button
                  key={c.id}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => (c.id === "tag" ? setEditing(editing === "tag" ? null : "tag") : setPick((p) => ({ ...p, room: c.room === "arbeit" ? "familie" : "arbeit" })))}
                  aria-label={`${c.label} – ändern`}
                  aria-expanded={c.id === "tag" ? editing === "tag" : undefined}
                  className="hit inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 text-[14px] font-semibold text-accent-strong active:scale-95"
                >
                  {c.id === "tag" ? <CalendarDays className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : <span className={`h-2 w-2 rounded-full ${c.room === "arbeit" ? "bg-work" : "bg-accent"}`} aria-hidden />}
                  {c.label}
                </button>
              );
            })}
            {bell && (
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setRemind((v) => !v)}
                aria-pressed={remind}
                aria-label={`${bell} – ändern`}
                className={`hit inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold active:scale-95 ${remind ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-line text-muted"}`}
              >
                {remind ? <Bell className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : <BellOff className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
                {bell}
              </button>
            )}
          </div>
        )}

        {request.kind === "einkauf" && <EinkaufLaden text={text} tab={request.shopping?.shop} choice={shop} onChoice={setShop} />}

        {editing === "tag" && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Tag">
            {read.kind === "termin" ? (
              <>
                {dayChoices(today).map((d) => (
                  <button key={d.iso} type="button" role="radio" aria-checked={read.date === d.iso} onPointerDown={(e) => e.preventDefault()} onClick={() => (setPick((p) => ({ ...p, date: d.iso })), setEditing(null))} className={`${chipClass(read.date === d.iso)} shrink-0`}>
                    {d.label}
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={!read.time} onPointerDown={(e) => e.preventDefault()} onClick={() => (setPick((p) => ({ ...p, allDay: !p.allDay })), setEditing(null))} className={`${chipClass(!read.time)} shrink-0`}>
                  ganztägig
                </button>
              </>
            ) : (
              WHEN_CHOICES.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={read.kind === "aufgabe" && read.when === c.id} onPointerDown={(e) => e.preventDefault()} onClick={() => (setPick((p) => ({ ...p, when: c.id })), setEditing(null))} className={`${chipClass(read.kind === "aufgabe" && read.when === c.id)} shrink-0`}>
                  {c.label}
                </button>
              ))
            )}
          </div>
        )}

        {(request.more || request.kind === "aufgabe") && (
          <div className="flex items-center gap-5">
            {request.more && (
              <button
                type="button"
                onClick={() => {
                  const more = request.more!;
                  onClose();
                  more(text);
                }}
                className="hit text-[15px] font-semibold text-muted"
              >
                Mehr Details
              </button>
            )}
            {request.kind === "aufgabe" && (
              <button type="button" onClick={() => (onClose(), openListe(text))} className="hit text-[15px] font-semibold text-muted">
                Liste einfügen
              </button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}
