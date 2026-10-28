// Mias Ohr live: POST { geraet } → kurzlebiger Einmal-Schlüssel (realtime_scribe),
// mit dem die App den Ton direkt zum Anbieter streamt. Der echte Schlüssel
// bleibt auf dem Server; Zugangscode und Grenzen wie bei allen KI-Aufrufen
// (`begleitung/stimmeServer.ts`). Ohne ELEVENLABS_API_KEY „aus“.

import { ohrTokenHolen } from "@/lib/begleitung/stimmeServer";

export const maxDuration = 10;

export const POST = (request: Request) => ohrTokenHolen(request);
