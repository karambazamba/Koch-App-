/**
 * Gesicht des Küchenhelfers: freundlicher weißer Kochtopf mit Dampf – im Stil
 * des App-Icons. "plain" = nur der Topf (z. B. im orangen Knopf), "badge" =
 * auf orangem, abgerundetem Grund (z. B. in der Panel-Kopfzeile).
 */
export function HelperAvatar({ size, variant = "plain" }: { size: number; variant?: "plain" | "badge" }) {
  const face = "#ea580c"; // text-accent-strong
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      {variant === "badge" && <rect width="64" height="64" rx="16" fill="#f97316" />}
      <g transform={variant === "badge" ? "translate(6 6) scale(0.8125)" : undefined}>
        {/* Dampf */}
        <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round">
          <path d="M24 14c-3-3 3-5 0-8" />
          <path d="M32 12c-3-3 3-5 0-8" />
          <path d="M40 14c-3-3 3-5 0-8" />
        </g>
        {/* Topf */}
        <g fill="#fff">
          <rect x="29" y="17" width="6" height="5" rx="2" />
          <rect x="11" y="20" width="42" height="6" rx="3" />
          <path d="M15 25h34v14a12 12 0 0 1-12 12H27a12 12 0 0 1-12-12z" />
          <rect x="7" y="29" width="10" height="5" rx="2.5" />
          <rect x="47" y="29" width="10" height="5" rx="2.5" />
        </g>
        {/* Gesicht */}
        <circle cx="26" cy="35" r="2.4" fill={face} />
        <circle cx="38" cy="35" r="2.4" fill={face} />
        <path d="M27 41c3 3 7 3 10 0" fill="none" stroke={face} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
