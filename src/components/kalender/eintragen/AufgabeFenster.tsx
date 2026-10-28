"use client";

// Das EINE Fenster „Neue Aufgabe“ (Tafel 114, Bild 1–3) – auch zum Ändern
// („Aufgabe“). EIN Feld („Was steht an?“, Tastatur sofort auf), Knopf ↑.
// Return = speichern für heute, Feld leer und auf für die nächste („Steht
// drin · Rückgängig“). Darunter EINE Zeile: Schalter „Familie | Ich | Arbeit“
// (Start = letzte Wahl, nach Feierabend Familie), Glocke (In 1 Std · 16:00 ·
// 18:00 · Morgen früh → Zeile „Erinnern heute 16:00 ✕“) und leise „Mehr ›“
// mit genau drei Zeilen: Ab wann, Wiederholen, An jemanden geben. „Freitag …“
// im Feld wird automatisch „Ab Freitag“ (korrigierbar). Logik rein in
// `lib/kalender/eintragen/`.

import { useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD_LIST, buttonClass } from "@/components/ui/styles";
import { createEntry, type Room } from "@/lib/core/entries";
import { raumWahl } from "@/lib/core/haushalt";
import { berlinTime, todayIso, useMinutes } from "@/lib/core/now";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { useCachedAccount } from "@/lib/konten/cache";
import { giveTargets, giveTo, memberName } from "@/lib/kalender/abgeben/model";
import { loadEntries } from "@/lib/kalender/store";
import { arbeitsWorte } from "@/lib/kalender/parse";
import type { Aufgabe } from "@/lib/kalender/model";
import { looksLikeList, openListe } from "@/lib/kalender/liste/einfuegen";
import { aufgabeDaten, aufgabeHinweis, aufgabeLesen, erinnernText, erinnernVon, glockeVorschlaege, serie, WIEDERHOLEN, wiederholenLabel, wiederholenVon, type Erinnern, type Wiederholen } from "@/lib/kalender/eintragen/aufgabe";
import { raumZumSpeichern, schalterRaum, startRaum } from "@/lib/kalender/eintragen/raum";
import { letzterRaum, raumMerken } from "@/lib/kalender/eintragen/raumStore";
import { tagWahl, tagWort } from "@/lib/kalender/eintragen/tage";
import { useArbeitRuht } from "@/components/kalender/useArbeitRuht";
import { EintragFeld, EintragZeile, ErinnernZeile, HINWEIS, MehrZeile, Wahl } from "@/components/kalender/eintragen/EintragTeile";
import { eintragSpeichern } from "@/components/kalender/eintragen/speichern";

type Auf = "glocke" | null;

