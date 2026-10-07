"use client";
import { useState } from "react";

const TAREAS = [
  { tarea: "webhook", texto: "Conectar el bot", ayuda: "Hazlo una vez tras configurar el bot (o si cambias de dominio)." },
  { tarea: "frecuente", texto: "Enviar avisos de clientes", ayuda: "Nuevos clientes e invitaciones. Se hace solo cada 10 min." },
  { tarea: "diaria", texto: "Enviar recordatorios de hoy", ayuda: "Entregas y leads. Se hace solo cada día a las 9:00." },
];

export default function PanelAutomatizaciones() {
  const [ocupado, setOcupado] = useState("");
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  async function ejecutar(tarea: string) {
    setOcupado(tarea);
    setResultado(null);
    try {
      const res = await fetch(`/api/automatizaciones?tarea=${tarea}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      setResultado({ ok: true, texto: json.log?.length ? json.log.join("\n") : "Hecho. No había nada pendiente." });
    } catch (e) {
      setResultado({ ok: false, texto: (e as Error).message });
    } finally {
      setOcupado("");
    }
  }

  return (
    <div className="panel-auto">
      {TAREAS.map((t) => (
        <div key={t.tarea} className="panel-auto-fila">
          <button className="btn btn-secundario btn-bloque" disabled={!!ocupado} onClick={() => ejecutar(t.tarea)}>
            {ocupado === t.tarea ? "Ejecutando…" : t.texto}
          </button>
          <span className="campo-ayuda">{t.ayuda}</span>
        </div>
      ))}
      {resultado && <p className={`multilinea ${resultado.ok ? "ok" : "error"}`}>{resultado.texto}</p>}
    </div>
  );
}
