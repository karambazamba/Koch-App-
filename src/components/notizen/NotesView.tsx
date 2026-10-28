"use client";

// Seite "Notizen" (/notizen): oben das Schnellfeld (jede Schnellnotiz wird
// eine eigene Notiz), Filter Alle | Familie | Arbeit (nur mit Arbeit),
// „Angeheftet“ und „Zuletzt“ als weiße Karten in 2 Spalten: fetter Titel,
// 3–4 Zeilen Vorschau (Listen mit Häkchen), Farbpunkt + Datum. Antippen
// öffnet die Notiz; das Seiten-Plus öffnet eine neue leere Notiz.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, PAGE_MAIN, SECTION_TITLE } from "@/components/ui/styles";
import { PagePlus } from "@/components/ui/QuickButton";
import { sortNotes, useNotes, type Note } from "@/lib/notizen";
import { QuickNoteCard } from "@/components/notizen/Schnellnotiz";
import { useWorkRoom } from "@/lib/einstellungen/welcomeStore";
import { useRaumName } from "@/lib/einstellungen/useHaushalt";

type Filter = "alles" | "familie" | "arbeit";

const SHORT = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", timeZone: "Europe/Berlin" });

function NoteCard({ note }: { note: Note }) {
  const raum = useRaumName();
  const items = (note.data.items ?? []).slice(0, 4);
  const text = note.data.text?.trim() ?? "";
  return (
    <li className="min-w-0">
      <Link href={`/notizen/bearbeiten?id=${note.id}`} className={`${CARD} flex h-full min-h-32 flex-col gap-1.5 p-3.5`} aria-label={note.data.title} data-notiz-karte>
        <span className="line-clamp-2 text-[15px] font-bold leading-snug">{note.data.title}</span>
        {note.data.kind === "liste" && items.length > 0 ? (
          <span className="flex flex-col gap-0.5 text-[13px] leading-snug text-ink/80">
            {items.map((i) => (
              <span key={i.id} className={`flex min-w-0 items-center gap-1.5 ${i.done ? "text-muted line-through" : ""}`}>
                {i.done ? <Check className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.75} aria-hidden /> : <Circle className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={2} aria-hidden />}
                <span className="truncate">{i.text}</span>
              </span>
            ))}
          </span>
        ) : (
          text && <span className="line-clamp-4 whitespace-pre-line text-[13px] leading-snug text-ink/80">{text}</span>
        )}
        <span className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted">
          <span className={`h-2 w-2 shrink-0 rounded-full ${note.raum === "arbeit" ? "bg-work" : "bg-accent"}`} aria-label={note.raum === "arbeit" ? "Arbeit" : raum} />
          {SHORT.format(new Date(note.geaendert))}
        </span>
      </Link>
    </li>
  );
}

function Section({ title, notes }: { title: string; notes: Note[] }) {
  if (!notes.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h2 className={`px-1 ${SECTION_TITLE}`}>{title}</h2>
      <ul className="grid grid-cols-2 gap-2">
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} />
        ))}
      </ul>
    </section>
  );
}

export function NotesView() {
  const raum = useRaumName();
  const notes = useNotes();
  const work = useWorkRoom();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("alles");
  const shown = notes ? sortNotes(notes).filter((n) => filter === "alles" || n.raum === filter) : null;
  const hasWork = work || Boolean(notes?.some((n) => n.raum === "arbeit"));
  return (
    <>
      <PageHeader title="Notizen" backHref="/?seite=kalender" action={<PagePlus label="Neue Notiz" onClick={() => router.push("/notizen/bearbeiten?neu=text")} />} />
      <main className={PAGE_MAIN}>
        <QuickNoteCard />
        {hasWork && (
          <Segmented
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "alles", label: "Alle" },
              { value: "familie", label: raum },
              { value: "arbeit", label: "Arbeit" },
            ]}
          />
        )}
        {!shown ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-base text-muted">Hier landet, was du dir merken willst. Sag einfach: ‚Merk dir …‘</p>
        ) : (
          <>
            <Section title="Angeheftet" notes={shown.filter((n) => n.data.pinned)} />
            <Section title="Zuletzt" notes={shown.filter((n) => !n.data.pinned)} />
          </>
        )}
      </main>
    </>
  );
}
