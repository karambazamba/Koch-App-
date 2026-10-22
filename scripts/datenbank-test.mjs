// npm run test:datenbank – Migrationen und Row Level Security echt prüfen:
// frische Postgres-Datenbank (lokal, temporär), Supabase-Nachbau
// (tests/datenbank/supabase-nachbau.sql), alle Migrationen aus
// supabase/migrations, dann jede Datei tests/datenbank/*.test.sql. Braucht
// Postgres (initdb, pg_ctl, psql). Als root läuft Postgres als Benutzer
// „postgres“. Ohne Postgres: Hinweis und Ende (kein Fehler).

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, chownSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = ["/usr/lib/postgresql/17/bin", "/usr/lib/postgresql/16/bin", "/usr/lib/postgresql/15/bin"].find((d) => existsSync(join(d, "initdb")));
if (!bin) {
  console.log("Kein Postgres gefunden (initdb) – Datenbank-Test übersprungen.");
  process.exit(0);
}
const asRoot = process.getuid?.() === 0;
const dir = mkdtempSync(join(tmpdir(), "wasgibts-db-"));
const data = join(dir, "data");
const port = String(54329 + Math.floor(Math.random() * 500));
const pgUid = asRoot ? Number(execFileSync("id", ["-u", "postgres"]).toString().trim()) : null;
if (asRoot) chownSync(dir, pgUid, pgUid);
const run = (cmd, args, opts = {}) => {
  const full = asRoot ? ["runuser", ["-u", "postgres", "--", join(bin, cmd), ...args]] : [join(bin, cmd), args];
  const r = spawnSync(full[0], full[1], { encoding: "utf8", ...opts });
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${cmd} fehlgeschlagen:\n${r.stdout}\n${r.stderr}`);
  return r;
};
const psql = (file, label) => {
  const r = run("psql", ["-h", dir, "-p", port, "-U", "postgres", "-d", "test", "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { allowFail: true });
  const ok = r.status === 0;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) console.log((r.stderr || r.stdout).trim().split("\n").slice(-12).join("\n"));
  return ok;
};

let failed = 0;
try {
  run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C"]);
  run("pg_ctl", ["-D", data, "-l", join(dir, "log.txt"), "-o", `-p ${port} -k ${dir} -c listen_addresses=''`, "-w", "start"]);
  run("psql", ["-h", dir, "-p", port, "-U", "postgres", "-d", "postgres", "-q", "-c", "create database test"]);
  // Kopien, die der Benutzer postgres lesen kann
  const copy = (src) => {
    const target = join(dir, src.split("/").pop());
    execFileSync("cp", [src, target]);
    if (asRoot) chownSync(target, pgUid, pgUid);
    return target;
  };
  if (!psql(copy(join(root, "tests/datenbank/supabase-nachbau.sql")), "Supabase-Nachbau")) failed++;
  const migrations = readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const m of migrations) if (!psql(copy(join(root, "supabase/migrations", m)), `Migration ${m}`)) failed++;
  // Zweimal einspielen darf nicht schaden (if not exists / or replace)
  for (const m of migrations) if (!psql(copy(join(root, "supabase/migrations", m)), `Migration ${m} (nochmal)`)) failed++;
  const tests = readdirSync(join(root, "tests/datenbank")).filter((f) => f.endsWith(".test.sql")).sort();
  for (const t of tests) if (!psql(copy(join(root, "tests/datenbank", t)), `Test ${t}`)) failed++;
} finally {
  run("pg_ctl", ["-D", data, "-m", "immediate", "stop"], { allowFail: true });
  rmSync(dir, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} FEHLER` : "\nDatenbank: alles ok");
process.exit(failed ? 1 : 0);
