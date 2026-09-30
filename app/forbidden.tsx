import Link from "next/link";

export default function Prohibido() {
  return (
    <main className="login">
      <div className="login-caja">
        <h1 className="login-titulo">Sin acceso</h1>
        <p className="muted">Esta sección es solo para administradores.</p>
        <Link href="/" className="btn btn-primario">Volver al inicio</Link>
      </div>
    </main>
  );
}
