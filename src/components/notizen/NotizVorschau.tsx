// Vorschau der neuesten Notiz in der Notizen-Kachel (A-060, Tafel 144):
// bis zu 2 Zeilen, Umbruch nur an Wortgrenzen (lange Wörter wie Links erst,
// wenn sie allein nicht passen), die zweite Zeile läuft weich aus statt mit
// „…“. Der Verlauf ist eine Maske (`.notiz-ausblenden`): er blendet in genau
// die Kachelfarbe aus – Farbig und Schlicht, hell und dunkel, auch über dem
// Wasserzeichen. `data-ausblenden` sagt der Prüfung „nichts abgeschnitten“,
// dass hier unten weich ausgeblendet werden darf (seitlich nie).

import { Pin } from "lucide-react";
import { notizVorschau, type NotizZeile } from "@/lib/heute/notizenKachel";

export function NotizVorschau({ zeile, gross = false }: { zeile: Pick<NotizZeile, "title" | "line" | "pinned">; /** XS: fett und etwas größer */ gross?: boolean }) {
  const v = notizVorschau(zeile);
  return (
    <span className={`notiz-ausblenden min-w-0 flex-1 break-words ${gross ? "text-[14px] font-bold" : "text-[13.5px]"}`} data-ausblenden data-notiz-vorschau>
      {zeile.pinned && <Pin className="mr-1 inline h-3 w-3 -translate-y-px text-tile-accent" strokeWidth={2.25} aria-hidden />}
      <span className={`kachel-frei ${gross ? "" : "font-semibold"}`}>{v.titel}</span>
      {v.rest && <span className={`kachel-frei text-muted ${gross ? "font-semibold" : ""}`}> · {v.rest}</span>}
    </span>
  );
}
