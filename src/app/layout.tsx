import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/core/ServiceWorkerRegistration";
import { KitchenHelper } from "@/components/begleitung/KitchenHelper";
import { ThemeSync } from "@/components/core/ThemeSync";
import { IconSync } from "@/components/core/IconSync";
import { ToastHost } from "@/components/ui/ToastHost";
import { NavigationMemory } from "@/components/core/NavigationMemory";
import { AutoCooked } from "@/components/essen/AutoCooked";
import { TimerAlarm } from "@/components/timer/TimerAlarm";
import { SportCelebration } from "@/components/sport/SportCelebration";
import { SyncRunner } from "@/components/konten/SyncRunner";
import { MicSheetHost } from "@/components/ui/MicPermission";
import { THEME_BOOT_SCRIPT, THEME_COLORS } from "@/lib/core/theme";
import { APP_NAME, APP_SHORT_NAME, icon } from "@/lib/core/app";
import "@/app/globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    // Unterseiten setzen nur ihren eigenen Namen, z. B. "Wochenplan · Was gibt's?"
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Deine Begleitung für den Familienalltag – Termine, Aufgaben, Essen und Einkauf.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: "default",
  },
  icons: {
    // favicon.ico bindet Next aus src/app automatisch ein
    icon: [
      { url: icon("icon.svg"), type: "image/svg+xml" },
      { url: icon("favicon-32.png"), sizes: "32x32", type: "image/png" },
      { url: icon("favicon-48.png"), sizes: "48x48", type: "image/png" },
    ],
    apple: { url: icon("apple-touch-icon.png"), sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  // Ruhige Statusleiste im Ton des Hintergrunds (hell/dunkel); ThemeSync passt sie an die gewählte Ansicht an
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.warm.background },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.nacht.background },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" data-theme="warm" data-look="farbig" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Ansicht vor dem ersten Zeichnen setzen (kein Aufblitzen) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Hinter der Statusleiste: ruhiger, leicht durchscheinender Hintergrund statt durchlaufender Inhalte */}
        <div className="status-veil" aria-hidden />
        {children}
        <ThemeSync />
        <IconSync />
        <ToastHost />
        <Suspense fallback={null}>
          <NavigationMemory />
        </Suspense>
        <KitchenHelper />
        <AutoCooked />
        <TimerAlarm />
        <SportCelebration />
        <SyncRunner />
        <MicSheetHost />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
