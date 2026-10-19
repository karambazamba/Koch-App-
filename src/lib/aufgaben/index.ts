// Aufgaben (Phase 2): noch leer, vorbereitet. Aufgaben werden Einträge im
// einheitlichen Modell (core/entries.ts) mit typ "aufgabe" – Lotte legt sie
// auf Zuruf an und räumt sie wieder weg.

import type { Entry } from "../core/entries";

export type TaskData = {
  title: string;
  /** Fällig am ("YYYY-MM-DD"), optional – ohne Datum einfach "irgendwann" */
  due?: string;
  done?: boolean;
};

export type Task = Entry<TaskData> & { typ: "aufgabe" };
