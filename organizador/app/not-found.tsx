import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="login">
      <div className="login-caja" style={{ textAlign: "center" }}>
        <h1 className="login-titulo">No encontrado</h1>
        <Link href="/" className="btn btn-primario">Ir a Hoy</Link>
      </div>
    </main>
  );
}
