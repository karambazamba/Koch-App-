import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nunito } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { KitchenHelper } from "@/components/assistant/KitchenHelper";
import { ThemeSync } from "@/components/ThemeSync";
import { ToastHost } from "@/components/ui/ToastHost";
import { NavigationMemory } from "@/components/NavigationMemory";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/app";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    // Unterseiten setzen nur ihren eigenen Namen, z. B. "Wochenplan · Was gibt's?"
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Wochenplan, Resteküche, Kochbuch und Einkaufsliste – passend zu eurer Familie.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: "default",
  },
  icons: {
    // favicon.ico bindet Next aus src/app automatisch ein
    icon: { url: "/icons/icon.svg", type: "image/svg+xml" },
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" data-theme="warm" className={`${nunito.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Ansicht vor dem ersten Zeichnen setzen (kein Aufblitzen) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeSync />
        <ToastHost />
        <Suspense fallback={null}>
          <NavigationMemory />
        </Suspense>
        <KitchenHelper />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
