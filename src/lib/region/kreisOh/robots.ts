// robots.txt beachten (rein): Gruppe für unseren User-Agent, sonst „*“;
// längste passende Regel gewinnt, Allow schlägt Disallow bei gleicher Länge.
// Crawl-delay wird übernommen (mindestens 1 s zwischen zwei Anfragen).

export type Robots = { erlaubt: (pfad: string) => boolean; pauseMs: number };

/** robots.txt lesen; leer/fehlend = alles erlaubt */
export function leseRobots(txt: string | null, agent: string): Robots {
  const gruppen: { agents: string[]; regeln: { allow: boolean; pfad: string }[]; delay: number | null }[] = [];
  let aktuell: (typeof gruppen)[number] | null = null;
  let regelnBegonnen = false;
  for (const zeile of (txt ?? "").split(/\r?\n/)) {
    const [roh, ...rest] = zeile.replace(/#.*/, "").split(":");
    const feld = roh.trim().toLowerCase();
    const wert = rest.join(":").trim();
    if (!feld) continue;
    if (feld === "user-agent") {
      if (!aktuell || regelnBegonnen) {
        aktuell = { agents: [], regeln: [], delay: null };
        gruppen.push(aktuell);
        regelnBegonnen = false;
      }
      aktuell.agents.push(wert.toLowerCase());
    } else if (aktuell && (feld === "allow" || feld === "disallow")) {
      regelnBegonnen = true;
      if (wert) aktuell.regeln.push({ allow: feld === "allow", pfad: wert });
    } else if (aktuell && feld === "crawl-delay") {
      regelnBegonnen = true;
      const s = Number(wert);
      if (Number.isFinite(s) && s >= 0) aktuell.delay = s;
    }
  }
  const name = agent.toLowerCase().split(/[\s/(]/)[0];
  const gruppe = gruppen.find((g) => g.agents.some((a) => a !== "*" && name.startsWith(a))) ?? gruppen.find((g) => g.agents.includes("*")) ?? null;
  const passt = (muster: string, pfad: string) => {
    const re = new RegExp(`^${muster.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
    return re.test(pfad);
  };
  return {
    erlaubt: (pfad) => {
      let best: { allow: boolean; pfad: string } | null = null;
      for (const r of gruppe?.regeln ?? []) {
        if (!passt(r.pfad, pfad)) continue;
        if (!best || r.pfad.length > best.pfad.length || (r.pfad.length === best.pfad.length && r.allow)) best = r;
      }
      return best ? best.allow : true;
    },
    pauseMs: Math.max(1000, Math.min(10_000, (gruppe?.delay ?? 0) * 1000)),
  };
}
