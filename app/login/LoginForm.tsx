"use client";
import { useActionState } from "react";
import { entrar, registrarse, type EstadoAcceso } from "./actions";

export function LoginForm() {
  const [estado, accion, enviando] = useActionState<EstadoAcceso, FormData>(entrar, {});
  return (
    <form action={accion} className="form">
      <label className="campo">
        <span className="campo-label">Email</span>
        <input className="input" type="email" name="email" autoComplete="username" inputMode="email" required placeholder="tu@email.com" />
      </label>
      <label className="campo">
        <span className="campo-label">Contraseña</span>
        <input className="input" type="password" name="clave" autoComplete="current-password" required />
      </label>
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="btn btn-primario btn-bloque" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export function RegistroForm({ codigo }: { codigo?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoAcceso, FormData>(registrarse, {});
  return (
    <form action={accion} className="form">
      <label className="campo">
        <span className="campo-label">Email</span>
        <input className="input" type="email" name="email" autoComplete="username" inputMode="email" required placeholder="tu@email.com" />
      </label>
      <label className="campo">
        <span className="campo-label">Código de invitación</span>
        <input className="input input-codigo" name="codigo" required defaultValue={codigo} autoCapitalize="characters" autoComplete="one-time-code" placeholder="EP-XXXX-XXXX" />
      </label>
      <label className="campo">
        <span className="campo-label">Crea tu contraseña</span>
        <input className="input" type="password" name="clave" autoComplete="new-password" minLength={8} required />
        <span className="campo-ayuda">Mínimo 8 caracteres.</span>
      </label>
      <label className="campo">
        <span className="campo-label">Repite la contraseña</span>
        <input className="input" type="password" name="clave2" autoComplete="new-password" minLength={8} required />
      </label>
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="btn btn-primario btn-bloque" disabled={enviando}>
        {enviando ? "Creando acceso…" : "Crear mi acceso"}
      </button>
    </form>
  );
}
