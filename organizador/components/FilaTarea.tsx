import Link from "next/link";
import { negocio } from "@/config/negocios";
import { fechaRelativa, horaFin } from "@/lib/fechas";
import type { Ocurrencia } from "@/lib/tipos";
import CheckHecha from "./CheckHecha";
import { Icono } from "./Iconos";

type Props = { o: Ocurrencia; hoy: string; conNegocio?: boolean; conFecha?: boolean };

export default function FilaTarea({ o, hoy, conNegocio = true, conFecha = false }: Props) {
  const t = o.tarea;
  const n = negocio(t.negocio)!;
  const atrasada = !o.hecha && o.fecha < hoy;
  return (
    <div className={`fila tarjeta ${o.hecha ? "hecha" : ""}`} style={{ "--color": n.color } as React.CSSProperties}>
      <CheckHecha id={t.id} fecha={o.fecha} hecha={o.hecha} color={n.color} />
      <Link href={`/tarea/${t.id}?fecha=${o.fecha}`} className="fila-cuerpo">
        <span className="fila-titulo">{t.titulo}</span>
        <span className="fila-meta">
          {t.hora && (
            <span className="hora">
              {t.hora}
              {t.duracion ? `–${horaFin(t.hora, t.duracion)}` : ""}
            </span>
          )}
          {(conFecha || atrasada) && <span className={atrasada ? "atrasada" : ""}>{fechaRelativa(o.fecha, hoy)}</span>}
          {conNegocio && <span className="chip" style={{ background: n.suave, color: n.color }}>{n.corto}</span>}
          {t.repetir.tipo !== "nunca" && (
            <span title="Repetitiva" aria-label="Repetitiva"><Icono id="repetir" tam={14} /></span>
          )}
          {t.recordatorios.length > 0 && (
            <span title="Con recordatorio" aria-label="Con recordatorio"><Icono id="campana" tam={14} /></span>
          )}
        </span>
      </Link>
    </div>
  );
}
