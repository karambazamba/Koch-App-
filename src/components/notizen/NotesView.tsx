"use client";

// Seite "Notizen" (/notizen): oben „Schnell was notieren …“ (Zeile an die
// Schnellnotiz), Filter Alle | Familie | Arbeit, „Angeheftet“ (mit Pin) in
// voller Breite, darunter Kärtchen im 2er-Raster. Antippen öffnet die Notiz.

import Link from "next/link";
import { useState } from "react";
import { ListChecks, NotebookPen, Pin } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, PAGE_MAIN, SECTION_TITLE } from "@/components/ui/styles";
import { PagePlus } from "@/components/ui/QuickButton";
import { notePreview, sortNotes, useNotes, type Note } from "@/lib/notizen";
import { QuickNoteCard } from "@/components/notizen/Schnellnotiz";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { openQuick } from "@/lib/core/schnelleingabe";

type Filter = "alles" | "familie" | "arbeit";

const SHORT = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "numeric" });

function NoteCard({ note, wide }: { note: Note; wide?: boolean }) {
  const lines = notePreview(note, wide ? 3 : 4);
  const isList = note.data.kind === "liste";
  const count = note.data.items?.length ?? 0;
  const meta = [note.raum === "arbeit" ? "Arbeit" : "Familie", isList ? (count ? "Liste" : "Leere Liste") : SHORT.format(new Date(note.geaendert))].join(" · ");
  return (
    <li className="min-w-0">
      <Link href={`/notizen/bearbeiten?id=${note.id}`} className={`${CARD} flex h-full flex-col gap-1.5 p-3.5`} aria-label={note.data.title}>
        <span className="flex items-center gap-1.5">
          <span className="text-lg leading-none" aria-hidden>
            {note.data.emoji}
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{note.data.title}</span>
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
  const name = helperName(profile);
  return (
    <>
      <PageHeader
        title="Notizen"
        backHref="/?seite=kalender"
        action={
          <PagePlus label="Neue Notiz" onClick={() => openQuick({ kind: "notiz", more: () => setChoose(true) })} />
        }
      />
      <main className={PAGE_MAIN}>
        <QuickNoteCard />
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
              <section className="flex flex-col gap-2" aria-label="Angeheftet">
                <h2 className={`flex items-center gap-1.5 px-1 ${SECTION_TITLE}`}>
                  <Pin className="h-4 w-4 text-accent" strokeWidth={2.25} aria-hidden />
                  Angeheftet
                </h2>
                <ul className="flex flex-col gap-2">
                  {pinned.map((n) => (
                    <NoteCard key={n.id} note={n} wide />
                  ))}
                </ul>
              </section>
            )}
            {rest.length > 0 && (
              <section className="flex flex-col gap-2" aria-label="Notizen">
                {pinned.length > 0 && <h2 className={`px-1 ${SECTION_TITLE}`}>Alle Notizen</h2>}
                <ul className="grid grid-cols-2 gap-2">
                  {rest.map((n) => (
                    <NoteCard key={n.id} note={n} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        <p className="px-1 text-center text-sm text-muted">Sag einfach: „Merk dir …“ – {name} legt es hier ab.</p>
      </main>
      {choose && (
        <Sheet title="Neu" onClose={() => setChoose(false)}>
          <div className={`${CARD} mb-2 flex flex-col divide-y divide-line overflow-hidden`}>
            <Link href="/notizen/bearbeiten?neu=text" className="flex h-14 items-center gap-3 px-4 text-base font-semibold active:bg-fill">
              <NotebookPen className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
              Notiz
            </Link>
            <Link href="/notizen/bearbeiten?neu=liste" className="flex h-14 items-center gap-3 px-4 text-base font-semibold active:bg-fill">
              <ListChecks className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
              Liste
            </Link>
          </div>
        </Sheet>
      )}
    </>
  );
}
