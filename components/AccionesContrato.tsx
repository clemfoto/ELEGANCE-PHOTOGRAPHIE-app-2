"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { descartarContrato, firmarContrato, prepararContrato, type Resultado } from "@/app/(app)/t/pagos";

/**
 * Botones del contrato de TuGiroSuite: preparar (con o sin dron), descartar el borrador y firmar
 * cuando el cliente ya firmó. Qué documentos se mandan se elige en EnviarDocumentos.
 */
export default function AccionesContrato({ id, modo }: { id: string; modo: "preparar" | "revisar" | "firmar" | "reenviar" | "enviado" }) {
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
  if (modo === "firmar" || modo === "reenviar") {
    return (
      <>
        <button
          type="button"
          className={`btn btn-bloque ${modo === "firmar" ? "btn-primario" : "btn-secundario"}`}
          disabled={pendiente}
          onClick={() =>
            correr(
              () => firmarContrato(id),
              modo === "firmar"
                ? "¿Firmar el contrato y mandar la versión final al cliente y a Elegance? Revisa antes los documentos."
                : "¿Mandar otra vez la versión final firmada al cliente y a Elegance?",
            )
          }
        >
          {pendiente ? "Enviando…" : modo === "firmar" ? "Firmar y enviar" : "Reenviar documentos firmados"}
        </button>
        {error && <p className="error">{error}</p>}
      </>
    );
  }
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
        <button
          type="button"
          className="btn btn-secundario btn-bloque"
          disabled={pendiente}
          onClick={() => correr(() => descartarContrato(id), "¿Descartar este contrato? Podrás preparar otro.")}
        >
          {pendiente ? "…" : "Descartar borrador"}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </>
  );
}
