import type { LucideIcon } from "lucide-react";

/** Linien-Icon in einem weichen Akzent-Quadrat (Listen, Kacheln) */
export function IconBadge({ icon: Icon, size = "md", tone = "accent" }: { icon: LucideIcon; size?: "sm" | "md"; tone?: "accent" | "neutral" }) {
  const box = size === "sm" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-xl";
  const colors = tone === "accent" ? "bg-accent-soft text-accent" : "bg-stone-100 text-stone-600";
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${colors}`} aria-hidden>
      <Icon className={size === "sm" ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]"} strokeWidth={2} />
    </span>
  );
}
