"use client";
import { useTransition } from "react";
import { borrarMovimientoAccion } from "@/app/acciones";

export default function BorrarMovimiento({ id, volver }: { id: string; volver: string }) {
  const [enviando, start] = useTransition();
  return (
    <div className="zona-peligro">
      <button type="button" className="btn btn-peligro btn-bloque" disabled={enviando}
        onClick={() => confirm("¿Borrar este movimiento?") && start(() => borrarMovimientoAccion(id, volver))}>
        Borrar movimiento
      </button>
    </div>
  );
}
