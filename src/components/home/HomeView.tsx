"use client";

import { CARD } from "@/components/ui/styles";
import { useHomeData } from "./useHomeData";
import { HomePager } from "@/components/alltag/HomePager";
import { WelcomeChat } from "@/components/welcome/WelcomeChat";

/**
 * Startseite: drei Seiten Woche · Heute · Essen (HomePager) mit der
 * Lotte-Leiste unten; ohne Profil zuerst das Kennenlernen im Chat.
 */
export function HomeView() {
  const data = useHomeData();
  if (data === undefined) return <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]"><div className={`${CARD} h-52 animate-pulse`} /></main>;
  if (data === null) return <WelcomeChat />;
  return <HomePager data={data} />;
}
