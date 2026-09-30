import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { fecha, moneda } from "@/lib/formato";
import { aNumero, suma, val } from "@/lib/lista";
import { TABLAS } from "@/config/galerias";

export default function Contabilidad({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const principal = campoPrincipal(ctx.t);
  const fTotal = cfg(ctx, "total");
  const fDep = cfg(ctx, "deposito");
  const fPend = cfg(ctx, "pendiente");
  const pendiente = suma(regs, fPend);
  return (
    <>
      <div className="resumen">
        <span className="resumen-label">Total pendiente de cobro</span>
        <strong className="resumen-cifra">{moneda(pendiente, fPend) || "$0"}</strong>
        <span className="resumen-sub">
          {regs.filter((r) => aNumero(val(r, fPend)) > 0).length} clientes con saldo · cobrado {moneda(suma(regs, fDep), fDep) || "$0"}
        </span>
      </div>
      <div className="rejilla">
        {regs.map((r) => {
          const p = aNumero(val(r, fPend));
          return (
            <Link key={r.id} href={`${rutaTabla(ctx.t)}/${r.id}`} className="tarjeta tarjeta-link">
              <h3 className="tarjeta-titulo">
                {((r.fields["Cliente"] as string[] | undefined) ?? []).map((id) => ctx.enlaces.nombres[TABLAS.clientes]?.get(id)).filter(Boolean).join(", ") ||
                  textoPrincipal(r.fields[principal.name]) ||
                  "Sin cliente"}
              </h3>
              <dl className="cifras">
                <div>
                  <dt>Total</dt>
                  <dd>{moneda(aNumero(val(r, fTotal)), fTotal)}</dd>
                </div>
                <div>
                  <dt>Depósito</dt>
                  <dd>{moneda(aNumero(val(r, fDep)), fDep)}</dd>
                </div>
                <div>
                  <dt>Pendiente</dt>
                  <dd className={p > 0 ? "acento" : "ok"}>{moneda(p, fPend)}</dd>
                </div>
              </dl>
              <p className="tarjeta-meta">
                {val(r, cfg(ctx, "fechaBalance")) ? `Balance: ${fecha(val(r, cfg(ctx, "fechaBalance")))}` : "Sin fecha de balance"}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
