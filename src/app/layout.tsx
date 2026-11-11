import type { Metadata, Viewport } from "next";
import RegisterServiceWorker from "./register-sw";
import HelpGuide from "@/components/help-guide";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clave — Bóveda local",
  description: "Bóveda local de credenciales cifrada en tu dispositivo con soporte sin conexión y respaldos.",
  manifest: "/manifest.webmanifest",
  applicationName: "Clave",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clave",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Clave — Bóveda local",
    description: "Bóveda local de credenciales cifrada en tu dispositivo con soporte sin conexión y respaldos.",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#08120c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Clave" />
        <meta name="application-name" content="Clave" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <RegisterServiceWorker />
        {children}
        <HelpGuide />
      </body>
    </html>
  );
}
