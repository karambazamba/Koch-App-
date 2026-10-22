"use client";

// /profil/kalender, zweiter Teil: dauerhaft verbinden per Kalender-Link (nur
// lesen). Kurze Schritt-für-Schritt-Anleitung für Google und Apple, Link
// einfügen → „Verbinden“ (der Server ruft ab, prüft und liefert die Termine).
// Je Kalender: Farbe (antippen = nächste), Name, Familie/Arbeit, an/aus,
// entfernen (mit Rückgängig). Der Link bleibt auf diesem Gerät.

import { useState } from "react";
import { Copy, Link2, RefreshCw, Settings2, Share2, ToggleRight } from "lucide-react";
import { CARD, INPUT, LABEL, NOTE, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import type { Room } from "@/lib/core/entries";
import { showDeleted, showToast } from "@/lib/core/toast";
import { plural } from "@/lib/core/text";
import { AVATAR_COLORS, avatarHex } from "@/lib/einstellungen/profileHelper";
import { removeAbo, updateAbo, useAbos } from "@/lib/kalender/abo/store";
import { addAbo, refreshAbos } from "@/lib/kalender/abo/sync";
import type { Abo } from "@/lib/kalender/abo/model";

const STEPS = {
  google: [
    { icon: Settings2, text: "calendar.google.com am Computer → Zahnrad → Einstellungen" },
    { icon: Link2, text: "Links den Kalender wählen → „Kalender integrieren“" },
    { icon: Copy, text: "„Geheime Adresse im iCal-Format“ kopieren und hier einfügen" },
  ],
  apple: [
    { icon: Settings2, text: "Kalender-App → unten „Kalender“ → ⓘ neben dem Kalender" },
    { icon: ToggleRight, text: "„Öffentlicher Kalender“ einschalten" },
    { icon: Share2, text: "„Link teilen …“ → Kopieren und hier einfügen (webcal://…)" },
  ],
};

function RoomChips({ value, onChange, label }: { value: Room; onChange: (r: Room) => void; label: string }) {
  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {(["familie", "arbeit"] as const).map((r) => (
        <button key={r} type="button" aria-pressed={value === r} onClick={() => onChange(r)} className={chipClass(value === r)}>
          {r === "familie" ? "Familie" : "Arbeit"}
        </button>
      ))}
    </div>
  );
}

function AboRow({ abo }: { abo: Abo }) {
  const next = AVATAR_COLORS[(AVATAR_COLORS.findIndex((c) => c.id === abo.color) + 1) % AVATAR_COLORS.length].id;
  return (
    <li className="flex flex-col gap-2 px-4 py-3" data-abo={abo.name}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => updateAbo(abo.id, { color: next })} aria-label={`Farbe von ${abo.name} wechseln`} className="hit flex h-11 w-11 shrink-0 items-center justify-center">
          <span className="h-5 w-5 rounded-full" style={{ backgroundColor: avatarHex(abo.color) }} aria-hidden />
        </button>
        <input value={abo.name} maxLength={40} onChange={(e) => updateAbo(abo.id, { name: e.target.value })} aria-label="Name des Kalenders" className="h-11 min-w-0 flex-1 bg-transparent text-base font-bold outline-none" />
        <input type="checkbox" role="switch" checked={abo.on} onChange={(e) => updateAbo(abo.id, { on: e.target.checked })} aria-label={`${abo.name} zeigen`} className="h-6 w-6 shrink-0 accent-accent" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pl-14">
        <RoomChips value={abo.raum} onChange={(raum) => updateAbo(abo.id, { raum })} label={`Raum für ${abo.name}`} />
        <button type="button" onClick={() => showDeleted(removeAbo(abo.id))} className="hit h-11 px-2 text-sm font-semibold text-muted underline">
          Entfernen
        </button>
      </div>
      {abo.error && <p className={`${NOTE} ml-14`}>{abo.error}</p>}
    </li>
  );
}

export function AboSection() {
  const abos = useAbos() ?? [];
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [raum, setRaum] = useState<Room>("familie");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [how, setHow] = useState<"google" | "apple">("google");

  const connect = async () => {
    setBusy(true);
    setError("");
    const result = await addAbo({ url, name, raum });
    setBusy(false);
    if ("error" in result) return setError(result.error);
    showToast({ text: `Verbunden – ${plural(result.count, "Termin", "Termine")}`, small: true, seconds: 3 });
    setOpen(false);
    setUrl("");
    setName("");
  };

  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Dauerhaft verbinden">
      <h2 className={SECTION_TITLE}>Dauerhaft verbinden – per Link</h2>
      <p className="text-[15px] text-muted">Termine aus Google oder Apple erscheinen hier und bleiben aktuell. Nur lesen – ändern geht im Original.</p>
      {abos.length > 0 && (
        <>
          <ul className="-mx-4 flex flex-col divide-y divide-line border-y border-line" aria-label="Verbundene Kalender">
            {abos.map((a) => (
              <AboRow key={a.id} abo={a} />
            ))}
          </ul>
          <button type="button" onClick={() => void refreshAbos(true)} className="hit inline-flex h-11 items-center gap-2 self-start text-sm font-semibold text-accent-strong">
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Jetzt aktualisieren
          </button>
        </>
      )}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={`${buttonClass("secondary")} w-full`}>
          <Link2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Kalender verbinden
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2" role="group" aria-label="Anleitung">
            {(["google", "apple"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={how === k} onClick={() => setHow(k)} className={chipClass(how === k)}>
                {k === "google" ? "Google" : "Apple"}
              </button>
            ))}
          </div>
          <ol className="flex flex-col gap-2">
            {STEPS[how].map((s, i) => (
              <li key={s.text} className="flex items-start gap-3 text-[15px]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong" aria-hidden>
                  <s.icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <span className="pt-1">
                  <b>{i + 1}.</b> {s.text}
                </span>
              </li>
            ))}
          </ol>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Kalender-Link</span>
            <input type="url" inputMode="url" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… oder webcal://…" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Name (sonst wie im Original)</span>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="z. B. Fußballverein" className={INPUT} />
          </label>
          <RoomChips value={raum} onChange={setRaum} label="Raum für den neuen Kalender" />
          {error && <p className={NOTE}>{error}</p>}
          <button type="button" onClick={() => void connect()} disabled={busy || !url.trim()} className={`${buttonClass("primary")} w-full disabled:opacity-50`}>
            {busy ? "Verbinde …" : "Verbinden"}
          </button>
          <p className="text-sm text-muted">Der Link ist geheim: Er bleibt auf diesem Handy und kommt nur auf Wunsch mit in die Sicherung.</p>
        </div>
      )}
    </section>
  );
}
