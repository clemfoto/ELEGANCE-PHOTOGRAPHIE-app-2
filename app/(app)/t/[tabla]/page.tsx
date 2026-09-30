import Link from "next/link";
import type { Metadata } from "next";
import { getRegistros } from "@/lib/airtable";
import { contextoTabla } from "@/lib/contexto";
import { rutaTabla, titulo } from "@/lib/esquema";
import { buscar, filtrarOpcion, ordenar } from "@/lib/lista";
import { colorOpcion } from "@/lib/formato";
import Generica from "@/components/vistas/Generica";
import Clientes from "@/components/vistas/Clientes";
import Tareas from "@/components/vistas/Tareas";
import Entrega from "@/components/vistas/Entrega";
import Leads from "@/components/vistas/Leads";
import Contabilidad from "@/components/vistas/Contabilidad";
import Gastos from "@/components/vistas/Gastos";
import Equipo from "@/components/vistas/Equipo";

type Props = { params: Promise<{ tabla: string }>; searchParams: Promise<{ q?: string; f?: string }> };

const VISTAS = { clientes: Clientes, tareas: Tareas, entrega: Entrega, leads: Leads, contabilidad: Contabilidad, gastos: Gastos, equipo: Equipo };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await contextoTabla((await params).tabla);
  return { title: titulo(ctx.t) };
}

export default async function Lista({ params, searchParams }: Props) {
  const [{ tabla }, { q = "", f }] = await Promise.all([params, searchParams]);
  const ctx = await contextoTabla(tabla);
  const fFiltro = ctx.g.filtro ? ctx.campos.find((x) => x.name === ctx.g.filtro) : undefined;
  const orden = ctx.g.orden;

  let regs = await getRegistros(ctx.t.id);
  const total = regs.length;
  regs = buscar(regs, ctx.campos, q, ctx.enlaces.nombres);
  regs = filtrarOpcion(regs, fFiltro, f);
  regs = ordenar(regs, orden ? ctx.campos.find((x) => x.name === orden.campo) : undefined, orden?.dir);

  const Vista = (ctx.g.vista && VISTAS[ctx.g.vista]) || Generica;
  const base = rutaTabla(ctx.t);

  return (
    <>
      <header className="cabecera">
        <div className="cabecera-fila">
          <h1 className="titulo">{titulo(ctx.t)}</h1>
          <span className="muted">{regs.length === total ? total : `${regs.length} de ${total}`}</span>
          <Link href={`${base}/nuevo`} className="btn btn-primario btn-nuevo-escritorio">
            + Nuevo
          </Link>
        </div>
        <form className="buscador" action={base} role="search">
          {f && <input type="hidden" name="f" value={f} />}
          <input className="input" type="search" name="q" defaultValue={q} placeholder="Buscar…" aria-label="Buscar" enterKeyHint="search" />
        </form>
        {fFiltro && <Filtros base={base} q={q} activo={f} opciones={fFiltro.options?.choices?.map((c) => c.name) ?? []} />}
      </header>

      {regs.length ? <Vista ctx={ctx} regs={regs} /> : <p className="vacio-lista">{q || f ? "No hay resultados." : "Todavía no hay registros."}</p>}

      <Link href={`${base}/nuevo`} className="fab" aria-label="Nuevo registro">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </>
  );
}

function Filtros({ base, q, activo, opciones }: { base: string; q: string; activo?: string; opciones: string[] }) {
  const url = (op?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (op) p.set("f", op);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <nav className="filtros" aria-label="Filtrar">
      <Link href={url()} className={`filtro ${!activo ? "activo" : ""}`} replace scroll={false}>
        Todos
      </Link>
      {opciones.map((op) => {
        const [bg, fg] = colorOpcion(op);
        const on = activo === op;
        return (
          <Link
            key={op}
            href={url(op)}
            replace
            scroll={false}
            className={`filtro ${on ? "activo" : ""}`}
            style={on ? undefined : { background: bg, color: fg, borderColor: "transparent" }}
          >
            {op}
          </Link>
        );
      })}
    </nav>
  );
}
