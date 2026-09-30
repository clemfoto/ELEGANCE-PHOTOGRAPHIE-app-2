"use client";
import { useState, useTransition } from "react";
import { aprobarEntrega, decidirGasto, reenviarAviso } from "@/app/(app)/decisiones";

const ACCIONES = {
  aprobarEntrega: (id: string) => aprobarEntrega(id),
  aprobarGasto: (id: string) => decidirGasto(id, true),
  rechazarGasto: (id: string) => decidirGasto(id, false),
  reenviarAviso: (id: string) => reenviarAviso(id),
};

/** Botón de un toque para las decisiones (visto bueno, aprobar o rechazar un gasto). */
export default function BotonAccion({
  accion,
  id,
  children,
  tipo = "primario",
  confirmar,
}: {
  accion: keyof typeof ACCIONES;
  id: string;
  children: React.ReactNode;
  tipo?: "primario" | "secundario" | "peligro";
  confirmar?: string;
}) {
  const [pendiente, empezar] = useTransition();
  const [hecho, setHecho] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-chico btn-${tipo}`}
      disabled={pendiente || hecho}
      onClick={() => {
        if (confirmar && !confirm(confirmar)) return;
        empezar(async () => {
          await ACCIONES[accion](id);
          setHecho(true);
        });
      }}
    >
      {pendiente ? "…" : hecho ? "Hecho ✓" : children}
    </button>
  );
}
