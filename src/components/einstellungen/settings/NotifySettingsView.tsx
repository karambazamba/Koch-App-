"use client";

// /profil/mitteilungen (Tafel 77): Status der Erlaubnis (mit Anleitung, wenn
// abgelehnt bzw. im Safari-Tab), Standard-Erinnerung für neue Termine,
// Schalter je Art, Ruhezeit 20–7 Uhr (fest) und Pause. Pro Gerät.

import { useState } from "react";
import { Bell, CalendarClock, HandHelping, Palmtree, Pin, Sunrise } from "lucide-react";
import { CARD, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { REMINDERS } from "@/lib/kalender/model";
import { APP_NAME } from "@/lib/core/app";
import { changeNotify, notifyStatusLabel, NOTIFY_KINDS, useNotify, type NotifyKind, type Permission } from "@/lib/heute/mitteilungen/einstellungen";
import { iosTab, requestNotifyPermission, useNotifyPermission } from "@/lib/heute/mitteilungen/geraet";
import { ChoiceCards, Group, Row, SettingsPage, SwitchRow } from "@/components/einstellungen/settings/SettingsParts";

const ICONS: Record<NotifyKind, typeof Bell> = { erinnerungen: CalendarClock, pinnwand: Pin, abgeben: HandHelping, morgen: Sunrise };

export function NotifySettingsView() {
  const s = useNotify();
  const known = useNotifyPermission();
  const [asked, setPermission] = useState<Permission | null>(null);
  const permission: Permission = asked ?? known ?? "default";
  return (
    <SettingsPage title="Mitteilungen" question="Wann sag ich Bescheid?">
      {(profile) => {
        if (!s) return <div className={`${CARD} h-40 animate-pulse`} />;
        return (
          <>
            <div className={`${CARD} flex flex-col gap-2 p-4`} role="status">
              <p className="flex items-center justify-between gap-3 text-base font-bold">
                <span>Mitteilungen</span>
                <span className="text-sm font-semibold text-muted">{notifyStatusLabel(permission)}</span>
              </p>
              {permission === "default" && (
                <button type="button" onClick={async () => (changeNotify((x) => ({ ...x, answer: "ja" })), setPermission(await requestNotifyPermission()))} className={buttonClass("primary", "md")}>
                  Erlauben
                </button>
              )}
              {permission === "denied" && <p className="text-sm text-muted">Einschalten geht in den Einstellungen des Handys: dort {APP_NAME} wählen, dann „Mitteilungen“ erlauben.</p>}
              {permission === "unsupported" && (
                <p className="text-sm text-muted">{iosTab() ? `Auf dem iPhone geht das, wenn ${APP_NAME} auf dem Home-Bildschirm liegt: Teilen → „Zum Home-Bildschirm“.` : "Dieser Browser kann keine Mitteilungen. Erinnerungen stehen trotzdem oben auf Heute."}</p>
              )}
            </div>

            <h2 className={`mt-2 px-1 ${SECTION_TITLE}`}>Neue Termine erinnern</h2>
            <ChoiceCards label="Standard-Erinnerung" value={s.defaultReminder} onChange={(defaultReminder) => changeNotify((x) => ({ ...x, defaultReminder }))} options={REMINDERS.filter((r) => r.value !== "15").map((r) => ({ value: r.value, label: r.label }))} />

            <Group title="Worüber">
              {NOTIFY_KINDS.map((k) => (
                <SwitchRow key={k.id} icon={ICONS[k.id]} title={k.title} hint={k.hint} checked={s.kinds[k.id]} onChange={(on) => changeNotify((x) => ({ ...x, kinds: { ...x.kinds, [k.id]: on } }))} />
              ))}
            </Group>

            <Group title="Ruhe">
              <Row icon={Bell} title="Ruhezeit" value="20–7 Uhr">
                Dann nur, was du selbst eingestellt hast
              </Row>
              <Row href="/profil/pause" icon={Palmtree} title="Pause" value={profile.pause ? "An" : "Aus"}>
                Im Urlaub absolute Ruhe
              </Row>
            </Group>
          </>
        );
      }}
    </SettingsPage>
  );
}
