import type { Metadata, Viewport } from "next";
import RegisterServiceWorker from "./register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clave — bóveda local",
  description: "Bóveda local de credenciales cifrada en tu dispositivo",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Clave" },
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
  return <html lang="es"><body><RegisterServiceWorker />{children}<details className="global-help">
    <summary aria-label="Abrir guía de uso">?<span> Ayuda</span></summary>
    <section className="global-help-panel">
      <div className="help-kicker">GUÍA RÁPIDA</div>
      <h2>Cómo usar Clave</h2>
      <p>Tu bóveda se cifra y se guarda solo en este dispositivo. Elige una frase maestra larga y única; si la pierdes, no se puede recuperar.</p>
      <h3>Guarda tus cuentas</h3>
      <p>Pulsa «Añadir credencial» para guardar un servicio y usuario. Añade contraseña, sitio web, categoría y notas. Puedes marcar favoritos o generar una clave segura.</p>
      <h3>Busca y revisa</h3>
      <p>Usa el buscador y los filtros. «Débiles o repetidas» ayuda a encontrar claves débiles, cuentas incompletas o duplicadas.</p>
      <h3>Importa o mueve tu bóveda</h3>
      <p>En «Respaldos», importa un TXT o CSV y revisa la vista previa antes de confirmar. Estos archivos pueden tener claves sin cifrar: borra la copia original cuando termines.</p>
      <p>Para usar la bóveda en otro dispositivo, exporta un respaldo cifrado e impórtalo allí con la misma frase maestra. Haz respaldos después de cambios importantes.</p>
      <div className="help-security"><b>Bloqueo automático</b><span>Se activa tras cinco minutos sin actividad. Bloquea la bóveda si dejas el dispositivo.</span></div>
    </section>
  </details></body></html>;
}
