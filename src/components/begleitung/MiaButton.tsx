"use client";

// Der runde Mia-Knopf – sitzt rechts IN der Leiste unten (Tafel 96, `ui/Leiste`)
// und ragt etwas über sie hinaus, auf allen Seiten gleich. Tippen holt die
// Begleitung auf die Bühne (sie hört gleich zu, wenn das Mikro erlaubt ist);
// lange drücken = sofort sprechen, Loslassen = absenden. Beim ersten Mal
// einmal der Hinweis „Schreiben & sprechen“. Von hier fliegt Mia ein und zurück.
// A-056: Hört Mia über den Server zu, läuft das Mikrofon schon in diesem
// Antippen an (Vorlauf, `ohrMikro.ts`) – kein Wort am Anfang geht verloren.
// Der Einmal-Schlüssel fürs Live-Zuhören wird beim Öffnen der App und beim
// Zurückkommen vorgewärmt.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { wakeAvatar } from "@/lib/core/avatarState";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { seitErsterStart } from "@/lib/core/hello";
import { openHelper, releaseHelperVoice } from "@/lib/begleitung/open";
import { serverStimme, serverStimmeJetzt } from "@/lib/begleitung/zugang";
import { micState } from "@/lib/core/mic";
import { vorlaufJetzt } from "@/lib/begleitung/ohrMikro";
import { ohrWeg } from "@/lib/begleitung/ohrWeg";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { miaMomentPruefen, useMiaLook, useMiaMoment } from "@/components/begleitung/useMiaLook";

const LONG_MS = 450;
/** Seiten, auf denen ein Knopf über der Leiste schwebt (Im Haus, Tafel 102) */
const SEITEN_MIT_KNOPF_UEBER_LEISTE = ["/vorrat"];
const HINT_MS = 7000;

/** Nach „Zeig mal“: einmal zwinkern beim ersten Erscheinen, den Hinweis erst nach ein paar ruhigen Sekunden */
const ERSTER_START_RUHE_MS = 4000;

function useErsterStart() {
  const [state] = useState(() => {
    const seit = seitErsterStart();
    return { zwinkern: seit !== null && seit < 10_000, warten: seit === null ? 0 : Math.max(0, ERSTER_START_RUHE_MS - seit) };
  });
  const [ruhig, setRuhig] = useState(state.warten > 0);
  useEffect(() => {
    if (!state.warten) return;
    const t = setTimeout(() => setRuhig(false), state.warten);
    return () => clearTimeout(t);
  }, [state.warten]);
  return { zwinkern: state.zwinkern, ruhig };
}

/** Größe in der Leiste (ragt ca. 30 px über sie hinaus) */
const MIA_PX = 60;

export function MiaButton({ name, links = false }: { name: string; links?: boolean }) {
  const erster = useErsterStart();
  // Auf Seiten mit einem Knopf über der Leiste („Was koch ich daraus?“) wartet die Blase – sie läge darüber
  const ueberLeiste = SEITEN_MIT_KNOPF_UEBER_LEISTE.includes(usePathname() ?? "");
  const hint = useHintSeen("mia-knopf") === false && !erster.ruhig && !ueberLeiste;
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; long: boolean } | null>(null);
  const look = useMiaLook();
  const moment = useMiaMoment(true);
  // Früh wissen, ob Mia über den Server hört und spricht (nur mit KI-Einwilligung) – sonst nähme das erste Zuhören den Browser
  useEffect(() => {
    // Danach den Einmal-Schlüssel vorwärmen (nur mit Live-Ohr) – und beim Zurückkommen in die App
    const warm = () => void import("@/lib/begleitung/stimmeClient").then((m) => m.ohrTokenVorwaermen()).catch(() => {});
    void serverStimme().then((s) => s?.live && warm());
    const sichtbar = () => document.visibilityState === "visible" && serverStimmeJetzt()?.live && warm();
    document.addEventListener("visibilitychange", sichtbar);
    return () => document.removeEventListener("visibilitychange", sichtbar);
  }, []);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => markHintSeen("mia-knopf"), HINT_MS);
    return () => clearTimeout(t);
  }, [hint]);

  const down = () => {
    const timer = setTimeout(() => {
      if (!press.current) return;
      press.current.long = true;
      wakeAvatar();
      openHelper("voice");
    }, LONG_MS);
    press.current = { timer, long: false };
  };
  const up = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    // Lange gedrückt: Loslassen schickt das Gesagte ab
    if (p.long) releaseHelperVoice();
  };

  return (
    <div className="relative flex items-center" data-mia-platz>
      {hint && (
        <span role="note" className={`mia-einblenden absolute bottom-full mb-3 ${links ? "left-0" : "right-0"} whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-[14px] font-bold shadow-float`}>
          Schreiben &amp; sprechen
        </span>
      )}
      <button
        type="button"
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={() => press.current && !press.current.long && (clearTimeout(press.current.timer), (press.current = null))}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          markHintSeen("mia-knopf");
          if (press.current?.long) return;
          wakeAvatar();
          // Mikro erlaubt und Mia hört über den Server: schon jetzt (im Antippen) aufnehmen und puffern
          const m = micState();
          const s = serverStimmeJetzt();
          const erkennung = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
          const weg = s ? ohrWeg({ buehne: true, live: Boolean(s.live), browser: erkennung, aufnahme: s.hoeren }) : "browser";
          if (m.granted && !m.block && (weg === "live" || weg === "aufnahme")) vorlaufJetzt();
          openHelper();
          // Herbstwind: Blätter wehen auf der Bühne an Mia vorbei (höchstens alle 5 Min)
          miaMomentPruefen("antippen");
        }}
        aria-label={`Sag ${name}, was ansteht … (${name} holen)`}
        className={`mia-knopf flex items-center justify-center rounded-full select-none ${erster.zwinkern ? "mia-zwinkern-einmal" : ""}`}
        style={{ width: MIA_PX, height: MIA_PX }}
        data-mia-knopf
        data-moment={moment ?? undefined}
      >
        <BegleitungAvatar size={MIA_PX} groesse="gross" zubehoer={look.zubehoer} blaetter={moment === "blaetter" || moment === "sturm"} stimmung={look.verschlafen ? "verschlafen" : look.ruhig ? "ruhig" : undefined} />
      </button>
    </div>
  );
}
