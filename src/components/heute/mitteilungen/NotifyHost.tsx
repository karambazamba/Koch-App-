"use client";

// Mitteilungen im Hintergrund der App (Tafel 77):
// 1. Mias Frage im passenden Moment („Soll ich dich erinnern?“ – „Ja, gern“ /
//    „Lieber nicht“), erst nach „Ja, gern“ die Systemabfrage. Im Safari-Tab
//    auf dem iPhone statt Abfrage die Homescreen-Anleitung.
// 2. Solange die App offen ist: fällige Erinnerungen als Mitteilung (wenn
//    erlaubt). Ohne Erlaubnis bleibt es bei der Jetzt-Karte – nichts geht verloren.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { now, nowIso, todayIso } from "@/lib/core/now";
import { loadEntries } from "@/lib/kalender/store";
import { loadRoutine } from "@/lib/heute/tagesablauf";
import { pushAllowed } from "@/lib/heute/push";
import { loadProfile } from "@/lib/einstellungen/profileStore";
import { helperName } from "@/lib/einstellungen/profile";
import { askDecision, changeNotify, loadNotify, useNotify, type AskMoment } from "@/lib/heute/mitteilungen/einstellungen";
import { aboAuffrischen } from "@/lib/heute/mitteilungen/pushPruefen";
import { pauseOn, remindersToSend } from "@/lib/heute/mitteilungen/erinnerungen";
import { loadSport } from "@/lib/sport/store";
import { proaktivHeute, sportVorabend } from "@/lib/sport/erinnerung";
import { iosTab, notifyPermission, onAskForNotifications, showNotify } from "@/lib/heute/mitteilungen/geraet";

const NotifyAsk = dynamic(() => import("@/components/heute/mitteilungen/NotifyAsk").then((m) => m.NotifyAsk), { ssr: false });

const TICK_MS = 30_000;

async function tick() {
  if (notifyPermission() !== "granted") return;
  const s = loadNotify();
  const profile = loadProfile();
  const today = todayIso();
  const at = now();
  const minute = at.getHours() * 60 + at.getMinutes();
  const routine = loadRoutine();
  const due = remindersToSend(loadEntries(), {
    today,
    minute,
    sent: s.sent,
    on: s.kinds.erinnerungen,
    paused: pauseOn(profile?.pause, today),
    allowed: (m) => pushAllowed({ kind: m.kind, minutes: minute, routine, workEnd: null, paused: false, proactiveSentToday: false }),
  });
  // Sport: Erinnerung am Vorabend (Schalter im Sport-Menü, Standard aus) – proaktiv, höchstens 1 am Tag
  const paused = pauseOn(profile?.pause, today);
  const sport = sportVorabend(loadSport(), loadEntries(), {
    today,
    minute,
    me: profile?.persons[0]?.id ?? null,
    sent: s.sent,
    allowed: () => pushAllowed({ kind: "proaktiv", minutes: minute, routine, workEnd: null, paused, proactiveSentToday: proaktivHeute(s.sent, today) }),
  });
  if (!due.length && !sport) return;
  const name = helperName(profile ?? null);
  const sent: string[] = [];
  for (const m of due) if (await showNotify(name, m.body, m.href, `erinnerung:${m.key}`)) sent.push(`${m.key}#${m.date}`);
  if (sport && (await showNotify(name, sport.body, sport.href, sport.key))) sent.push(sport.key);
  if (sent.length) changeNotify((x) => ({ ...x, sent: [...x.sent, ...sent].slice(-200) }));
}

/** Abo beim Server auffrischen (Einstellungen, Pause, Tagesablauf) */
const syncServer = () => void aboAuffrischen();

export function NotifyHost() {
  const notify = useNotify();
  useEffect(() => {
    if (!notify) return;
    const t = window.setTimeout(syncServer, 1500);
    return () => window.clearTimeout(t);
  }, [notify]);
  const [ask, setAsk] = useState<{ moment: AskMoment; kind: "frage" | "homescreen" } | null>(null);
  useEffect(
    () =>
      onAskForNotifications((moment) => {
        const kind = askDecision(loadNotify(), notifyPermission(), { today: todayIso(), iosTab: iosTab(), demo: false, firstStart: false });
        if (!kind) return;
        changeNotify((s) => ({ ...s, askedAt: nowIso(), asks: s.asks + 1 }));
        setAsk({ moment, kind });
      }),
    [],
  );
  useEffect(() => {
    void tick();
    const t = window.setInterval(() => void tick(), TICK_MS);
    return () => window.clearInterval(t);
  }, []);
  return ask ? <NotifyAsk moment={ask.moment} kind={ask.kind} onClose={() => setAsk(null)} /> : null;
}
