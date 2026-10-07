"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { NEGOCIOS, RECORDATORIOS } from "@/config/negocios";
import { guardarTareaAccion } from "@/app/acciones";
import type { Tarea, TipoRepeticion } from "@/lib/tipos";

const REPETIR: { id: TipoRepeticion; texto: string; unidad: [string, string] }[] = [
  { id: "nunca", texto: "No se repite", unidad: ["", ""] },
  { id: "diaria", texto: "Cada día", unidad: ["día", "días"] },
  { id: "semanal", texto: "Cada semana", unidad: ["semana", "semanas"] },
  { id: "mensual", texto: "Cada mes", unidad: ["mes", "meses"] },
  { id: "anual", texto: "Cada año", unidad: ["año", "años"] },
];
// Lunes primero; valor = día de JavaScript (0 = domingo).
const DIAS = [
  { v: 1, t: "L" }, { v: 2, t: "M" }, { v: 3, t: "X" }, { v: 4, t: "J" }, { v: 5, t: "V" }, { v: 6, t: "S" }, { v: 0, t: "D" },
];
const DURACIONES = [15, 30, 45, 60, 90, 120, 180, 240];

type Props = { tarea?: Tarea; negocio?: string; fecha: string; hora?: string; volver: string };

export default function FormTarea({ tarea, negocio, fecha, hora, volver }: Props) {
  const [estado, accion, enviando] = useActionState(guardarTareaAccion, undefined);
  const router = useRouter();
  const [repetir, setRepetir] = useState<TipoRepeticion>(tarea?.repetir.tipo ?? "nunca");
  const [cada, setCada] = useState(tarea?.repetir.cada ?? 1);
  const [conHora, setConHora] = useState(Boolean(tarea?.hora ?? hora));
  const [fechaSel, setFechaSel] = useState(tarea?.fecha ?? fecha);
  const diaFecha = new Date(`${fechaSel}T12:00:00Z`).getUTCDay();
  const dias = tarea?.repetir.dias ?? [diaFecha];
  const recordatorios = tarea?.recordatorios ?? (conHora ? [15] : [0]);
  const unidad = REPETIR.find((r) => r.id === repetir)!.unidad;

  return (
    <form action={accion} className="form">
      {tarea && <input type="hidden" name="id" value={tarea.id} />}
      <input type="hidden" name="volver" value={volver} />

      <fieldset className="campo">
        <legend className="campo-label">Negocio</legend>
        <div className="opciones negocio-opciones">
          {NEGOCIOS.map((n) => (
            <label key={n.id} className="opcion" style={{ "--color": n.color } as React.CSSProperties}>
              <input type="radio" name="negocio" value={n.id} defaultChecked={(tarea?.negocio ?? negocio ?? NEGOCIOS[0].id) === n.id} required />
              <span>{n.corto}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="campo">
        <span className="campo-label">Tarea</span>
        <input className="input input-grande" name="titulo" defaultValue={tarea?.titulo} placeholder="¿Qué hay que hacer?" required maxLength={200} autoFocus={!tarea} />
      </label>

      <div className="dos">
        <label className="campo">
          <span className="campo-label">{repetir === "nunca" ? "Fecha" : "Empieza"}</span>
          <input className="input" type="date" name="fecha" value={fechaSel} onChange={(e) => setFechaSel(e.target.value)} required />
        </label>
        <label className="campo">
          <span className="campo-label">Hora</span>
          <input className="input" type="time" name="hora" defaultValue={tarea?.hora ?? hora} onChange={(e) => setConHora(Boolean(e.target.value))} />
        </label>
      </div>
      {!conHora && <span className="campo-ayuda" style={{ marginTop: -8 }}>Sin hora = todo el día (los recordatorios cuentan desde las 9:00).</span>}

      {conHora && (
        <label className="campo">
          <span className="campo-label">Duración</span>
          <select className="input" name="duracion" defaultValue={tarea?.duracion ?? ""}>
            <option value="">Sin duración</option>
            {DURACIONES.map((d) => (
              <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60} h`.replace(".5", ",5")}</option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="campo">
        <legend className="campo-label">Repetir</legend>
        <select className="input" name="repetir" value={repetir} onChange={(e) => setRepetir(e.target.value as TipoRepeticion)}>
          {REPETIR.map((r) => (
            <option key={r.id} value={r.id}>{r.texto}</option>
          ))}
        </select>
        {repetir !== "nunca" && (
          <>
            <div className="input-grupo" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="muted">Cada</span>
              <input className="input" style={{ width: 80 }} type="number" name="cada" min={1} max={99} value={cada} onChange={(e) => setCada(Number(e.target.value) || 1)} inputMode="numeric" />
              <span className="muted">{cada === 1 ? unidad[0] : unidad[1]}</span>
            </div>
            {repetir === "semanal" && (
              <div className="opciones dias" key={fechaSel}>
                {DIAS.map((d) => (
                  <label key={d.v} className="opcion">
                    <input type="checkbox" name="dias" value={d.v} defaultChecked={dias.includes(d.v)} />
                    <span>{d.t}</span>
                  </label>
                ))}
              </div>
            )}
            <label className="campo">
              <span className="campo-ayuda">Hasta (opcional)</span>
              <input className="input" type="date" name="hasta" defaultValue={tarea?.repetir.hasta} min={fechaSel} />
            </label>
          </>
        )}
      </fieldset>

      <fieldset className="campo">
        <legend className="campo-label">Recordatorios</legend>
        <div className="opciones">
          {RECORDATORIOS.map((r) => (
            <label key={r.min} className="opcion">
              <input type="checkbox" name="recordatorios" value={r.min} defaultChecked={recordatorios.includes(r.min)} />
              <span>{r.texto}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="campo">
        <span className="campo-label">Notas</span>
        <textarea className="input" name="notas" rows={3} defaultValue={tarea?.notas} placeholder="Detalles, enlaces, teléfono…" />
      </label>

      {estado?.error && <p className="error" role="alert">{estado.error}</p>}

      <div className="form-acciones">
        <button type="button" className="btn btn-secundario" onClick={() => router.back()}>Cancelar</button>
        <button className="btn btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}
