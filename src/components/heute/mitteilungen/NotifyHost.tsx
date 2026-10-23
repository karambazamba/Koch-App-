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
import { askDecision, changeNotify, loadNotify, type AskMoment } from "@/lib/heute/mitteilungen/einstellungen";
import { pauseOn, remindersToSend } from "@/lib/heute/mitteilungen/erinnerungen";
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
  if (!due.length) return;
  const name = helperName(profile ?? null);
  const sent: string[] = [];
  for (const m of due) if (await showNotify(name, m.body, m.href, `erinnerung:${m.key}`)) sent.push(`${m.key}#${m.date}`);
  if (sent.length) changeNotify((x) => ({ ...x, sent: [...x.sent, ...sent].slice(-200) }));
}

export function NotifyHost() {
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
