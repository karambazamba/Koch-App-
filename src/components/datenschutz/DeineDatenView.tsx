"use client";

// Einstellungen → „Deine Daten“ (Platz 23): „Kurz gesagt“, Einwilligungen
// ansehen und widerrufen (wirkt sofort), Daten mitnehmen und Konto löschen
// (unter Daten & App), „Auf diesem Gerät löschen“ mit klarer Bestätigung,
// Kontakt für Datenschutzfragen.

import { useState } from "react";
import { Bell, Brain, Database, FileText, Forward, ShieldCheck, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CARD, PAGE_MAIN, SECTION_TITLE } from "@/components/ui/styles";
import { Group, Row, SwitchRow } from "@/components/einstellungen/settings/SettingsParts";
import { RechtLinks } from "@/components/datenschutz/RechtstextView";
import { wipeDevice } from "@/lib/core/localStore";
import { setFeature, useFeature } from "@/lib/core/features";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { BETREIBER, KURZ_GESAGT } from "@/lib/datenschutz/rechtstexte";
import { setEinwilligung, useEinwilligungen } from "@/lib/datenschutz/einwilligung";

const datum = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" }) : "");

export function DeineDatenView() {
  const name = helperName(useProfile() ?? null);
  const einw = useEinwilligungen();
  const mailsOn = useFeature("mails");
  const [wipe, setWipe] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Deine Daten" backHref="/profil" />
      <main className={PAGE_MAIN}>
        <section className="flex flex-col gap-2" aria-label="So schützen wir eure Daten">
          <h2 className={`px-1 ${SECTION_TITLE}`}>So schützen wir eure Daten</h2>
          <ul className="flex flex-col gap-2">
            {KURZ_GESAGT.map((k) => (
              <li key={k.titel} className={`${CARD} px-4 py-3`}>
                <p className="text-[15px] font-bold">{k.titel}</p>
                <p className="text-[15px] text-muted">{k.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <Group title="Deine Einwilligungen">
          <SwitchRow icon={Brain} title={`${name} darf mitdenken (KI)`} hint={einw.erteilt("ki") ? `Erlaubt seit ${datum(einw.stand.ki?.at)}` : "Aus: ohne KI, nur das, was direkt auf dem Gerät geht"} checked={einw.erteilt("ki")} onChange={(on) => setEinwilligung("ki", on)} />
          {mailsOn && (
            <SwitchRow
              icon={Forward}
              title={`Mails an ${name}`}
              hint="Aus: keine Vorschläge mehr aus weitergeleiteten Mails"
              checked={einw.erteilt("mails")}
              onChange={(on) => {
                setEinwilligung("mails", on);
                if (!on) setFeature("mails", false);
              }}
            />
          )}
          <Row href="/profil/mitteilungen" icon={Bell} title="Mitteilungen">
            Erinnerungen an- und ausschalten
          </Row>
          {einw.stand.bedingungen && (
            <Row href="/nutzungsbedingungen" icon={FileText} title="Bedingungen" value={datum(einw.stand.bedingungen.at)}>
              Beim Anmelden zugestimmt
            </Row>
          )}
        </Group>

        <Group title="Mitnehmen und löschen">
          <Row href="/profil/daten" icon={Database} title="Daten & App">
            Daten herunterladen, Konto löschen
          </Row>
          <Row onClick={() => setWipe(true)} icon={Smartphone} title="Auf diesem Gerät löschen">
            Alles, was auf diesem Handy gespeichert ist
          </Row>
        </Group>

        <p className="flex items-start gap-2 px-1 text-sm text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
          Fragen zum Datenschutz: {BETREIBER.mail}
        </p>
        <RechtLinks />
        {wipe && (
          <ConfirmDialog
            title="Alles auf diesem Gerät löschen?"
            text="Termine, Listen, Profil und Einstellungen auf diesem Handy sind dann weg. Mit Konto bleibt, was die Familie teilt, auf dem Server. Vorher sichern geht unter Daten & App."
            confirmLabel="Löschen"
            danger
            onCancel={() => setWipe(false)}
            onConfirm={() => {
              setWipe(false);
              void wipeDevice().then(() => window.location.replace("/"));
            }}
          />
        )}
      </main>
    </div>
  );
}