export function AufgabeFenster({ entry, date, onClose }: { entry?: Aufgabe; date?: string; onClose: () => void }) {
  const today = todayIso();
  const minutes = useMinutes() ?? berlinTime().minutes;
  const haushalt = useHaushalt();
  const household = useCachedAccount().household;
  const me = household?.me.userId ?? null;
  const targets = household ? giveTargets(household.members, me) : [];
  const [all] = useState(() => loadEntries());
  const worte = useMemo(() => arbeitsWorte(all), [all]);
  const { ruht, feierabend } = useArbeitRuht(all, today);
  const inset = useKeyboardInset();
  const field = useRef<HTMLInputElement>(null);

  const [text, setText] = useState(entry?.data.title ?? "");
  const [hand, setHand] = useState<Room | null>(entry ? entry.raum : null);
  // Von Hand gewählt (null = was der Satz sagt bzw. der Standard)
  const [ab, setAb] = useState<string | null>(entry ? (entry.data.date ?? today) : (date ?? null));
  const [erinnern, setErinnern] = useState<Erinnern | null | undefined>(entry ? erinnernVon(entry.data, today) : undefined);
  const [wieder, setWieder] = useState<Wiederholen>(wiederholenVon(entry?.data.repeat));
  const [an, setAn] = useState<string | null>(null);
  const [auf, setAuf] = useState<Auf>(null);
  const [mehr, setMehr] = useState(false);
  const [mehrZeile, setMehrZeile] = useState<"ab" | "wieder" | "an" | null>(null);

  const gelesen = entry ? null : aufgabeLesen(text, today, worte);
  const title = entry ? text.trim() : (gelesen?.title ?? "");
  const tag = ab ?? gelesen?.ab ?? null;
  const glocke = erinnern === undefined ? (gelesen?.erinnern ?? null) : erinnern;
  const start = startRaum({ letzte: letzterRaum(), feierabend: feierabend || ruht, haushalt });
  const raum = schalterRaum({ hand, ausText: gelesen?.raum ?? null, start, haushalt });
  const bereit = Boolean(title);

  const reset = () => {
    setText("");
    setHand(null);
    setAb(date ?? null);
    setErinnern(undefined);
    setWieder("nie");
    setAn(null);
    setAuf(null);
    setMehr(false);
    setMehrZeile(null);
    field.current?.focus();
  };

  const save = (schliessen: boolean) => {
    if (!bereit) return;
    const data = aufgabeDaten({ title, ab: tag, erinnern: glocke, repeat: serie(wieder, entry?.data.repeat), today, dringend: gelesen?.dringend, label: gelesen?.label, due: gelesen?.due, vorher: entry?.data });
    const gespeichert = raumZumSpeichern(raum, entry?.raum ?? null, haushalt);
    const mitAn = an ? giveTo(data, an) : data;
    const next = entry ? { ...entry, raum: gespeichert, data: mitAn } : createEntry("aufgabe", mitAn, { raum: gespeichert });
    if (!eintragSpeichern([next as Aufgabe], !entry)) return;
    if (!entry) raumMerken(raum);
    if (schliessen || entry) onClose();
    else reset();
  };

  const vorschlaege = glockeVorschlaege(today, minutes);
  return (
    <Sheet title={entry ? "Aufgabe" : "Neue Aufgabe"} onClose={onClose} inset={inset}>
      <form
        className="flex flex-col gap-3 pb-3"
        data-fenster="aufgabe"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <EintragFeld
          ref={field}
          value={text}
          onChange={setText}
          // Eine ganze To-do-Liste eingefügt → „Liste einfügen“ mit Vorschau
          onPaste={(v) => !entry && looksLikeList(v) && (onClose(), openListe(v), true)}
          placeholder="Was steht an?"
          label={entry ? "Aufgabe" : "Neue Aufgabe"}
          bereit={bereit}
        />
        <EintragZeile
          raeume={raumWahl(haushalt)}
          raum={raum}
          haushalt={haushalt}
          onRaum={setHand}
          glockeAn={Boolean(glocke)}
          glockeAuf={auf === "glocke"}
          onGlocke={() => setAuf(auf === "glocke" ? null : "glocke")}
          mehrAuf={mehr}
          onMehr={() => setMehr((v) => !v)}
        />
        {auf === "glocke" && (
          <Wahl
            label="Erinnern um"
            value={glocke ? vorschlaege.find((v) => v.date === glocke.date && v.time === glocke.time)?.id : null}
            options={vorschlaege.map((v) => ({ value: v.id, label: v.label }))}
            onPick={(id) => {
              const v = vorschlaege.find((x) => x.id === id)!;
              setErinnern({ date: v.date, time: v.time });
              setAuf(null);
            }}
          />
        )}
        {glocke && <ErinnernZeile text={erinnernText(glocke, today)} onWeg={() => setErinnern(null)} />}
        {!mehr && <p className={HINWEIS}>{aufgabeHinweis(tag, today)}</p>}
        {mehr && (
          <>
            <div className={CARD_LIST} data-mehr-zeilen>
              <MehrZeile label="Ab wann" wert={tagWort(tag ?? today, today)} auf={mehrZeile === "ab"} onClick={() => setMehrZeile(mehrZeile === "ab" ? null : "ab")}>
                <Wahl label="Ab wann" value={tag ?? today} options={tagWahl(today).map((d) => ({ value: d.iso, label: d.label }))} onPick={(iso) => (setAb(iso), setMehrZeile(null))} />
              </MehrZeile>
              <MehrZeile label="Wiederholen" wert={wiederholenLabel(serie(wieder, entry?.data.repeat))} auf={mehrZeile === "wieder"} onClick={() => setMehrZeile(mehrZeile === "wieder" ? null : "wieder")}>
                <Wahl label="Wiederholen" value={wieder} options={WIEDERHOLEN} onPick={(w) => (setWieder(w), setMehrZeile(null))} />
              </MehrZeile>
              <MehrZeile label="An jemanden geben" wert={(an && household && memberName(household.members, an)) || "Niemand"} auf={mehrZeile === "an"} onClick={() => setMehrZeile(mehrZeile === "an" ? null : "an")}>
                {targets.length ? (
                  <Wahl label="An jemanden geben" value={an ?? "niemand"} options={[{ value: "niemand", label: "Niemand" }, ...targets.map((m) => ({ value: m.userId, label: m.displayName }))]} onPick={(v) => (setAn(v === "niemand" ? null : v), setMehrZeile(null))} />
                ) : (
                  <p className="text-[15px] text-muted">Geht, sobald noch jemand im Haushalt ist.</p>
                )}
              </MehrZeile>
            </div>
            <button type="button" onClick={() => save(true)} aria-disabled={!bereit} className={`${buttonClass("primary")} w-full ${bereit ? "" : "opacity-50"}`}>
              Speichern
            </button>
          </>
        )}
      </form>
    </Sheet>
  );
}
