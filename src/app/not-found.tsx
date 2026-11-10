import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-screen">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h1>404</h1>
        <p className="subtitle">Página no encontrada</p>
        <Link href="/" className="primary" style={{ display: "inline-block", marginTop: "16px", textDecoration: "none" }}>
          Volver a la bóveda
        </Link>
      </div>
    </main>
  );
}
