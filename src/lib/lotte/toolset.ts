// Meldet die vorhandenen Werkzeuge im Register an (Bereich je Werkzeug).
// Neue Bereiche (Termine, Aufgaben, Erinnerungen) kommen als eigene Datei
// dazu und rufen ebenfalls registerTool auf.

import { registerTool, type ToolArea } from "./registry";
import { runTool, TOOLS } from "./tools";

const AREA: Record<string, ToolArea> = {
  einkaufsliste_hinzufuegen: "einkauf",
  termin_notieren: "alltag",
};

for (const definition of TOOLS) {
  registerTool({ area: AREA[definition.name] ?? "essen", definition, run: (ctx, input) => runTool(ctx, definition.name, input) });
}

export { toolDefinitions, runRegisteredTool } from "./registry";
