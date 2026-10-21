"use client";

// Notiz bearbeiten (/notizen/bearbeiten?id=… bzw. ?neu=text|liste): Titel,
// Text oder Liste (Einträge abhakbar), Raum, oben anheften, löschen. Wirkt
// sofort – jede Änderung wird gespeichert.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Pin, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CARD, INPUT_BASE, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { createNote, loadNotes, noteEmoji, removeNote, replaceNotes, upsertNote, useNotes, type Note, type NoteItem } from "@/lib/notizen";
import { nowIso } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { useGoBack } from "@/lib/core/useGoBack";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { SchnellnotizActions } from "./Schnellnotiz";

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
  return <Editor key={existing?.id ?? `neu-${kind}`} initial={existing ?? createNote({ title: "", ...(kind === "liste" ? { items: [] } : { text: "" }) })} isNew={!existing} />;
}

const itemId = () => Math.random().toString(36).slice(2, 10);

function Editor({ initial, isNew }: { initial: Note; isNew: boolean }) {
  const [note, setNote] = useState(initial);
  const [fresh, setFresh] = useState("");
  const work = useWorkRoom() || note.raum === "arbeit";
  const goBack = useGoBack();
  const isList = note.data.kind === "liste";
  const profile = useProfile();
  const fallbackTitle = isList ? "Neue Liste" : "Notiz";

  /** Lokal ändern und speichern (sobald es Inhalt gibt) */
  const update = (patch: Partial<Note["data"]>, raum = note.raum) => {
    const data = { ...note.data, ...patch };
    if (isNew && patch.title !== undefined && !initial.data.title) data.emoji = noteEmoji(patch.title, data.kind);
    const next: Note = { ...note, raum, data, geaendert: nowIso() };
    setNote(next);
    const hasContent = data.title.trim() || data.text?.trim() || data.items?.length;
    if (hasContent) replaceNotes(upsertNote(loadNotes(), { ...next, data: { ...data, title: data.title.trim() || fallbackTitle } }));
  };
  const setItems = (items: NoteItem[]) => update({ items });
  const addItem = () => {
    const text = fresh.trim();
    if (!text) return;
    setItems([...(note.data.items ?? []), { id: itemId(), text }]);
    setFresh("");
  };
  const remove = () => {
    const before = loadNotes();
    replaceNotes(removeNote(before, note.id));
    showDeleted(pushUndo(`das Löschen von ${note.data.title || fallbackTitle}`, () => replaceNotes(before)));
    goBack("/notizen");
  };

  return (
    <>
      <PageHeader title={isList ? "Liste" : "Notiz"} backHref="/notizen" />
      <main className={PAGE_MAIN}>
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {note.data.emoji}
          </span>
          <input
            value={note.data.title}
            onChange={(e) => update({ title: e.target.value.slice(0, 80) })}
            placeholder={isList ? "Titel, z. B. Packliste" : "Titel, z. B. WLAN-Passwort"}
            aria-label="Titel"
            autoFocus={isNew}
            className="min-w-0 flex-1 bg-transparent text-[22px] font-extrabold tracking-tight placeholder:text-muted/60 focus:outline-none"
          />
        </div>

        {isList ? (
          <section className={`${CARD} flex flex-col divide-y divide-line overflow-hidden`} aria-label="Einträge">
            {(note.data.items ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={Boolean(item.done)}
                  aria-label={`${item.text} abhaken`}
                  onClick={() => setItems((note.data.items ?? []).map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
                  className="flex h-12 w-12 shrink-0 items-center justify-center"
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition ${item.done ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`}>
                    {item.done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
                  </span>
                </button>
                <input
                  value={item.text}
                  onChange={(e) => setItems((note.data.items ?? []).map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)))}
                  aria-label="Eintrag"
                  className={`min-w-0 flex-1 bg-transparent py-3 text-base focus:outline-none ${item.done ? "text-muted line-through" : ""}`}
                />
                <button type="button" onClick={() => setItems((note.data.items ?? []).filter((i) => i.id !== item.id))} aria-label={`${item.text} entfernen`} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted">
                  <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              </div>
            ))}
            <form
              className="flex items-center gap-2 pl-4 pr-2"
              onSubmit={(e) => {
                e.preventDefault();
                addItem();
              }}
            >
              <input value={fresh} onChange={(e) => setFresh(e.target.value)} onBlur={addItem} placeholder="Neuer Eintrag …" aria-label="Neuer Eintrag" enterKeyHint="done" className="min-w-0 flex-1 bg-transparent py-3.5 text-base focus:outline-none" />
            </form>
          </section>
        ) : (
          <textarea
            value={note.data.text ?? ""}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Was soll ich mir merken?"
            aria-label="Text"
            rows={8}
            className={`${INPUT_BASE} w-full resize-none p-4 leading-relaxed`}
          />
        )}

        {note.data.schnell && (
          <div className="flex flex-wrap gap-2">
            <SchnellnotizActions name={helperName(profile)} text={note.data.text ?? ""} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {work &&
            (["familie", "arbeit"] as const).map((r) => (
              <button key={r} type="button" role="radio" aria-checked={note.raum === r} onClick={() => update({}, r)} className={chipClass(note.raum === r)}>
                <span className={`h-2.5 w-2.5 rounded-full ${r === "arbeit" ? "bg-work" : "bg-accent"}`} aria-hidden />
                {r === "familie" ? "Familie" : "Arbeit"}
              </button>
            ))}
          <button type="button" aria-pressed={note.data.pinned} onClick={() => update({ pinned: !note.data.pinned })} className={chipClass(note.data.pinned)}>
            <Pin className={`h-4 w-4 ${note.data.pinned ? "fill-current" : ""}`} strokeWidth={2} aria-hidden />
            {note.data.pinned ? "Oben angeheftet" : "Oben anheften"}
          </button>
          {note.data.kind === "liste" && (
            <button type="button" aria-pressed={Boolean(note.data.freizeit)} onClick={() => update({ freizeit: !note.data.freizeit })} className={chipClass(Boolean(note.data.freizeit))}>
              {note.data.freizeit ? "Freizeit-Liste" : "Als Freizeit markieren"}
            </button>
          )}
        </div>

        {!isNew || note.data.title || note.data.text || note.data.items?.length ? (
          <button type="button" onClick={remove} className={`${buttonClass("ghost", "sm")} self-start text-danger`}>
            <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
            Löschen
          </button>
        ) : null}
      </main>
    </>
  );
}
