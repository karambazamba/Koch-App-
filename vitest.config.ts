import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests für die reine Logik (ohne Browser). `npm test`
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // `npm run test:abdeckung`: Abdeckung der Logik in src/lib. Nicht gezählt:
    // React-Hooks (use*.ts) und reine Browser-Schnittstellen (Sprache,
    // Audio, Wake Lock) – die prüft der Durchklick im echten Browser.
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/use[A-Z]*.ts", "src/lib/begleitung/speech.ts", "src/lib/pinnwand/memoAudio.ts", "src/lib/pinnwand/memoPlayer.ts", "src/lib/pinnwand/fotoStore.ts", "src/lib/core/wakeLock.ts", "src/lib/begleitung/aufnahme.ts", "src/lib/begleitung/ohrLiveBrowser.ts"],
      reporter: ["text-summary", "json-summary"],
      // Untergrenze (Aufräumen, Etappe 6): darunter schlägt test:abdeckung fehl
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
    },
  },
});
