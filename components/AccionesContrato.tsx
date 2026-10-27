"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { descartarContrato, enviarContrato, prepararContrato, type Resultado } from "@/app/(app)/t/pagos";

/** Botones del contrato de TuGiroSuite: preparar (con o sin dron), enviar al cliente o descartar. */
export default function AccionesContrato({ id, modo }: { id: string; modo: "preparar" | "revisar" | "enviado" }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [dron, setDron] = useState(false);
  const [error, setError] = useState("");

  const correr = (fn: () => Promise<Resultado>, confirmar?: string) => {
    if (confirmar && !confirm(confirmar)) return;
    setError("");
    empezar(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      router.refresh();
    });
  };

  if (modo === "enviado") return null;
  return (
    <>
      {modo === "preparar" ? (
        <div className="form">
          <label className="campo campo-check">
            <span className="campo-label">Incluye dron</span>
            <input type="checkbox" checked={dron} onChange={(e) => setDron(e.target.checked)} />
          </label>
          <button type="button" className="btn btn-primario btn-bloque" disabled={pendiente} onClick={() => correr(() => prepararContrato(id, dron))}>
            {pendiente ? "Preparando…" : `Preparar contrato e invoice${dron ? " (con dron)" : ""}`}
          </button>
        </div>
      ) : (
        <div className="acciones-acceso">
          <button
            type="button"
            className="btn btn-primario"
            disabled={pendiente}
            onClick={() => correr(() => enviarContrato(id), "¿Mandar el contrato y el invoice al cliente? Revisa antes los dos PDF.")}
          >
            {pendiente ? "…" : "Enviar al cliente"}
          </button>
          <button
            type="button"
            className="btn btn-secundario"
            disabled={pendiente}
            onClick={() => correr(() => descartarContrato(id), "¿Descartar este contrato? Podrás preparar otro.")}
          >
            Descartar
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </>
  );
}
