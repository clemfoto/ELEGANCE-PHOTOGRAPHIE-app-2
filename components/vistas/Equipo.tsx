import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { texto } from "@/lib/formato";
import { val } from "@/lib/lista";
import { Avatar, Chip } from "@/components/Valor";

export default function Equipo({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const principal = campoPrincipal(ctx.t);
  return (
    <div className="filas">
      {regs.map((r) => {
        const nombre = textoPrincipal(r.fields[principal.name]) || "Sin nombre";
        // "Eventos asignados" no se muestra en la ficha, pero sí se cuenta aquí.
        const eventos = ((r.fields[String(ctx.g.eventos)] as unknown[] | undefined) ?? []).length;
        const activo = val(r, cfg(ctx, "activo")) === true;
        const rol = texto(val(r, cfg(ctx, "rol")));
        return (
          <Link key={r.id} href={`${rutaTabla(ctx.t)}/${r.id}`} className={`fila tarjeta ${activo ? "" : "inactivo"}`}>
            <Avatar nombre={nombre} />
            <span className="fila-cuerpo">
              <span className="fila-titulo">{nombre}</span>
              <span className="fila-meta">
                {eventos} {eventos === 1 ? "evento" : "eventos"}
                {!activo && " · sin acceso"}
              </span>
            </span>
            {rol && <Chip nombre={rol} />}
          </Link>
        );
      })}
    </div>
  );
}
