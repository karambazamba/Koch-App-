"use client";

// Clip „Einer sagt’s, alle wissen’s“ (Einkauf unterwegs): die Antwort aus dem
// Laden („Felix zu Milch: Steh grad davor.“) leise oben in der Liste der
// Person, die es draufgesetzt hat (30 Min.), und der Knopf „Steh grad davor“
// aus der Mitteilung (`/einkaufsliste?davor=<konto>|<sache>`).

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { now } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { useCachedAccount } from "@/lib/konten/cache";
import { answersForMe, answerText, davorFromLink, sendAnswer, useTrips } from "@/lib/einkauf/unterwegs/unterwegs";

export function AntwortZeile() {
  const { household } = useCachedAccount();
  const trips = useTrips();
  const reply = answersForMe(trips, household?.me.userId ?? null, now().getTime())[0];
  if (!reply) return null;
  return (
    <p role="status" data-antwort className="rounded-field bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-strong">
      {answerText(reply.by, reply.was)}
    </p>
  );
}

/** Knopf „Steh grad davor“ aus der Mitteilung: einmal antworten, dann die Adresse säubern */
export function useDavorLink() {
  const router = useRouter();
  const { household } = useCachedAccount();
  const done = useRef(false);
  const me = household?.me.userId ?? null;
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const d = davorFromLink(window.location.search);
    if (!d) return;
    if (sendAnswer(d.an, d.was, me)) showToast({ text: "Gesagt.", small: true });
    router.replace("/einkaufsliste");
  }, [router, me]);
}
