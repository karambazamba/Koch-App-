"use client";
import type { Idea } from "@/lib/essen/ideas";
import { type CardIdea } from "./IdeaCards";

/** Idee (heute) → Karte; Wünsche zeigen, wer sich's wünscht */
export const ideaCard = (idea: Idea): CardIdea => ({
  id: idea.id,
  title: idea.title,
  category: idea.category,
  minutes: idea.minutes,
  recipeId: idea.recipeId,
  needs: idea.needs,
  note: idea.wishId ? idea.reason : undefined,
});
