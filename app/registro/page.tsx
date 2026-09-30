import Marca from "@/components/Marca";
import type { Metadata } from "next";
import Link from "next/link";
import { RegistroForm } from "../login/LoginForm";

export const metadata: Metadata = { title: "Crear acceso" };

export default async function Registro({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  return (
    <main className="login">
      <div className="login-caja">
        <Marca className="login-marca" />
        <h1 className="login-titulo">Crea tu acceso</h1>
        <p className="muted">Usa el email con el que estás en el equipo y el código personal que te dio el administrador.</p>
        <RegistroForm codigo={codigo} />
        <p className="login-pie muted">
          ¿Ya tienes contraseña? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
