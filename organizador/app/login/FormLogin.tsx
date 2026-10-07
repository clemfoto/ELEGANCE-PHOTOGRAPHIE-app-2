"use client";
import { useActionState } from "react";
import { entrar } from "@/app/acciones";

export default function FormLogin() {
  const [estado, accion, enviando] = useActionState(entrar, undefined);
  return (
    <form action={accion} className="form">
      <label className="campo">
        <span className="campo-label">Contraseña</span>
        <input className="input" type="password" name="clave" autoComplete="current-password" required autoFocus />
      </label>
      {estado?.error && <p className="error">{estado.error}</p>}
      <button className="btn btn-primario btn-bloque" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
