import Marca from "@/components/Marca";
import { MARCA } from "@/config/galerias";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default function Login() {
  return (
    <main className="login">
      <div className="login-caja">
        <Marca className="login-marca" />
        <h1 className="sr-only">{MARCA.nombre}</h1>
        <LoginForm />
        <p className="login-pie muted">
          ¿Primera vez o te dieron un código nuevo? <Link href="/registro">Usar mi código de invitación</Link>
        </p>
      </div>
    </main>
  );
}
