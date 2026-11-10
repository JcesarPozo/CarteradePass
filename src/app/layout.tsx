import type { Metadata, Viewport } from "next";
import RegisterServiceWorker from "./register-sw";
import HelpGuide from "@/components/help-guide";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clave — Bóveda local",
  description: "Bóveda local de credenciales cifrada en tu dispositivo con soporte sin conexión y respaldos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Clave" },
  openGraph: {
    title: "Clave — Bóveda local",
    description: "Bóveda local de credenciales cifrada en tu dispositivo con soporte sin conexión y respaldos.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#08120c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <RegisterServiceWorker />
        {children}
        <HelpGuide />
      </body>
    </html>
  );
}
