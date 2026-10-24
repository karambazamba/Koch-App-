"use client";

// /mails „Aus euren Mails“: je weitergeleiteter Mail eine Karte – Absender
// (nur Domain), Betreff, kurzer Auszug, darunter die Vorschläge zum An- und
// Abwählen. „Übernehmen“ trägt ein (mit Rückgängig), „Verwerfen“ räumt weg.
// Gmail-/Outlook-Code zum Bestätigen der Weiterleitung groß zum Kopieren.
// Ganz oben höchstens EINE Frage: „Von der Kita kommt öfter was …“.

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, SUBTLE, buttonClass } from "@/components/ui/styles";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { todayIso } from "@/lib/core/now";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { dayWord } from "@/lib/core/schnelleingabe";
import { acceptMail, decideSender, dropMail, senderToAsk, useMails } from "@/lib/mails/konto";
import { frageText } from "@/lib/mails/lernen";
import type { MailEintrag, MailVorschlag } from "@/lib/mails/vorschlag";

/** „Laternenumzug · Fr, 30. Okt 17 Uhr · Schlosspark“ */
function label(v: MailVorschlag, today: string): { what: string; title: string; detail: string } {
  if (v.kind === "einkauf") return { what: "Einkauf", title: v.name, detail: "auf die Liste" };
  if (v.kind === "termin") return { what: "Termin", title: v.title, detail: [`${dayWord(v.date, today)}${v.start ? ` ${v.start.replace(/^0(\d)/, "$1").replace(/:00$/, "")} Uhr` : ""}`, v.place].filter(Boolean).join(" · ") };
  const day = v.due ?? v.date;
  return { what: "Aufgabe", title: v.title, detail: day ? `${v.due ? "bis " : ""}${dayWord(day, today)}` : "irgendwann" };
}

function MailCard({ item, week }: { item: MailEintrag; week: string | null }) {
  const today = todayIso();
  const [off, setOff] = useState<number[]>([]);
  const chosen = item.vorschlaege.filter((_, i) => !off.includes(i));
  const take = async () => {
    if (!week) return;
    const r = await acceptMail(item, chosen, week);
    if (!r.titles.length) return;
    const text = `Eingetragen: ${r.titles.join(", ")}`;
    showToast({ text, undo: pushUndo(text, r.undo), undoneText: "Wieder weg", seconds: 4, small: true });
  };
  if (item.confirmation) {
    const code = item.confirmation.code;
    return (
      <article className={`${CARD} flex flex-col gap-3 p-4`} aria-label={`${item.confirmation.anbieter}-Code`}>
        <p className={SUBTLE}>{item.confirmation.anbieter} möchte die Weiterleitung bestätigen</p>
        <p className="select-all text-[28px] font-extrabold tracking-wide">{code}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(code).catch(() => {});
              showToast({ text: "Code kopiert", small: true, seconds: 2 });
            }}
            className={buttonClass("primary")}
          >
            <Copy className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Kopieren
          </button>
          <button type="button" onClick={() => void dropMail(item.id)} className={buttonClass("secondary")}>
            Erledigt
          </button>
        </div>
      </article>
    );
  }
  return (
    <article className={`${CARD} flex flex-col gap-3 p-4`} aria-label={item.subject || "Mail"}>
      <div className="min-w-0">
        <p className={SUBTLE}>{item.senderDomain || "Weitergeleitet"}</p>
        <p className="text-[17px] font-bold">{item.subject || "Ohne Betreff"}</p>
        {item.excerpt && <p className="mt-1 line-clamp-3 text-[15px] text-muted">{item.excerpt}</p>}
        {item.attachments.length > 0 && <p className={`mt-1 ${SUBTLE}`}>Anhang: {item.attachments.join(", ")}</p>}
      </div>
      {item.vorschlaege.length ? (
        <>
          <ul className="flex flex-col gap-1.5" aria-label="Vorschläge">
            {item.vorschlaege.map((v, i) => {
              const l = label(v, today);
              const on = !off.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setOff((o) => (on ? [...o, i] : o.filter((x) => x !== i)))}
                    className="flex min-h-12 w-full items-center gap-3 rounded-field bg-fill px-3 py-2 text-left"
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${on ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"}`}>{on && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{l.title}</span>
                      <span className="block text-sm text-muted">
                        {l.what} · {l.detail}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!chosen.length || !week} onClick={() => void take()} className={buttonClass("primary")}>
              Übernehmen
            </button>
            <button type="button" onClick={() => void dropMail(item.id)} className={buttonClass("secondary")}>
              Verwerfen
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-[15px] text-muted">Angekommen – zum Eintragen war nichts dabei.</p>
          <button type="button" onClick={() => void dropMail(item.id)} className={buttonClass("secondary")}>
            Weg damit
          </button>
        </div>
      )}
    </article>
  );
}

export function MailsView() {
  const { items, senders } = useMails();
  const week = useWeekShoppingList("planning")?.weekStart ?? null;
  const ask = senderToAsk(senders);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Aus euren Mails" backHref="/" />
      <main className={PAGE_MAIN}>
        {ask && (
          <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Frage">
            <p className="text-[15px] font-semibold">{frageText(ask)}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void decideSender(ask, "ja")} className={buttonClass("primary")}>
                Ja, gern
              </button>
              <button type="button" onClick={() => void decideSender(ask, "nein")} className={buttonClass("secondary")}>
                Nein danke
              </button>
            </div>
          </section>
        )}
        {items === null ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : items.length ? (
          items.map((m) => <MailCard key={m.id} item={m} week={week} />)
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-lg font-bold">Hier landet, was ihr weiterleitet.</p>
            <p className="text-[15px] text-muted">Kita, Schule, Verein – ich mache Vorschläge daraus.</p>
            <Link href="/profil/mails-an-mia" className={buttonClass("secondary")}>
              So geht’s
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
