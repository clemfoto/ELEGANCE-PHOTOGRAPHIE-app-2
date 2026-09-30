import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { fecha, moneda, texto } from "@/lib/formato";
import { suma, val } from "@/lib/lista";
import { Avatares, Chip } from "@/components/Valor";
import BotonTicket from "@/components/BotonTicket";

export default function Gastos({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const principal = campoPrincipal(ctx.t);
  const fMonto = cfg(ctx, "monto");
  const fComp = cfg(ctx, "comprobante");
  return (
    <>
      {fComp && <BotonTicket tabla={ctx.t.id} campo={fComp.id} />}
      <p className="muted total-lista">Total de la lista: <strong>{moneda(suma(regs, fMonto), fMonto) || "$0"}</strong></p>
      <div className="filas">
        {regs.map((r) => {
          const cat = texto(val(r, cfg(ctx, "categoria")));
          const tieneTicket = Array.isArray(val(r, fComp)) && (val(r, fComp) as unknown[]).length > 0;
          return (
            <Link key={r.id} href={`${rutaTabla(ctx.t)}/${r.id}`} className="fila tarjeta">
              <span className="fila-cuerpo">
                <span className="fila-titulo">
                  {textoPrincipal(r.fields[principal.name]) || "Gasto sin concepto"}
                  {tieneTicket && <span className="clip" title="Tiene comprobante"> 📎</span>}
                </span>
                <span className="fila-meta">
                  {cat && <Chip nombre={cat} />}
                  {fecha(val(r, cfg(ctx, "fecha")))}
                </span>
              </span>
              <span className="fila-lado">
                <strong className="precio">{moneda(val(r, fMonto), fMonto)}</strong>
                <Avatares ids={val(r, cfg(ctx, "pagador"))} enlaces={ctx.enlaces} />
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
