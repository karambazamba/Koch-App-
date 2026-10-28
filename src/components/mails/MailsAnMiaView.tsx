"use client";

// /profil/mails-an-mia: eure Mia-Adresse (Familie; dazu eine eigene für die
// Arbeit) mit „Kopieren“ und „Adresse ändern“, kurze Anleitung je Postfach,
// gelernte Absender („Automatisch an Mia“) mit fertigem Gmail-Filter. Ohne
// Konto nur ein freundlicher Satz mit dem Weg dorthin.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Download } from "lucide-react";
import { CARD, CARD_LIST, NOTE, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingsPage } from "@/components/einstellungen/settings/SettingsParts";
import type { Room } from "@/lib/core/entries";
import { nowIso } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { useAccount } from "@/lib/konten/account";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { setEinwilligung, useEinwilligungen } from "@/lib/datenschutz/einwilligung";
import { decideSender, mailAddress, useMails } from "@/lib/mails/konto";
import { absenderName, gmailFilterXml, gmailSuche } from "@/lib/mails/lernen";
import { EINZELN, POSTFACH_NAME, automatisch, postfachVon, type Postfach } from "@/lib/mails/anleitung";

const copy = (text: string, done: string) => {
  void navigator.clipboard?.writeText(text).catch(() => {});
  showToast({ text: done, small: true, seconds: 2 });
};

function AddressCard({ room, title }: { room: Room; title: string }) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    let live = true;
    void mailAddress(room).then((r) => {
      if (!live) return;
      if (r.ok) setAddress(r.value);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [room]);
  const renew = async () => {
    setAsking(false);
    const r = await mailAddress(room, true);
    if (r.ok) {
      setAddress(r.value);
      showToast({ text: "Neue Adresse – die alte nimmt nichts mehr an.", small: true, seconds: 3 });
    } else setError(r.error);
  };
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h2 className={`px-1 ${SECTION_TITLE}`}>{title}</h2>
      <div className={`${CARD} flex flex-col gap-3 p-4`}>
        {error ? (
          <p className="text-[15px] text-muted">{error}</p>
        ) : (
          <p className="select-all break-all text-[17px] font-bold" data-testid={`mail-adresse-${room}`}>
            {address ?? "Einen Moment …"}
          </p>
        )}
        {address && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(address, "Adresse kopiert")} className={buttonClass("primary")}>
              <Copy className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Kopieren
            </button>
            <button type="button" onClick={() => setAsking(true)} className={buttonClass("secondary")}>
              Adresse ändern
            </button>
          </div>
        )}
      </div>
      {asking && (
        <ConfirmDialog
          title="Neue Adresse?"
          text="Die alte nimmt dann nichts mehr an. Weiterleitungen bitte auf die neue umstellen."
          confirmLabel="Neue Adresse"
          onConfirm={() => void renew()}
          onCancel={() => setAsking(false)}
        />
      )}
    </section>
  );
}

