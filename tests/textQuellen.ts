// Hilfe für die Regel-Tests: alle Quelltexte und die darin sichtbaren Texte
// (String-Literale und JSX-Text, ohne Kommentare und ohne Importe).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(__dirname, "../src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

export const SOURCES = walk(SRC).map((p) => ({ file: relative(SRC, p), code: readFileSync(p, "utf8") }));

/** Kommentare entfernen (Zeilen- und Blockkommentare, nicht in Strings – grob, reicht für unseren Stil) */
export function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** Sichtbare Texte einer Datei: String-Literale und JSX-Text (ohne Import-Pfade) */
export function texts(code: string): string[] {
  const c = stripComments(code).replace(/^\s*(import|export)\s[^;]*from\s+["'][^"']+["'];?/gm, "");
  const out: string[] = [];
  for (const m of c.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  for (const m of c.matchAll(/>([^<>{}]*[A-Za-zÄÖÜäöüß][^<>{}]*)</g)) out.push(m[1]);
  return out.filter((t) => /[A-Za-zÄÖÜäöüß]{2}/.test(t));
}
