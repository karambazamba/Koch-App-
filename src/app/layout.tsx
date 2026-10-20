import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { KitchenHelper } from "@/components/assistant/KitchenHelper";
import { ThemeSync } from "@/components/ThemeSync";
import { IconSync } from "@/components/IconSync";
import { ToastHost } from "@/components/ui/ToastHost";
import { NavigationMemory } from "@/components/NavigationMemory";
import { AutoCooked } from "@/components/AutoCooked";
import { TimerAlarm } from "@/components/TimerAlarm";
import { SportCelebration } from "@/components/SportCelebration";
import { THEME_BOOT_SCRIPT } from "@/lib/core/theme";
import { APP_NAME, APP_SHORT_NAME, BRAND_COLOR, icon } from "@/lib/core/app";
import "./globals.css";

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
  // Markenfarbe; in der App passt ThemeSync die Statusleiste an die Ansicht an
  themeColor: BRAND_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" data-theme="warm" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Ansicht vor dem ersten Zeichnen setzen (kein Aufblitzen) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
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
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
