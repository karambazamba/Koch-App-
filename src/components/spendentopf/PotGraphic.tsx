// Spendentopf als kleine Zeichnung: goldener Topf mit Münzen. `empty` = blasser
// Topf (Region ohne Topf), `drop` = eine Münze fällt hinein (nach einer Zusage).

export function PotGraphic({ size = 64, empty = false, drop = false }: { size?: number; empty?: boolean; drop?: boolean }) {
  const gold = "var(--app-tile-spendentopf-ac)";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={empty ? "opacity-35" : undefined}>
      {!empty && (
        <g>
          <circle cx="24" cy="20" r="7" fill="#f2c94c" stroke={gold} strokeWidth="1.5" />
          <circle cx="36" cy="16" r="7" fill="#f6d36b" stroke={gold} strokeWidth="1.5" />
          <circle cx="44" cy="22" r="6" fill="#f2c94c" stroke={gold} strokeWidth="1.5" />
        </g>
      )}
      {drop && <circle cx="32" cy="4" r="6" fill="#f6d36b" stroke={gold} strokeWidth="1.5" className="pot-coin" />}
      <path d="M8 26h48l-4 26a8 8 0 0 1-8 7H20a8 8 0 0 1-8-7z" fill={empty ? "none" : gold} stroke={gold} strokeWidth="2.5" strokeDasharray={empty ? "4 3" : undefined} />
      <rect x="4" y="22" width="56" height="7" rx="3.5" fill={empty ? "none" : gold} stroke={gold} strokeWidth="2.5" strokeDasharray={empty ? "4 3" : undefined} />
      {!empty && <path d="M22 40c3 4 17 4 20 0" stroke="rgb(255 255 255 / 0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
