"use client";

// Notiz bearbeiten im Vollbild (/notizen/bearbeiten?id=… bzw. ?neu=text|liste):
// oben „‹ Notizen“ und „Fertig“, darunter großer Titel und Text mit Absätzen.
// Listen: Return = neuer Eintrag, leerer Eintrag + Return = Liste zu Ende
// (weiter im Text darunter). Werkzeugleiste über der Tastatur: Liste ·
// Anheften · Familie/Arbeit · Teilen · Löschen. Sichert von selbst; „Fertig“
// schließt nur, eine leere Notiz fällt beim Schließen weg.

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ListChecks, Pin, Plus, Share2, Trash2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { MehrzeilenFeld } from "@/components/ui/MehrzeilenFeld";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, chipClass } from "@/components/ui/styles";
import { createNote, itemEnter, newItemId, loadNotes, noteShareText, persistNote, removeNote, replaceNotes, toggleList, useNotes, type Note, type NoteItem } from "@/lib/notizen";
import { createAutosave } from "@/lib/notizen/autosave";
import { nowIso } from "@/lib/core/now";
import { showDeleted, showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { useGoBack } from "@/lib/core/useGoBack";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useRaumName } from "@/lib/einstellungen/useHaushalt";

export function NoteEditor() {
  const params = useSearchParams();
  const notes = useNotes();
  const id = params.get("id");
  const kind = params.get("neu") === "liste" ? "liste" : "text";
  if (notes === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const existing = id ? notes.find((n) => n.id === id) : undefined;
  if (id && !existing) {
    return (
      <>
        <PageHeader title="Notiz" backHref="/notizen" />
        <main className={PAGE_MAIN}>
          <p className="px-1 text-base text-muted">Diese Notiz gibt es nicht mehr.</p>
        </main>
      </>
    );
  }
  return <Editor key={existing?.id ?? `neu-${kind}`} initial={existing ?? (kind === "liste" ? toggleList(createNote({ title: "", text: "" })) : createNote({ title: "", text: "" }))} isNew={!existing} />;
}

const TOOL = "hit flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-field py-1 text-[11px] font-semibold text-muted active:bg-fill";

function Editor({ initial, isNew }: { initial: Note; isNew: boolean }) {
  const raum = useRaumName();
  const [note, setNote] = useState(initial);
  const [focusItem, setFocusItem] = useState<string | null>(null);
  const work = useWorkRoom() || note.raum === "arbeit";
  const goBack = useGoBack();
  const inset = useKeyboardInset();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const deleted = useRef(false);
  const autosave = useMemo(() => createAutosave<Note>((n) => replaceNotes(persistNote(loadNotes(), n))), []);
  // Beim Verlassen (Fertig, Zurück, Geste) sofort sichern bzw. Leeres verwerfen
  useEffect(() => () => void (deleted.current || autosave.flush()), [autosave]);
  // Neue Notiz: Tastatur gleich im Titel (autoFocus allein greift nach dem Seitenwechsel nicht immer)
  useEffect(() => {
    if (isNew) titleRef.current?.focus();
  }, [isNew]);
  useEffect(() => {
    if (!focusItem) return;
    document.querySelector<HTMLInputElement>(`[data-eintrag="${focusItem}"]`)?.focus();
  }, [focusItem]);

  const change = (next: Note) => {
    const stamped = { ...next, geaendert: nowIso() };
    setNote(stamped);
    autosave.push(stamped);
  };
  const update = (patch: Partial<Note["data"]>) => change({ ...note, data: { ...note.data, ...patch } });
  const items = note.data.items ?? [];
  const setItems = (list: NoteItem[]) => update({ items: list });
  const isList = note.data.kind === "liste";

  const close = () => {
    autosave.flush();
    goBack("/notizen");
  };
  const remove = () => {
    deleted.current = true;
    const before = loadNotes();
    replaceNotes(removeNote(before, note.id));
    if (!isNew || before.some((n) => n.id === note.id)) showDeleted(pushUndo(`das Löschen von ${note.data.title || "der Notiz"}`, () => replaceNotes(before)));
    goBack("/notizen");
  };
  const share = async () => {
    const text = noteShareText(note);
    if (!text) return;
    try {
      if (navigator.share) return void (await navigator.share({ title: note.data.title || "Notiz", text }));
      await navigator.clipboard.writeText(text);
      showToast({ text: "Kopiert", seconds: 2, small: true });
    } catch (error) {
      // Abbrechen im Teilen-Menü ist kein Fehler
      if ((error as Error)?.name !== "AbortError") showToast({ text: "Teilen hat grad nicht geklappt.", seconds: 3, small: true });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col" data-notiz-vollbild>
      <header data-sticky-header className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur [box-sizing:content-box]">
        <BackButton fallback="/notizen" />
        <button type="button" onClick={close} className="hit -mr-2 px-2 text-[17px] font-bold text-accent-strong active:opacity-60">
          Fertig
        </button>
      </header>
      <main className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-2">
        <input
          ref={titleRef}
          value={note.data.title}
          onChange={(e) => update({ title: e.target.value.slice(0, 80) })}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (isList && items[0]) setFocusItem(items[0].id);
            else textRef.current?.focus();
          }}
          placeholder="Titel"
          aria-label="Titel"
          autoFocus={isNew}
          enterKeyHint="next"
          className="w-full bg-transparent text-[30px] font-extrabold leading-tight tracking-tight placeholder:text-faint focus:outline-none"
        />

        {isList && (
          <ul className="flex flex-col" aria-label="Liste">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={Boolean(item.done)}
                  aria-label={`${item.text || "Eintrag"} abhaken`}
                  onClick={() => setItems(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
                  className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
                >
                  <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition ${item.done ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`}>
                    {item.done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
                  </span>
                </button>
                <input
                  value={item.text}
                  onChange={(e) => setItems(items.map((i) => (i.id === item.id ? { ...i, text: e.target.value.slice(0, 200) } : i)))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const next = itemEnter(items, item.id);
                      setItems(next.items);
                      setFocusItem(next.focus);
                      if (!next.focus) textRef.current?.focus();
                    } else if (e.key === "Backspace" && !item.text && items.length > 1) {
                      e.preventDefault();
                      const at = items.findIndex((i) => i.id === item.id);
                      setItems(items.filter((i) => i.id !== item.id));
                      setFocusItem(items[Math.max(0, at - 1)]?.id ?? null);
                    }
                  }}
                  aria-label="Eintrag"
                  enterKeyHint="enter"
                  data-eintrag={item.id}
                  className={`min-w-0 flex-1 bg-transparent py-2.5 text-[17px] focus:outline-none ${item.done ? "text-muted line-through" : ""}`}
                />
              </li>
            ))}
            <li>
              <button type="button" onClick={() => {
                const next = { id: newItemId(), text: "" };
                setItems([...items, next]);
                setFocusItem(next.id);
              }} className="hit -ml-1 flex min-h-11 items-center gap-2 text-[15px] font-semibold text-muted">
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                Eintrag
              </button>
            </li>
          </ul>
        )}

        {isList && (
          <button type="button" aria-pressed={Boolean(note.data.freizeit)} onClick={() => update({ freizeit: !note.data.freizeit })} className={`${chipClass(Boolean(note.data.freizeit))} self-start`}>
            {note.data.freizeit ? "Freizeit-Liste" : "Als Freizeit markieren"}
          </button>
        )}

        <MehrzeilenFeld ref={textRef} voll value={note.data.text ?? ""} onChange={(text) => update({ text: text.slice(0, 4000) })} label="Text" placeholder={isList ? "" : "Text mit Absätzen …"} className="min-h-40" />
      </main>

      <nav aria-label="Werkzeuge" className="fixed inset-x-0 z-20 border-t border-line bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur" style={{ bottom: inset }} data-werkzeugleiste>
        <div className="mx-auto flex max-w-xl items-stretch gap-1">
          <button type="button" aria-pressed={isList} onPointerDown={(e) => e.preventDefault()} onClick={() => change(toggleList(note))} className={`${TOOL} ${isList ? "text-accent-strong" : ""}`}>
            <ListChecks className="h-5 w-5" strokeWidth={2} aria-hidden />
            Liste
          </button>
          <button type="button" aria-pressed={note.data.pinned} onPointerDown={(e) => e.preventDefault()} onClick={() => update({ pinned: !note.data.pinned })} className={`${TOOL} ${note.data.pinned ? "text-accent-strong" : ""}`}>
            <Pin className={`h-5 w-5 ${note.data.pinned ? "fill-current" : ""}`} strokeWidth={2} aria-hidden />
            {note.data.pinned ? "Angeheftet" : "Anheften"}
          </button>
          {work && (
            <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => change({ ...note, raum: note.raum === "arbeit" ? "familie" : "arbeit" })} aria-label={`Raum: ${note.raum === "arbeit" ? "Arbeit" : raum} – wechseln`} className={TOOL}>
              <span className={`mt-1 h-3 w-3 rounded-full ${note.raum === "arbeit" ? "bg-work" : "bg-accent"}`} aria-hidden />
              {note.raum === "arbeit" ? "Arbeit" : raum}
            </button>
          )}
          <button type="button" onClick={share} className={TOOL}>
            <Share2 className="h-5 w-5" strokeWidth={2} aria-hidden />
            Teilen
          </button>
          <button type="button" onClick={remove} className={TOOL}>
            <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
            Löschen
          </button>
        </div>
      </nav>
    </div>
  );
}
