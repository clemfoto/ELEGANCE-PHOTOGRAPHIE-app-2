import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { fecha, texto } from "@/lib/formato";
import { val } from "@/lib/lista";
import { Avatar, Chip } from "@/components/Valor";
import { EQUIPO } from "@/config/galerias";
import BotonConvertir from "@/components/BotonConvertir";

/** Los cuatro contactos como pasos 1º–4º, con quién hizo cada uno. */
export function Pasos({ r, ctx }: { r: AirRecord; ctx: Contexto }) {
  const contactos = ((ctx.g.contactos as string[]) ?? []).map((n) => ctx.campos.find((f) => f.name === n));
  const personas = ctx.enlaces.nombres[EQUIPO.tabla];
  return (
    <ol className="pasos">
      {contactos.map((f, i) => {
        const ids = (val(r, f) as string[] | undefined) ?? [];
        const hecho = ids.length > 0;
        const nombre = hecho ? personas?.get(ids[0]) ?? "?" : "";
        return (
          <li key={i} className={`paso ${hecho ? "hecho" : ""}`} title={hecho ? `${i + 1}º contacto: ${nombre}` : `${i + 1}º contacto pendiente`}>
            {hecho ? <Avatar nombre={nombre} /> : <span className="paso-num">{i + 1}º</span>}
            <span className="paso-nombre">{hecho ? nombre.split(" ")[0] : "—"}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Leads({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const principal = campoPrincipal(ctx.t);
  return (
    <div className="rejilla">
      {regs.map((r) => {
        const estado = texto(val(r, cfg(ctx, "estado")));
        const servicio = texto(val(r, cfg(ctx, "servicio")));
        const f = fecha(val(r, cfg(ctx, "fecha")));
        const cliente = ((val(r, cfg(ctx, "clienteRelacionado")) as string[]) ?? [])[0];
        return (
          <div key={r.id} className="tarjeta">
            <Link href={`${rutaTabla(ctx.t)}/${r.id}`} className="tarjeta-enlace-bloque">
              <div className="tarjeta-fila">
                <h3 className="tarjeta-titulo">{textoPrincipal(r.fields[principal.name]) || "Sin nombre"}</h3>
                {estado && <Chip nombre={estado} />}
              </div>
              <p className="tarjeta-meta">{[f, servicio].filter(Boolean).join(" · ") || "Sin fecha"}</p>
              <Pasos r={r} ctx={ctx} />
            </Link>
            <AccionLead id={r.id} cliente={cliente} ctx={ctx} />
          </div>
        );
      })}
    </div>
  );
}

export function AccionLead({ id, cliente, ctx }: { id: string; cliente?: string; ctx: Contexto }) {
  const f = cfg(ctx, "clienteRelacionado");
  const destino = f?.options?.linkedTableId;
  if (cliente && destino && ctx.enlaces.rutas[destino]) {
    return (
      <Link href={`${ctx.enlaces.rutas[destino]}/${cliente}`} className="btn btn-secundario btn-bloque">
        Ver cliente
      </Link>
    );
  }
  if (cliente) return null;
  return <BotonConvertir id={id} />;
}
