"use client";

// „Neuer Zettel“ (Tafel 106/3): oben die Vorschau als echter Zettel
// (Personenfarbe, Magnet), der Text wird direkt darauf geschrieben
// (mehrzeilig, Return = neue Zeile). Darunter die Art „Zettel /
// Sprachnachricht / Foto“, die Farbe (5 Kreise, die eigene vorgewählt),
// „Anheften“ (Pin) und der große Knopf „Anpinnen“. Foto: Kamera oder Galerie,
// vor dem Speichern verkleinert (1600 px, JPEG). Sprachnachricht: Mikro
// antippen, sprechen, ➤ sendet (dann schließt das Fenster). Antworten tragen
// den Bezug „↪ Lisa“. Der Zettel ist immer für alle im Haushalt – darum
// gibt es dafür keinen Schalter.

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Images, Pin } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { MehrzeilenFeld } from "@/components/ui/MehrzeilenFeld";
import { buttonClass } from "@/components/ui/styles";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { PIN_MAX, FARB_NAMEN, formatDauer, ZETTEL_FARBEN, addPin, changePins, createPin, magnetOf, personFarbe, zettelTon, type PinQuote, type ZettelFarbe } from "@/lib/pinnwand";
import { fotoStore } from "@/lib/pinnwand/fotoStore";
import { cloudSync } from "@/lib/konten/cache";
import { askForNotifications } from "@/lib/heute/mitteilungen/geraet";
import { buzz } from "@/components/heute/actions";
import { Magnet } from "@/components/pinnwand/Magnet";
import { MemoMic, MemoNote, RecordingRow } from "@/components/pinnwand/MemoParts";
import { useCanRecordMemo, useMemoRecorder } from "@/components/pinnwand/useMemoRecorder";
import { verkleinern, type KleinesFoto } from "@/components/pinnwand/fotoVerkleinern";

export type ZettelArt = "zettel" | "memo" | "foto";

type Props = { me: string; household: string[]; karo: boolean; onClose: () => void; quote?: PinQuote | null; art?: ZettelArt; initialText?: string };

