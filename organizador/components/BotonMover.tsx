"use client";
import { useTransition } from "react";
import { moverTarea } from "@/app/acciones";

/** Pasa una tarea atrasada (sin repetición) a otro día. */
export default function BotonMover({ id, fecha, texto }: { id: string; fecha: string; texto: string }) {
  const [enviando, start] = useTransition();
  return (
    <button type="button" className="btn btn-secundario btn-chico" disabled={enviando} onClick={() => start(() => moverTarea(id, fecha))}>
      {texto}
    </button>
  );
}
