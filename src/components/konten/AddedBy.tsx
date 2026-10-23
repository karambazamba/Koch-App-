"use client";

// Leises „von Lisa“ an Einträgen anderer im Haushalt (Etappe 3d) – nur mit
// mehreren Personen und nie bei eigenen. Text statt Kreis: der Kreis heißt
// bei Terminen schon „für wen“.

import { useCachedAccount } from "@/lib/konten/cache";
import { addedBy } from "@/lib/konten/wer";

export function AddedBy({ owner, className = "" }: { owner: unknown; className?: string }) {
  const { household } = useCachedAccount();
  const who = household ? addedBy(owner, household.members, household.me.userId) : null;
  if (!who) return null;
  return <span className={`shrink-0 text-sm text-muted ${className}`}>von {who.name}</span>;
}