export function NeuerZettel({ me, household, karo, onClose, quote = null, art: startArt = "zettel", initialText = "" }: Props) {
  const [art, setArt] = useState<ZettelArt>(startArt);
  const [text, setText] = useState(initialText.slice(0, PIN_MAX));
  const [farbe, setFarbe] = useState<ZettelFarbe>(personFarbe(me, household));
  const [pinned, setPinned] = useState(false);
  const [foto, setFoto] = useState<(KleinesFoto & { url: string }) | null>(null);
  const [fotoNote, setFotoNote] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const recorder = useMemoRecorder({ me, farbe, onSent: () => onClose() });
  const canRecord = useCanRecordMemo();
  const tone = zettelTon(farbe);
  const papier = art === "memo" ? "memo" : art === "foto" ? "foto" : karo ? "karo" : "zettel";

  useEffect(() => () => void (foto && URL.revokeObjectURL(foto.url)), [foto]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setFotoNote("Einen Moment …");
    const small = await verkleinern(file);
    setFotoNote(small ? null : "Das Foto ließ sich nicht lesen. Nochmal?");
    if (small) setFoto({ ...small, url: URL.createObjectURL(small.blob) });
  };

  const ready = art === "foto" ? Boolean(foto) : Boolean(text.trim());
  const save = async () => {
    if (!ready || art === "memo") return;
    const pin = createPin(text, me, quote, { farbe, papier: karo ? "karo" : "zettel", pinned, foto: art === "foto" && foto ? { path: null, w: foto.w, h: foto.h } : null });
    if (!pin) return;
    if (art === "foto" && foto) await fotoStore.save(pin.id, foto.blob);
    const undo = pushUndo("den Zettel", changePins((all) => addPin(all, pin)));
    buzz();
    showToast({ text: "Angepinnt", undo, undoneText: "Abgenommen", seconds: 4, small: true });
    if (cloudSync()) askForNotifications("pinnwand");
    onClose();
  };

  return (
    <Sheet title={quote ? `Antwort an ${quote.author}` : "Neuer Zettel"} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        {/* Vorschau = der echte Zettel */}
        <div className="px-3 pt-3">
          <div className={`zettel relative ${papier === "karo" ? "zettel-karo" : papier === "zettel" ? "" : papier === "memo" ? "zettel-papier zettel-bon" : "zettel-papier p-2"}`} style={{ ["--kippen" as string]: "-1deg", ...(papier === "zettel" ? { background: tone.bg } : {}) }}>
            <span className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2">
              <Magnet form={magnetOf(papier, pinned)} color={tone.mag} size={26} />
            </span>
            <div className={`flex min-h-[150px] flex-col gap-2 ${papier === "foto" ? "" : "px-4 pb-4 pt-6"}`}>
              {quote && <span className="text-[13px] font-bold text-fridge-soft">↪ {quote.author}</span>}
              {art === "memo" ? (
                <>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fridge-soft">Sprachnachricht</span>
                  {!canRecord ? (
                    <p className="text-[15px] text-fridge-soft">Auf diesem Gerät geht keine Aufnahme.</p>
                  ) : recorder.phase === "idle" || recorder.holding ? (
                    // Beim Halten bleibt das Mikro unter dem Finger stehen (sonst kommt das Loslassen nie an)
                    <div className="flex flex-1 flex-col items-center justify-center gap-2">
                      <MemoMic recorder={recorder} size={56} />
                      <span className="text-center text-[14px] font-semibold text-fridge-soft" role="status">
                        {recorder.holding ? `${formatDauer(recorder.elapsed / 1000)} · Loslassen = senden · nach oben schieben = frei sprechen` : "Antippen und sprechen"}
                      </span>
                    </div>
                  ) : (
                    <RecordingRow recorder={recorder} />
                  )}
                  <MemoNote text={recorder.note} onResend={recorder.unsent ? recorder.resend : undefined} />
                </>
              ) : (
                <>
                  {art === "foto" &&
                    (foto ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Vorschau vom Gerät (Blob-Adresse)
                      <img src={foto.url} alt="Vorschau" className="block max-h-56 w-full object-cover" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => camera.current?.click()} className={buttonClass("secondary")}>
                          <Camera className="h-5 w-5" strokeWidth={2} aria-hidden /> Kamera
                        </button>
                        <button type="button" onClick={() => gallery.current?.click()} className={buttonClass("secondary")}>
                          <Images className="h-5 w-5" strokeWidth={2} aria-hidden /> Galerie
                        </button>
                      </div>
                    ))}
                  {fotoNote && art === "foto" && <p className="px-1 text-[13px] text-fridge-soft" role="status">{fotoNote}</p>}
                  <MehrzeilenFeld
                    voll
                    value={text}
                    onChange={(t) => setText(t.slice(0, PIN_MAX))}
                    label={art === "foto" ? "Zeile unter dem Foto" : "Text auf dem Zettel"}
                    placeholder={art === "foto" ? "Zeile darunter (wenn du magst)" : "z. B. Bin um 18 Uhr zurück"}
                    autoFocus={art === "zettel"}
                    className={`font-bold text-fridge-ink placeholder:text-fridge-soft ${art === "foto" ? "px-1 text-[16px]" : "text-[19px]"}`}
                  />
                </>
              )}
            </div>
          </div>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />

        <Segmented<ZettelArt>
          label="Art"
          value={art}
          onChange={setArt}
          options={[
            { value: "zettel", label: "Zettel" },
            { value: "memo", label: "Sprachnachricht" },
            { value: "foto", label: "Foto" },
          ]}
        />

        <div className="flex items-center gap-3" role="radiogroup" aria-label="Farbe">
          <span className="w-12 text-[15px] font-semibold text-muted">Farbe</span>
          {Array.from({ length: ZETTEL_FARBEN }, (_, i) => i as ZettelFarbe).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={farbe === f}
              aria-label={FARB_NAMEN[f]}
              onClick={() => setFarbe(f)}
              className="hit flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: zettelTon(f).bg, boxShadow: farbe === f ? `0 0 0 2px var(--app-surface), 0 0 0 4px ${zettelTon(f).mag}` : "inset 0 0 0 1px var(--app-line)" }}
            >
              {farbe === f && <Check className="h-4 w-4 text-fridge-ink" strokeWidth={3} aria-hidden />}
            </button>
          ))}
        </div>

        {art !== "memo" && (
          <>
            <button type="button" aria-pressed={pinned} onClick={() => setPinned((p) => !p)} className={`${buttonClass("secondary")} ${pinned ? "border-accent text-accent-strong" : ""}`}>
              <Pin className="h-5 w-5" strokeWidth={2} aria-hidden /> {pinned ? "Wird angeheftet" : "Anheften"}
            </button>
            <button type="button" disabled={!ready} onClick={() => void save()} className={buttonClass("primary")}>
              Anpinnen
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
