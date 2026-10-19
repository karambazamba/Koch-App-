"use client";

// Seite "Notizen" (/notizen): nur festhalten – Text oder Liste. Angeheftete
// oben in voller Breite, darunter Kärtchen im 2er-Raster (Emoji + Titel,
// 2–4 Zeilen Vorschau, graue Zeile). Antippen öffnet die Notiz.

import Link from "next/link";
import { useState } from "react";
import { ListChecks, NotebookPen, PenLine, Pin, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/plan/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { ROUND_PLUS } from "@/components/alltag/TasksView";
import { changeKladde, notePreview, saveKladde, sortNotes, useKladde, useNotes, type Note } from "@/lib/notizen";
import { buttonClass } from "@/components/ui/styles";
import { openHelper } from "@/lib/lotte/open";
import { showToast } from "@/lib/core/toast";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";

type Filter = "alles" | "familie" | "arbeit";

const SHORT = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "numeric" });

function NoteCard({ note, wide }: { note: Note; wide?: boolean }) {
  const lines = notePreview(note, wide ? 3 : 4);
  const isList = note.data.kind === "liste";
  const count = note.data.items?.length ?? 0;
  const meta = [note.raum === "arbeit" ? "Arbeit" : "Familie", isList ? `Liste · ${count}` : SHORT.format(new Date(note.geaendert))].join(" · ");
  return (
    <li className="min-w-0">
      <Link href={`/notizen/bearbeiten?id=${note.id}`} className={`${CARD} flex h-full flex-col gap-1.5 p-3.5`} aria-label={note.data.title}>
        <span className="flex items-center gap-1.5">
          <span className="text-lg leading-none" aria-hidden>
            {note.data.emoji}
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{note.data.title}</span>
          {note.data.pinned && <Pin className="h-4 w-4 shrink-0 fill-current text-accent" strokeWidth={2} aria-label="angeheftet" />}
        </span>
        {lines.length > 0 && (
          <span className={`flex flex-col text-[13px] leading-snug text-ink/80 ${wide ? "" : "min-h-[3.4em]"}`}>
            {lines.map((l, i) => (
              <span key={i} className="truncate">
                {l}
              </span>
            ))}
          </span>
        )}
        <span className="mt-auto truncate text-xs text-muted">{meta}</span>
      </Link>
    </li>
  );
}

export function NotesView() {
  const notes = useNotes();
  const profile = useProfile();
  const work = useWorkRoom();
  const [filter, setFilter] = useState<Filter>("alles");
  const [choose, setChoose] = useState(false);
  const shown = notes ? sortNotes(notes).filter((n) => filter === "alles" || n.raum === filter) : null;
  const pinned = shown?.filter((n) => n.data.pinned) ?? [];
  const rest = shown?.filter((n) => !n.data.pinned) ?? [];
  const hasWork = work || Boolean(notes?.some((n) => n.raum === "arbeit"));
  const name = profile ? helperName(profile) : "Lotte";
  return (
    <>
      <PageHeader
        title="Notizen"
        backHref="/?seite=woche"
        action={
          <button type="button" onClick={() => setChoose(true)} aria-label="Neue Notiz" className={ROUND_PLUS}>
            <Plus className="h-5 w-5" strokeWidth={2.75} aria-hidden />
          </button>
        }
      />
      <main className={PAGE_MAIN}>
        <KladdeCard name={name} />
        {hasWork && (
          <Segmented
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "alles", label: "Alle" },
              { value: "familie", label: "Familie" },
              { value: "arbeit", label: "Arbeit" },
            ]}
          />
        )}
        {!shown ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : shown.length === 0 ? (
          <p className="px-1 py-6 text-center text-base text-muted">Hier landet, was du dir merken willst – Ideen, Listen, das WLAN-Passwort.</p>
        ) : (
          <>
            {pinned.length > 0 && (
              <ul className="flex flex-col gap-2" aria-label="Angeheftet">
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} wide />
                ))}
              </ul>
            )}
            {rest.length > 0 && (
              <ul className="grid grid-cols-2 gap-2" aria-label="Notizen">
                {rest.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </ul>
            )}
          </>
        )}
        <p className="px-1 text-center text-sm text-muted">Sag einfach: „Merk dir …“ – {name} legt es hier ab.</p>
      </main>
      {choose && (
        <Sheet title="Neu" onClose={() => setChoose(false)}>
          <div className={`${CARD} mb-2 flex flex-col divide-y divide-line overflow-hidden`}>
            <Link href="/notizen/bearbeiten?neu=text" className="flex h-14 items-center gap-3 px-4 text-base font-semibold active:bg-stone-100">
              <NotebookPen className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
              Notiz
            </Link>
            <Link href="/notizen/bearbeiten?neu=liste" className="flex h-14 items-center gap-3 px-4 text-base font-semibold active:bg-stone-100">
              <ListChecks className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
              Liste
            </Link>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** Kladde = Schmierzettel: speichert beim Tippen, "Lotte, räum auf" und "Leeren" (mit Rückgängig) */
function KladdeCard({ name }: { name: string }) {
  const kladde = useKladde();
  const at = kladde?.geaendert ? new Date(kladde.geaendert) : null;
  const clock = at ? `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}` : "";
  return (
    <section id="kladde" className="flex scroll-mt-24 flex-col gap-2 rounded-card border border-kladde-line bg-kladde p-4" aria-label="Kladde">
      <div className="flex items-center gap-2">
        <PenLine className="h-4 w-4 text-muted" strokeWidth={2} aria-hidden />
        <h2 className="flex-1 text-xs font-bold uppercase tracking-wider text-muted">Kladde</h2>
        {kladde?.text && clock && (
          <span className="text-xs text-muted" role="status">
            gespeichert · {clock}
          </span>
        )}
      </div>
      <textarea
        value={kladde?.text ?? ""}
        onChange={(e) => saveKladde(e.target.value)}
        placeholder="Schnell was aufschreiben …"
        aria-label="Kladde"
        rows={5}
        className="min-h-28 w-full resize-y bg-transparent text-base leading-relaxed placeholder:text-muted/70 focus:outline-none"
      />
      {kladde?.text.trim() && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openHelper(undefined, "Räum meine Kladde auf")} className={buttonClass("secondary", "sm")}>
            ✨ {name}, räum auf
          </button>
          <button
            type="button"
            onClick={() => {
              const undo = changeKladde("");
              showToast({ text: "Kladde geleert ✓", undo, undoneText: "Rückgängig gemacht." });
            }}
            className={buttonClass("ghost", "sm")}
          >
            Leeren
          </button>
        </div>
      )}
    </section>
  );
}
