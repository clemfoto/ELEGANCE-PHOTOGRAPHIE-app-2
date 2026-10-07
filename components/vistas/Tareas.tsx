import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { diasHasta, fecha, hoyISO, texto } from "@/lib/formato";
import { val } from "@/lib/lista";
import { Avatares, Chip } from "@/components/Valor";
import BotonHecha from "@/components/BotonHecha";

/** Días que faltan para el domingo de esta semana (semana de lunes a domingo). */
function diasHastaDomingo(): number {
  const dia = new Date(`${hoyISO()}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return dia === 0 ? 0 : 7 - dia;
}

export default function Tareas({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const fEstado = cfg(ctx, "estado");
  const fFecha = cfg(ctx, "fecha");
  const hechos = (ctx.g.estadosHechos as string[]) ?? [];
  const esHecha = (r: AirRecord) => hechos.includes(texto(val(r, fEstado)));
  const limite = diasHastaDomingo();

  const pendientes = regs.filter((r) => !esHecha(r));
  const semana = pendientes.filter((r) => {
    const d = diasHasta(val(r, fFecha));
    return d != null && d <= limite;
  });
  const proximas = pendientes.filter((r) => !semana.includes(r));
  const hechas = regs.filter(esHecha).reverse();

  return (
    <>
      <Grupo titulo="Esta semana" regs={semana} ctx={ctx} esHecha={esHecha} />
      <Grupo titulo="Próximas" regs={proximas} ctx={ctx} esHecha={esHecha} />
      <Grupo titulo="Hechas" regs={hechas} ctx={ctx} esHecha={esHecha} plegado />
    </>
  );
}

function Grupo({
  titulo,
  regs,
  ctx,
  esHecha,
  plegado,
}: {
  titulo: string;
  regs: AirRecord[];
  ctx: Contexto;
  esHecha: (r: AirRecord) => boolean;
  plegado?: boolean;
}) {
  if (!regs.length) return null;
  const contenido = (
    <div className="filas">
      {regs.map((r) => (
        <FilaTarea key={r.id} r={r} ctx={ctx} hecha={esHecha(r)} />
      ))}
    </div>
  );
  const cabecera = (
    <>
      {titulo} <span className="contador">{regs.length}</span>
    </>
  );
  if (plegado) {
    return (
      <details className="seccion">
        <summary className="seccion-titulo">{cabecera}</summary>
        {contenido}
      </details>
    );
  }
  return (
    <section className="seccion">
      <h2 className="seccion-titulo">{cabecera}</h2>
      {contenido}
    </section>
  );
}

function FilaTarea({ r, ctx, hecha }: { r: AirRecord; ctx: Contexto; hecha: boolean }) {
  const principal = campoPrincipal(ctx.t);
  const fFecha = cfg(ctx, "fecha");
  const d = diasHasta(val(r, fFecha));
  const urgente = !hecha && d != null && d <= Number(ctx.g.diasAviso ?? 2);
  // Se lee el enlace directamente: el rol Equipo no ve el campo, pero sí el resumen del evento.
  const eventos = ((r.fields[String(ctx.g.cliente)] as string[] | undefined) ?? []).map((id) => ctx.clientes?.get(id)).filter((x) => x != null);
  const prioridad = texto(val(r, cfg(ctx, "prioridad")));

  return (
    <div className={`fila tarjeta ${hecha ? "hecha" : ""}`}>
      <BotonHecha tabla={ctx.t.id} id={r.id} hecha={hecha} />
      <Link href={`${rutaTabla(ctx.t)}/${r.id}`} className="fila-cuerpo">
        <span className="fila-titulo">{textoPrincipal(r.fields[principal.name]) || "Sin nombre"}</span>
        <span className="fila-meta">
          {val(r, fFecha) ? (
            <span className={urgente ? "fecha-urgente" : ""}>
              {d === 0 ? "Hoy" : d === 1 ? "Mañana" : d != null && d < 0 ? `Venció ${fecha(val(r, fFecha))}` : fecha(val(r, fFecha))}
            </span>
          ) : null}
          {eventos.map((c) => c.nombre).join(", ")}
        </span>
        {eventos.map((c, i) =>
          c.fecha || c.venue ? (
            <span key={i} className="fila-meta tarea-evento">
              Evento: {[c.fecha && fecha(c.fecha), c.venue, c.servicio].filter(Boolean).join(" · ")}
            </span>
          ) : null,
        )}
      </Link>
      <div className="fila-lado">
        {prioridad && !hecha && <Chip nombre={prioridad} />}
        <Avatares ids={val(r, cfg(ctx, "responsables"))} enlaces={ctx.enlaces} />
      </div>
    </div>
  );
}
