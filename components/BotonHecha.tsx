"use client";
import { useOptimistic, useTransition } from "react";
import { alternarTarea } from "@/app/(app)/t/acciones";

/** Marca una tarea como hecha con un toque (se ve al instante y se guarda en segundo plano). */
export default function BotonHecha({ id, hecha }: { id: string; hecha: boolean }) {
  const [optimista, setOptimista] = useOptimistic(hecha);
  const [, empezar] = useTransition();
  return (
    <button
      type="button"
      className={`check ${optimista ? "marcado" : ""}`}
      aria-pressed={optimista}
      aria-label={optimista ? "Marcar como pendiente" : "Marcar como hecha"}
      onClick={() =>
        empezar(async () => {
          setOptimista(!optimista);
          await alternarTarea(id, !optimista);
        })
      }
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </button>
  );
}