function Anleitung({ guess }: { guess: Postfach }) {
  const [p, setP] = useState<Postfach>(guess);
  return (
    <section className="flex flex-col gap-2" aria-label="So geht’s">
      <h2 className={`px-1 ${SECTION_TITLE}`}>So geht’s</h2>
      <div className={`${CARD} flex flex-col gap-3 p-4`}>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-[15px]">
          {EINZELN.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="pt-1 text-[15px] font-bold">Automatisch weiterleiten</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Postfach">
          {(Object.keys(POSTFACH_NAME) as Postfach[]).map((x) => (
            <button key={x} type="button" aria-pressed={p === x} onClick={() => setP(x)} className={chipClass(p === x)}>
              {POSTFACH_NAME[x]}
            </button>
          ))}
        </div>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-[15px]">
          {automatisch(p).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Absender({ forward, name }: { forward: string | null; name: string }) {
  const { senders } = useMails();
  const decided = senders.filter((s) => s.decision);
  if (!decided.length) return null;
  const yes = decided.filter((s) => s.decision === "ja" && s.room === "familie").map((s) => s.sender);
  const download = () => {
    if (!forward) return;
    const blob = new Blob([gmailFilterXml(yes, forward, nowIso())], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "filter.xml";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <section className="flex flex-col gap-2" aria-label={`Automatisch an ${name}`}>
      <h2 className={`px-1 ${SECTION_TITLE}`}>Automatisch an {name}</h2>
      <ul className={CARD_LIST}>
        {decided.map((s) => (
          <li key={`${s.room}:${s.sender}`} className="flex min-h-12 items-center gap-3 px-4 py-2">
            <span className="min-w-0 flex-1 text-[15px]">
              {absenderName(s.sender)}
              <span className="block truncate text-sm text-muted">{s.sender}</span>
            </span>
            <button type="button" aria-pressed={s.decision === "ja"} onClick={() => void decideSender(s, s.decision === "ja" ? "nein" : "ja")} className={chipClass(s.decision === "ja")}>
              {s.decision === "ja" ? "Ja" : "Nein"}
            </button>
          </li>
        ))}
      </ul>
      {yes.length > 0 && (
        <div className={`${CARD} flex flex-col gap-2 p-4`}>
          <p className="text-sm text-muted">Gmail-Suche für den Filter</p>
          <p className="select-all break-all text-[15px] font-semibold">{gmailSuche(yes)}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(gmailSuche(yes), "Kopiert")} className={buttonClass("secondary")}>
              <Copy className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Kopieren
            </button>
            {forward && (
              <button type="button" onClick={download} className={buttonClass("secondary")}>
                <Download className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Filter-Datei
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function MailsAnMiaView() {
  const account = useAccount();
  const [forward, setForward] = useState<string | null>(null);
  const ready = Boolean(account.user && account.household);
  const adult = account.household?.me.role === "erwachsener";
  const name = helperName(useProfile() ?? null);
  const consent = useEinwilligungen().erteilt("mails");
  useEffect(() => {
    if (ready && adult && consent) void mailAddress("familie").then((r) => r.ok && setForward(r.value));
  }, [ready, adult, consent]);
  return (
    <SettingsPage title={`Mails an ${name}`} question="Mails einfach an mich weiterleiten" note={false}>
      {() =>
        account.mode === "laedt" ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : !ready ? (
          <>
            <p className="px-1 text-[15px] text-muted">Mit Konto bekommt eure Familie eine eigene Adresse für mich. Was ihr dorthin weiterleitet, wird zu Vorschlägen: Termine, Aufgaben, Einkauf.</p>
            <Link href="/konto" className={`${buttonClass("primary")} w-full`}>
              Zum Konto
            </Link>
          </>
        ) : !consent ? (
          <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Einschalten">
            <p className="text-[15px]">Was ihr weiterleitet, kommt bei unserem Mail-Dienst (Resend) an. Ich speichere nur Absender-Domain, Betreff, einen kurzen Auszug und die Vorschläge, 7 Tage lang. Nie die ganze Mail.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEinwilligung("mails", true)} className={buttonClass("primary")}>
                Erlauben
              </button>
              <Link href="/profil" className={buttonClass("ghost")}>
                Nicht jetzt
              </Link>
            </div>
          </section>
        ) : (
          <>
            {adult && <AddressCard room="familie" title="Für die Familie" />}
            <AddressCard room="arbeit" title="Nur für dich (Geschäftlich)" />
            <Anleitung guess={postfachVon(account.user?.email ?? "")} />
            <Absender forward={forward} name={name} />
            <p className={NOTE}>Ich sehe nur, was ihr weiterleitet – nie euer Postfach. Die Mail selbst speichere ich nicht, nur den Vorschlag. Nach 7 Tagen ist er weg.</p>
          </>
        )
      }
    </SettingsPage>
  );
}
