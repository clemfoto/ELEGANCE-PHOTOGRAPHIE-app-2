"use client";
import { useOptimistic, useTransition } from "react";
import { alternarHecha } from "@/app/acciones";
import { Icono } from "./Iconos";

export default function CheckHecha({ id, fecha, hecha, color }: { id: string; fecha: string; hecha: boolean; color: string }) {
  const [marcada, setMarcada] = useOptimistic(hecha);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      className={`check ${marcada ? "marcado" : ""}`}
      style={{ "--color": color } as React.CSSProperties}
      aria-label={marcada ? "Marcar como pendiente" : "Marcar como hecha"}
      aria-pressed={marcada}
      onClick={() =>
        start(async () => {
          setMarcada(!marcada);
          await alternarHecha(id, fecha, !marcada);
        })
      }
    >
      <Icono id="check" tam={16} />
    </button>
  );
}
