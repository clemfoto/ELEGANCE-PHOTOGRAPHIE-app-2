"use client";
import { useTransition } from "react";
import { borrarTareaAccion } from "@/app/acciones";

export default function BorrarTarea({ id, fecha, repetitiva, volver }: { id: string; fecha?: string; repetitiva: boolean; volver: string }) {
  const [enviando, start] = useTransition();
  const borrar = (modo: "dia" | "serie") => {
    const pregunta = modo === "dia" ? "¿Quitar la tarea solo de este día?" : repetitiva ? "¿Borrar todas las repeticiones de esta tarea?" : "¿Borrar esta tarea?";
    if (confirm(pregunta)) start(() => borrarTareaAccion(id, modo, fecha, volver));
  };
  return (
    <div className="zona-peligro">
      {repetitiva && fecha && (
        <button type="button" className="btn btn-peligro btn-bloque" disabled={enviando} onClick={() => borrar("dia")}>Quitar solo este día</button>
      )}
      <button type="button" className="btn btn-peligro btn-bloque" disabled={enviando} onClick={() => borrar("serie")}>
        {repetitiva ? "Borrar toda la serie" : "Borrar tarea"}
      </button>
    </div>
  );
}
