// Mias Ohr: POST mit der Aufnahme (höchstens 60 s) → erkannter Text. Die
// Aufnahme wird nur weitergereicht, nie gespeichert oder protokolliert.
// Ohne ELEVENLABS_API_KEY „aus“ – die App hört dann über den Browser.

import { aufnahmeHoeren } from "@/lib/begleitung/stimmeServer";

export const maxDuration = 45;

export const POST = (request: Request) => aufnahmeHoeren(request);
