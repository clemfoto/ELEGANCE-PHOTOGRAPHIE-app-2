import type { Metadata } from "next";
import { APP, NEGOCIOS } from "@/config/negocios";
import FormLogin from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default function Login() {
  return (
    <main className="login">
      <div className="login-caja">
        <div className="login-marcas">
          {NEGOCIOS.map((n) => (
            <span key={n.id} className="insignia grande" style={{ background: n.color }}>{n.inicial}</span>
          ))}
        </div>
        <h1 className="login-titulo">{APP.nombre}</h1>
        <FormLogin />
      </div>
    </main>
  );
}
