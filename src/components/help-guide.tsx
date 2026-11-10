"use client";

import { useEffect, useState } from "react";

type Section = "all" | "crypto" | "manage" | "security" | "backup" | "privacy";

export default function HelpGuide() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Section>("all");

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="help-trigger-btn"
        aria-label="Abrir guía de ayuda"
        onClick={() => setOpen(true)}
      >
        <span className="help-trigger-badge">?</span>
        <span>Ayuda</span>
      </button>

      {open && (
        <div
          className="modal-backdrop help-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="modal help-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-guide-title"
          >
            <div className="help-modal-header">
              <div className="help-header-text">
                <span className="help-kicker">DOCUMENTACIÓN Y USO</span>
                <h2 id="help-guide-title">Guía de Clave</h2>
                <p className="modal-sub">
                  Bóveda local de credenciales cifrada con tecnología de grado militar en tu propio dispositivo.
                </p>
              </div>
              <button
                type="button"
                className="icon-btn help-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Cerrar guía"
              >
                ✕
              </button>
            </div>

            <div className="help-tabs-row">
              <button
                type="button"
                className={`help-tab-btn ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                Todo
              </button>
              <button
                type="button"
                className={`help-tab-btn ${activeTab === "crypto" ? "active" : ""}`}
                onClick={() => setActiveTab("crypto")}
              >
                🔐 Cifrado
              </button>
              <button
                type="button"
                className={`help-tab-btn ${activeTab === "manage" ? "active" : ""}`}
                onClick={() => setActiveTab("manage")}
              >
                📝 Credenciales
              </button>
              <button
                type="button"
                className={`help-tab-btn ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                🛡️ Auditoría
              </button>
              <button
                type="button"
                className={`help-tab-btn ${activeTab === "backup" ? "active" : ""}`}
                onClick={() => setActiveTab("backup")}
              >
                ⚙️ Ajustes y Respaldos
              </button>
              <button
                type="button"
                className={`help-tab-btn ${activeTab === "privacy" ? "active" : ""}`}
                onClick={() => setActiveTab("privacy")}
              >
                ⏱️ Privacidad
              </button>
            </div>

            <div className="help-content-scroll">
              {(activeTab === "all" || activeTab === "crypto") && (
                <article className="help-card-section">
                  <div className="help-card-header">
                    <span className="help-card-icon">🔐</span>
                    <h3>1. Bóveda 100% Local y Cifrado Zero-Knowledge</h3>
                  </div>
                  <p>
                    Clave está diseñada bajo el principio de <strong>privacidad total sin servidores</strong>. Tus contraseñas nunca viajan por internet ni se guardan en la nube:
                  </p>
                  <ul className="help-list">
                    <li>
                      <strong>Argon2id (KDF):</strong> Tu frase maestra se transforma en una clave criptográfica de 256 bits mediante Argon2id con 64 MB de memoria y 3 iteraciones, protegiéndote contra ataques de fuerza bruta asistidos por tarjetas gráficas (GPU) o chips dedicados (ASIC).
                    </li>
                    <li>
                      <strong>AES-256-GCM:</strong> Todas las credenciales se cifran con AES-GCM (cifrado autenticado). Cualquier alteración en los datos cifrados es detectada y rechazada inmediatamente.
                    </li>
                    <li>
                      <strong>Sin puerta trasera:</strong> No existe recuperación de cuenta por correo electrónico ni botón de «olvidé mi contraseña». Si pierdes tu frase maestra, los datos no se pueden descifrar. Anota tu frase maestra en un lugar físico seguro.
                    </li>
                  </ul>
                </article>
              )}

              {(activeTab === "all" || activeTab === "manage") && (
                <article className="help-card-section">
                  <div className="help-card-header">
                    <span className="help-card-icon">📝</span>
                    <h3>2. Gestión y Edición de Credenciales</h3>
                  </div>
                  <p>
                    Organiza fácilmente todas las cuentas personales, de trabajo, bancarias o de compras:
                  </p>
                  <ul className="help-list">
                    <li>
                      <strong>Crear o editar:</strong> Pulsa «＋ Añadir credencial» o el icono ✎ en cualquier cuenta para abrir el formulario. Puedes asignar servicio, categoría, usuario, contraseña, enlace web y notas.
                    </li>
                    <li>
                      <strong>Ver u ocultar contraseña:</strong> Tanto en la lista principal como dentro de la ventana de edición, usa el botón <strong>«Ver» / «Ocultar»</strong> para revisar tu clave sin errores tipográficos.
                    </li>
                    <li>
                      <strong>Generador criptográfico (⟳):</strong> Pulsa el botón circular junto a la contraseña para generar una clave segura de 24 caracteres con letras mayúsculas, minúsculas, números y símbolos seleccionados sin caracteres ambiguos.
                    </li>
                    <li>
                      <strong>Favoritos (★):</strong> Marca con la estrella tus cuentas frecuentes para filtrarlas al instante desde el menú lateral o inferior.
                    </li>
                    <li>
                      <strong>Copia rápida (▣):</strong> Pulsa el botón de copia en la tarjeta o tabla para enviar la contraseña directamente al portapapeles sin exponerla en pantalla.
                    </li>
                  </ul>
                </article>
              )}

              {(activeTab === "all" || activeTab === "security") && (
                <article className="help-card-section">
                  <div className="help-card-header">
                    <span className="help-card-icon">🛡️</span>
                    <h3>3. Auditoría de Seguridad («Débiles o repetidas»)</h3>
                  </div>
                  <p>
                    Clave analiza continuamente la salud de tu bóveda sin enviar datos a ningún sitio:
                  </p>
                  <ul className="help-list">
                    <li>
                      <strong>Contraseñas débiles:</strong> Señaladas con un aviso ⚠ si tienen menos de 12 caracteres o no combinan mayúsculas, minúsculas, números y caracteres especiales.
                    </li>
                    <li>
                      <strong>Contraseñas repetidas:</strong> Si utilizas la misma clave en dos o más servicios, se indicará el riesgo. Reutilizar contraseñas expone todas tus cuentas si una de ellas sufre una filtración en internet.
                    </li>
                    <li>
                      <strong>Cuentas incompletas:</strong> Cuentas a las que les falta el nombre de usuario o la clave.
                    </li>
                  </ul>
                  <div className="help-tip-box">
                    💡 <em>Consejo:</em> Revisa periódicamente la sección <strong>«Débiles o repetidas»</strong> en la barra de navegación para fortalecer las claves marcadas con ⚠ usando el generador integrado.
                  </div>
                </article>
              )}

              {(activeTab === "all" || activeTab === "backup") && (
                <article className="help-card-section">
                  <div className="help-card-header">
                    <span className="help-card-icon">⚙️</span>
                    <h3>4. Ajustes, Respaldos y Migración entre Dispositivos</h3>
                  </div>
                  <p>
                    Como Clave no sincroniza automáticamente a través de la nube, tú tienes el control absoluto de tus archivos:
                  </p>
                  <ul className="help-list">
                    <li>
                      <strong>Exportar respaldo cifrado:</strong> En la sección <strong>«Ajustes»</strong> (o el botón «↓ Exportar cifrado» en la cabecera), descarga un archivo <code>clave-respaldo-cifrado.json</code>. Este archivo está protegido con tu frase maestra y es seguro guardarlo en tu disco, memoria USB o nube personal.
                    </li>
                    <li>
                      <strong>Llevar tu bóveda a otro dispositivo:</strong> Abre Clave en tu móvil, tablet u otro ordenador, pulsa «Importar respaldo cifrado» y selecciona tu archivo JSON. Introduce la frase maestra del respaldo para restaurar todas tus cuentas.
                    </li>
                    <li>
                      <strong>Fusionar o Reemplazar:</strong> Al importar un respaldo en una bóveda que ya tiene cuentas, puedes elegir entre <em>Fusionar</em> (agrega las cuentas nuevas y actualiza las existentes) o <em>Reemplazar</em> (sustituye completamente la bóveda local).
                    </li>
                    <li>
                      <strong>Importador de listas (TXT / CSV):</strong> Si vienes de otro gestor o tienes una hoja de cálculo, puedes importar archivos de texto o CSV. El sistema detecta delimitadores (comas, punto y coma, tabuladores) o formatos tipo <code>Usuario: ...</code> y <code>Contraseña: ...</code>, mostrándote una vista previa antes de cifrarlo.
                    </li>
                  </ul>
                  <div className="help-warning-box">
                    ⚠️ <em>Seguridad importante con TXT/CSV:</em> Los archivos de texto sin formato contienen contraseñas legibles sin cifrar. Elimina permanentemente el archivo original de texto una vez confirmado el traspaso a Clave.
                  </div>
                </article>
              )}

              {(activeTab === "all" || activeTab === "privacy") && (
                <article className="help-card-section">
                  <div className="help-card-header">
                    <span className="help-card-icon">⏱️</span>
                    <h3>5. Bloqueo Automático y Funcionamiento Offline</h3>
                  </div>
                  <p>
                    Protección física contra accesos no autorizados:
                  </p>
                  <ul className="help-list">
                    <li>
                      <strong>Bloqueo por inactividad (5 minutos):</strong> Si dejas el dispositivo desatendido, la sesión se bloquea automáticamente pasados 5 minutos sin interacción de ratón, teclado o pantalla táctil.
                    </li>
                    <li>
                      <strong>Bloqueo inmediato:</strong> Pulsa «Bloquear bóveda» en la barra lateral o el icono ⌑ en la barra móvil para cerrar la sesión al instante. Las claves criptográficas se purgan de la memoria RAM del navegador.
                    </li>
                    <li>
                      <strong>Instalación PWA y soporte sin conexión:</strong> Pulsa el botón «📲 Instalar» en la barra superior, en el menú móvil o en Ajustes para añadir Clave a tu pantalla de inicio en Android, iPhone/iPad u ordenador. Se ejecuta en ventana propia y funciona al 100% sin conexión a internet.
                    </li>
                  </ul>
                </article>
              )}
            </div>

            <div className="help-modal-footer">
              <button
                type="button"
                className="primary"
                onClick={() => setOpen(false)}
                style={{ width: "100%", padding: "12px", fontSize: "14px" }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
