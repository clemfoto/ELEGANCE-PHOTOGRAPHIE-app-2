"use client";
import { useTransition } from "react";
import { convertirLead } from "@/app/(app)/t/acciones";

export default function BotonConvertir({ id }: { id: string }) {
  const [pendiente, empezar] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-primario btn-bloque"
      disabled={pendiente}
      onClick={() => {
        if (confirm("¿Crear un cliente nuevo a partir de este lead?")) empezar(() => convertirLead(id));
      }}
    >
      {pendiente ? "Creando cliente…" : "Convertir en cliente"}
    </button>
  );
}
