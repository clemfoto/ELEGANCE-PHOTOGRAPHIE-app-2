"use client";
import { useTransition } from "react";
import { borrar } from "@/app/(app)/t/acciones";

export default function BotonBorrar({ tabla, id }: { tabla: string; id: string }) {
  const [pendiente, empezar] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-peligro"
      disabled={pendiente}
      onClick={() => {
        if (confirm("¿Borrar este registro? No se puede deshacer.")) empezar(() => borrar(tabla, id));
      }}
    >
      {pendiente ? "Borrando…" : "Borrar"}
    </button>
  );
}
