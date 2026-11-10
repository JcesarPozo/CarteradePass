"use client";

import { useState } from "react";
import Image from "next/image";
import { usePWAInstall } from "@/lib/use-pwa-install";

interface PWAInstallButtonProps {
  variant?: "button" | "card" | "compact";
  className?: string;
}

export default function PWAInstallButton({ variant = "button", className = "" }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running inside standalone PWA window
  if (isInstalled) {
    if (variant === "card") {
      return (
        <div className="pwa-installed-badge">
          <span className="pwa-installed-icon">✓</span>
          <span>Aplicación instalada y lista para uso sin conexión</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === "compact" ? (
        <button
          type="button"
          onClick={handleClick}
          className={`pwa-compact-btn ${className}`}
          title="Instalar aplicación en tu dispositivo"
        >
          <span className="pwa-btn-icon">📲</span>
          <span>Instalar</span>
        </button>
      ) : variant === "card" ? (
        <div className={`pwa-card-banner ${className}`}>
          <div className="pwa-card-content">
            <div className="pwa-card-icon-wrap">
              <Image
                src="/icons/icon-192.png"
                alt="Clave App Icon"
                width={48}
                height={48}
                className="pwa-card-app-icon"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h4 className="pwa-card-title">Instalar Clave en tu dispositivo</h4>
              <p className="pwa-card-sub">
                Úsala como app nativa sin conexión, con acceso directo en tu pantalla de inicio y máxima seguridad.
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClick} className="primary pwa-card-action">
            📲 {isInstallable ? "Instalar aplicación" : "Cómo instalar"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={`secondary pwa-install-btn ${className}`}
          title="Instalar Clave como aplicación nativa"
        >
          <span className="pwa-btn-icon">📲</span>
          <span>{isInstallable ? "Instalar app" : "Instalar"}</span>
        </button>
      )}

      {showGuide && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="modal pwa-guide-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title">
            <div className="pwa-guide-head">
              <div className="pwa-guide-icon-box">
                <Image
                  src="/icons/icon-192.png"
                  alt="Clave"
                  width={52}
                  height={52}
                  className="pwa-modal-app-icon"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 id="pwa-guide-title">Instalar Clave en tu dispositivo</h3>
                <p className="modal-sub">Acceso rápido desde tu pantalla de inicio y 100% disponible sin internet.</p>
              </div>
            </div>

            <div className="pwa-guide-platforms">
              {isIOS ? (
                <div className="pwa-platform-card active">
                  <div className="pwa-platform-title">📱 En iPhone o iPad (Safari)</div>
                  <ol className="pwa-steps-list">
                    <li>
                      Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra de Safari.
                    </li>
                    <li>
                      Desplázate hacia abajo y selecciona <strong>«Añadir a pantalla de inicio»</strong>.
                    </li>
                    <li>
                      Pulsa <strong>«Añadir»</strong> en la esquina superior derecha.
                    </li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="pwa-platform-card">
                    <div className="pwa-platform-title">🤖 En Android (Chrome / Edge / Firefox)</div>
                    <ol className="pwa-steps-list">
                      <li>
                        Toca el menú de tres puntos (<strong>⋮</strong>) en la esquina superior derecha del navegador.
                      </li>
                      <li>
                        Selecciona <strong>«Instalar aplicación»</strong> o <strong>«Añadir a pantalla de inicio»</strong>.
                      </li>
                      <li>
                        Confirma pulsando <strong>«Instalar»</strong>.
                      </li>
                    </ol>
                  </div>

                  <div className="pwa-platform-card">
                    <div className="pwa-platform-title">💻 En Ordenador (Chrome / Edge / Brave)</div>
                    <ol className="pwa-steps-list">
                      <li>
                        Busca el icono de instalación (<strong>⊕</strong> o pantalla con flecha) en la barra de direcciones del navegador.
                      </li>
                      <li>
                        O abre el menú del navegador (<strong>⋮</strong>) y haz clic en <strong>«Instalar Clave»</strong>.
                      </li>
                    </ol>
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="primary" onClick={() => setShowGuide(false)} style={{ width: "100%" }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
