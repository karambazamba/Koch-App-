// Meldet die vorhandenen Werkzeuge im Register an (Bereich je Werkzeug).
// Termine und Aufgaben kommen aus calendarTools.ts (Bereich "alltag").

import { registerTool, type ToolArea } from "./registry";
import { runTool, TOOLS } from "./tools";
import { CALENDAR_TOOLS } from "./calendarTools";

const AREA: Record<string, ToolArea> = {
  einkaufsliste_hinzufuegen: "einkauf",
};

for (const definition of TOOLS) {
  registerTool({ area: AREA[definition.name] ?? "essen", definition, run: (ctx, input) => runTool(ctx, definition.name, input) });
}

for (const tool of CALENDAR_TOOLS) registerTool(tool);

export { toolDefinitions, runRegisteredTool } from "./registry";
