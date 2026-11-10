import Image from "next/image";

export default function AppFooter({ className = "" }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`app-footer ${className}`} role="contentinfo">
      <div className="app-footer-brand">
        <Image
          src="/footer-icon.jpg"
          alt="Borrach@s y mas..."
          width={38}
          height={38}
          className="app-footer-icon"
          referrerPolicy="no-referrer"
        />
        <span className="app-footer-title">Borrach@s y mas...</span>
      </div>
      <p className="app-footer-rights">
        © {currentYear} Borrach@s y mas... · Todos los derechos reservados.
      </p>
    </footer>
  );
}
