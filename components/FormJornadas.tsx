"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarJornadas } from "@/app/(app)/t/jornadas";
import type { Jornada } from "@/lib/horario";

const MAX_DIAS = 7;

/** "AAAA-MM-DD" + n días. */
function masDias(fecha: string, n: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "";
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Días del servicio (de 1 a 7). Cada día tiene la fecha y las horas de FOTOGRAFÍA y, si el video
 * empieza en otro momento, las de VIDEOGRAFÍA. Un evento de varios días es un solo cliente; la
 * fecha de fotografía del día 1 es la fecha del evento.
 */
export default function FormJornadas({ id, inicial }: { id: string; inicial: Jornada[] }) {
  const router = useRouter();
  const [dias, setDias] = useState<Jornada[]>(inicial);
  const [pendiente, empezar] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok?: string; error?: string }>({});

  const cambiarCantidad = (n: number) => {
    const nuevos = dias.slice(0, n);
    // Los días nuevos van seguidos y con el mismo horario del día anterior
    while (nuevos.length < n) {
      const prev = nuevos[nuevos.length - 1];
      nuevos.push({
        fecha: masDias(prev.fecha, 1),
        inicio: prev.inicio,
        fin: prev.fin,
        videoFecha: prev.videoFecha ? masDias(prev.videoFecha, 1) : "",
        videoInicio: prev.videoInicio,
        videoFin: prev.videoFin,
      });
    }
    setDias(nuevos);
  };
  const cambiar = (i: number, campo: keyof Jornada, valor: string) =>
    setDias(dias.map((d, j) => (j === i ? { ...d, [campo]: valor } : d)));

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje({});
    empezar(async () => {
      const r = await guardarJornadas(id, dias);
      setMensaje(r.error ? { error: r.error } : { ok: "Guardado ✓" });
      router.refresh();
    });
  };

  return (
    <form className="form" onSubmit={guardar}>
      <label className="campo">
        <span className="campo-label">Días de servicio</span>
        <select className="input" value={dias.length} onChange={(e) => cambiarCantidad(Number(e.target.value))}>
          {Array.from({ length: MAX_DIAS }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} {i ? "días" : "día"}
            </option>
          ))}
        </select>
      </label>

      {dias.map((d, i) => (
        <fieldset key={i} className="campo jornada">
          <legend className="campo-label">{dias.length > 1 ? `Día ${i + 1}` : "Horario"}</legend>

          <p className="jornada-servicio">📸 Fotografía</p>
          <label className="jornada-fila">
            <span>{i === 0 ? "Fecha del evento" : "Fecha"}</span>
            <input className="input" type="date" required value={d.fecha} onChange={(e) => cambiar(i, "fecha", e.target.value)} />
          </label>
          <div className="jornada-horas">
            <label className="jornada-fila">
              <span>Inicio</span>
              <input className="input" type="time" value={d.inicio} onChange={(e) => cambiar(i, "inicio", e.target.value)} />
            </label>
            <label className="jornada-fila">
              <span>Fin</span>
              <input className="input" type="time" value={d.fin} onChange={(e) => cambiar(i, "fin", e.target.value)} />
            </label>
          </div>

          <p className="jornada-servicio">🎥 Videografía</p>
          <label className="jornada-fila">
            <span>Fecha del evento</span>
            <input className="input" type="date" value={d.videoFecha} onChange={(e) => cambiar(i, "videoFecha", e.target.value)} />
          </label>
          <div className="jornada-horas">
            <label className="jornada-fila">
              <span>Inicio</span>
              <input className="input" type="time" value={d.videoInicio} onChange={(e) => cambiar(i, "videoInicio", e.target.value)} />
            </label>
            <label className="jornada-fila">
              <span>Fin</span>
              <input className="input" type="time" value={d.videoFin} onChange={(e) => cambiar(i, "videoFin", e.target.value)} />
            </label>
          </div>
        </fieldset>
      ))}
      <p className="nota-chica">Videografía es opcional: llénala solo si el video tiene otro horario o fecha. Sin fecha, se usa la de fotografía.</p>

      <button type="submit" className="btn btn-primario btn-bloque" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar días y horarios"}
      </button>
      {mensaje.error && <p className="error">{mensaje.error}</p>}
      {mensaje.ok && <p className="nota-chica">{mensaje.ok}</p>}
    </form>
  );
}
