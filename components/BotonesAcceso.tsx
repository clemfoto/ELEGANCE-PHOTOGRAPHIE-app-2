"use client";
import { useState, useTransition } from "react";
import { cancelarInvitacion, cambiarRol, generarInvitacion, type ResultadoAcceso } from "@/app/(app)/t/acceso";

export default function BotonesAcceso({
  id,
  rol,
  mensaje,
  hayCodigo,
  cancelable,
  renovable,
  sinEmail,
  esYo,
}: {
  id: string;
  rol: string;
  mensaje: string;
  hayCodigo: boolean;
  cancelable: boolean;
  renovable: boolean;
  sinEmail: boolean;
  esYo: boolean;
}) {
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const ejecutar = (accion: () => Promise<ResultadoAcceso>) =>
    empezar(async () => {
      setError("");
      setAviso("");
      try {
        const r = await accion();
        if (r?.error) setError(r.error);
      } catch {
        setError("No se pudo completar. Revisa tu conexión e inténtalo de nuevo.");
      }
    });

  const compartir = async () => {
    try {
      if (navigator.share) await navigator.share({ text: mensaje });
      else {
        await navigator.clipboard.writeText(mensaje);
        setAviso("Mensaje copiado. Pégalo en WhatsApp o Telegram.");
      }
    } catch {
      /* el usuario cerró el menú de compartir */
    }
  };

  return (
    <>
      <div className="rol-selector" role="radiogroup" aria-label="Rol">
        {(["Administrador", "Equipo"] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={rol === r}
            className={`rol-opcion ${rol === r ? "activo" : ""}`}
            disabled={pendiente || rol === r || (esYo && r === "Equipo")}
            onClick={() => ejecutar(() => cambiarRol(id, r))}
          >
            <strong>{r}</strong>
            <small>{r === "Administrador" ? "Ve y edita todo" : "Solo Tareas y Calendario"}</small>
          </button>
        ))}
      </div>

      {sinEmail ? (
        <p className="error">Añade su email (botón Editar) para poder invitarle.</p>
      ) : (
        <div className="acciones-acceso">
          {hayCodigo && (
            <button type="button" className="btn btn-primario" onClick={compartir}>
              Enviar invitación
            </button>
          )}
          {renovable && (
            <button
              type="button"
              className={`btn ${hayCodigo ? "btn-secundario" : "btn-primario"}`}
              disabled={pendiente}
              onClick={() => {
                const texto = hayCodigo
                  ? "¿Generar un código nuevo? El anterior dejará de valer."
                  : "Se creará un código personal. Si ya tenía contraseña, tendrá que crear otra con el código. ¿Seguir?";
                if (confirm(texto)) ejecutar(() => generarInvitacion(id));
              }}
            >
              {pendiente ? "Un momento…" : hayCodigo ? "Nuevo código" : "Generar código de invitación"}
            </button>
          )}
          {cancelable && (
            <button
              type="button"
              className="btn btn-peligro"
              disabled={pendiente}
              onClick={() => {
                if (confirm("¿Cancelar su acceso? Su código y su contraseña dejarán de funcionar y se cerrará su sesión.")) {
                  ejecutar(() => cancelarInvitacion(id));
                }
              }}
            >
              Cancelar acceso
            </button>
          )}
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {aviso && <p className="campo-ayuda">{aviso}</p>}
    </>
  );
}
