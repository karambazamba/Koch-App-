// Mias Stimme: POST = Antwort vorlesen (Ton gestreamt), GET ?satz=<Nr> = ein
// fester Satz (zwischengespeichert). Logik und Schutz in `begleitung/stimmeServer.ts`;
// ohne ELEVENLABS_API_KEY „aus“ – die App spricht dann mit der Stimme des Handys.

import { festenSatzSprechen, textSprechen } from "@/lib/begleitung/stimmeServer";

export const maxDuration = 30;

export const GET = (request: Request) => festenSatzSprechen(request);
export const POST = (request: Request) => textSprechen(request);
