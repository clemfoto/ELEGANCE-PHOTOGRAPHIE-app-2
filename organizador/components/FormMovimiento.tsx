"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, NEGOCIOS } from "@/config/negocios";
import { guardarMovimientoAccion } from "@/app/acciones";
import type { Movimiento } from "@/lib/tipos";

type Props = { mov?: Movimiento; negocio?: string; tipo?: string; fecha: string; volver: string; categoriasUsadas: string[] };

export default function FormMovimiento({ mov, negocio, tipo, fecha, volver, categoriasUsadas }: Props) {
  const [estado, accion, enviando] = useActionState(guardarMovimientoAccion, undefined);
  const router = useRouter();
  const [tipoSel, setTipoSel] = useState<"ingreso" | "gasto">(mov?.tipo ?? (tipo === "ingreso" ? "ingreso" : "gasto"));
  const sugeridas = [...new Set([...CATEGORIAS[tipoSel], ...categoriasUsadas])];

  return (
    <form action={accion} className="form">
      {mov && <input type="hidden" name="id" value={mov.id} />}
      <input type="hidden" name="volver" value={volver} />

      <div className="opciones tipo-mov">
        {(["ingreso", "gasto"] as const).map((t) => (
          <label key={t} className="opcion">
            <input type="radio" name="tipo" value={t} checked={tipoSel === t} onChange={() => setTipoSel(t)} />
            <span>{t === "ingreso" ? "Ingreso" : "Gasto"}</span>
          </label>
        ))}
      </div>

      <fieldset className="campo">
        <legend className="campo-label">Negocio</legend>
        <div className="opciones negocio-opciones">
          {NEGOCIOS.map((n) => (
            <label key={n.id} className="opcion" style={{ "--color": n.color } as React.CSSProperties}>
              <input type="radio" name="negocio" value={n.id} defaultChecked={(mov?.negocio ?? negocio ?? NEGOCIOS[0].id) === n.id} required />
              <span>{n.corto}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="campo">
        <span className="campo-label">Monto (MXN)</span>
        <input className="input input-monto" name="monto" inputMode="decimal" defaultValue={mov?.monto} placeholder="0" required autoFocus={!mov} />
      </label>

      <label className="campo">
        <span className="campo-label">Concepto</span>
        <input className="input" name="concepto" defaultValue={mov?.concepto} placeholder={tipoSel === "ingreso" ? "Ej. Anticipo boda García" : "Ej. Suscripción Adobe"} required maxLength={200} />
      </label>

      <div className="dos">
        <label className="campo">
          <span className="campo-label">Fecha</span>
          <input className="input" type="date" name="fecha" defaultValue={mov?.fecha ?? fecha} required />
        </label>
        <label className="campo">
          <span className="campo-label">Categoría</span>
          <input className="input" name="categoria" list="categorias" defaultValue={mov?.categoria} placeholder="Elegir…" maxLength={60} />
          <datalist id="categorias">
            {sugeridas.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
      </div>

      <label className="campo">
        <span className="campo-label">Notas</span>
        <textarea className="input" name="notas" rows={2} defaultValue={mov?.notas} />
      </label>

      {estado?.error && <p className="error" role="alert">{estado.error}</p>}

      <div className="form-acciones">
        <button type="button" className="btn btn-secundario" onClick={() => router.back()}>Cancelar</button>
        <button className="btn btn-primario" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}
