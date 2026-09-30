import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal, opciones } from "@/lib/esquema";
import { diasHasta, fecha, texto } from "@/lib/formato";
import { val } from "@/lib/lista";
import { Avatares, Chip } from "@/components/Valor";

export default function Entrega({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const principal = campoPrincipal(ctx.t);
  const fFecha = cfg(ctx, "fecha");
  return (
    <div className="rejilla">
      {regs.map((r) => {
        // El status puede ser de selección simple o múltiple.
        const status = opciones(val(r, cfg(ctx, "status")));
        const cambios = texto(val(r, cfg(ctx, "cambios")));
        const d = diasHasta(val(r, fFecha));
        return (
          <Link key={r.id} href={`${rutaTabla(ctx.t)}/${r.id}`} className="tarjeta tarjeta-link">
            <div className="tarjeta-fila">
              <h3 className="tarjeta-titulo">{textoPrincipal(r.fields[principal.name]) || "Sin cliente"}</h3>
              <Avatares ids={val(r, cfg(ctx, "responsable"))} enlaces={ctx.enlaces} />
            </div>
            <p className={`tarjeta-meta ${d != null && d <= 2 && d >= 0 ? "fecha-urgente" : ""}`}>
              {val(r, fFecha) ? `Entrega: ${fecha(val(r, fFecha))}` : "Sin fecha de entrega"}
            </p>
            {status.length > 0 && (
              <div className="chips">
                {status.map((s) => (
                  <Chip key={s} nombre={s} />
                ))}
              </div>
            )}
            {cambios && (
              <div className="destacado">
                <span className="destacado-titulo">Cambios deseados</span>
                <p className="multilinea recortado">{cambios}</p>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
