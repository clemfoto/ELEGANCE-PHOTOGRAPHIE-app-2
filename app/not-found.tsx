import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="login">
      <div className="login-caja">
        <h1 className="login-titulo">No encontrado</h1>
        <p className="muted">Puede que el registro se haya borrado o que la tabla haya cambiado de nombre.</p>
        <Link href="/" className="btn btn-primario">Volver al inicio</Link>
      </div>
    </main>
  );
}
