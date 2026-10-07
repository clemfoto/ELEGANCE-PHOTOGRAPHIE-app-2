import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { negocio } from "@/config/negocios";
import { atrasadas as calcAtrasadas, pendientesPrimero } from "@/lib/agenda";
import { listarMovimientos, listarTareas } from "@/lib/datos";
import { fechaRelativa, hoyISO, inicioSemana, sumarDias } from "@/lib/fechas";
import { dinero } from "@/lib/formato";
import { describirRepeticion, ocurrencias } from "@/lib/recurrencia";
import FilaTarea from "@/components/FilaTarea";
import { Icono } from "@/components/Iconos";
import type { Ocurrencia } from "@/lib/tipos";

type Props = { params: Promise<{ negocio: string }>; searchParams: Promise<{ ver?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: negocio((await params).negocio)?.corto ?? "Negocio" };
}

const VISTAS = [
  { id: "pendientes", titulo: "Pendientes" },
  { id: "repetitivas", titulo: "Repetitivas" },
  { id: "hechas", titulo: "Hechas" },
];

function porDia(os: Ocurrencia[]) {
  const m = new Map<string, Ocurrencia[]>();
  for (const o of os) m.set(o.fecha, [...(m.get(o.fecha) ?? []), o]);
  return [...m.entries()];
}

export default async function PaginaNegocio({ params, searchParams }: Props) {
  const n = negocio((await params).negocio);
  if (!n) notFound();
  const pedida = (await searchParams).ver;
  const ver = VISTAS.some((v) => v.id === pedida) ? pedida! : "pendientes";

  const hoy = hoyISO();
  const [todas, movimientos] = await Promise.all([listarTareas(), listarMovimientos()]);
  const tareas = todas.filter((t) => t.negocio === n.id);
  const atrasadas = calcAtrasadas(tareas, hoy);
  const proximas = ocurrencias(tareas, hoy, sumarDias(hoy, 30));
  const hoyPend = proximas.filter((o) => o.fecha === hoy && !o.hecha).length;
  const finSemana = sumarDias(inicioSemana(hoy), 6);
  const semanaPend = proximas.filter((o) => o.fecha <= finSemana && !o.hecha).length;

  const mes = hoy.slice(0, 7);
  const delMes = movimientos.filter((m) => m.negocio === n.id && m.fecha.startsWith(mes));
  const balance = delMes.reduce((s, m) => s + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);

  const nuevaHref = `/tarea/nueva?negocio=${n.id}&volver=/n/${n.id}`;

  return (
    <>
      <header className="cabecera-negocio" style={{ background: n.color }}>
        <div className="cabecera-fila">
          <h1 className="titulo">{n.nombre}</h1>
          <Link href={nuevaHref} className="btn btn-secundario btn-chico btn-nuevo-escritorio">Nueva tarea</Link>
        </div>
        <dl className="cifras-negocio">
          <div><dt>Hoy</dt><dd>{hoyPend}</dd></div>
          <div><dt>Semana</dt><dd>{semanaPend}</dd></div>
          <Link href={`/dinero?n=${n.id}&mes=${mes}`}>
            <span>Balance mes</span>
            <strong>{dinero(balance)}</strong>
          </Link>
        </dl>
      </header>

      <nav className="segmentos" style={{ marginBottom: 16 }}>
        {VISTAS.map((v) => (
          <Link key={v.id} href={`/n/${n.id}${v.id === "pendientes" ? "" : `?ver=${v.id}`}`} className={`segmento ${ver === v.id ? "activo" : ""}`} replace>
            {v.titulo}
          </Link>
        ))}
      </nav>

      {ver === "pendientes" && (
        <>
          {atrasadas.length > 0 && (
            <section className="seccion">
              <h2 className="seccion-titulo alerta">Atrasadas <span className="contador">{atrasadas.length}</span></h2>
              <div className="filas">{atrasadas.map((o) => <FilaTarea key={o.tarea.id} o={o} hoy={hoy} conNegocio={false} />)}</div>
            </section>
          )}
          {porDia(proximas.filter((o) => !o.hecha || o.fecha === hoy)).map(([dia, os]) => (
            <section key={dia} className="seccion">
              <h2 className="seccion-titulo">{fechaRelativa(dia, hoy)}</h2>
              <div className="filas">{pendientesPrimero(os).map((o) => <FilaTarea key={`${o.tarea.id}-${o.fecha}`} o={o} hoy={hoy} conNegocio={false} />)}</div>
            </section>
          ))}
          {!atrasadas.length && !proximas.length && <p className="vacio-lista tarjeta">Nada pendiente en los próximos 30 días.</p>}
        </>
      )}

      {ver === "repetitivas" && (
        <section className="seccion">
          <div className="filas">
            {tareas
              .filter((t) => t.repetir.tipo !== "nunca")
              .sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? "") || a.titulo.localeCompare(b.titulo))
              .map((t) => (
                <Link key={t.id} href={`/tarea/${t.id}`} className="fila tarjeta" style={{ "--color": n.color } as React.CSSProperties}>
                  <span className="fila-cuerpo">
                    <span className="fila-titulo">{t.titulo}</span>
                    <span className="fila-meta">
                      {t.hora && <span className="hora">{t.hora}</span>}
                      <span>{describirRepeticion(t.repetir, t.fecha)}</span>
                    </span>
                  </span>
                  <Icono id="repetir" tam={18} />
                </Link>
              ))}
          </div>
          {!tareas.some((t) => t.repetir.tipo !== "nunca") && <p className="vacio-lista tarjeta">Sin tareas repetitivas.</p>}
        </section>
      )}

      {ver === "hechas" && (() => {
        const hechas = ocurrencias(tareas, sumarDias(hoy, -30), hoy).filter((o) => o.hecha).reverse();
        return (
          <section className="seccion">
            <h2 className="seccion-titulo">Últimos 30 días <span className="contador">{hechas.length}</span></h2>
            {hechas.length ? (
              <div className="filas">{hechas.map((o) => <FilaTarea key={`${o.tarea.id}-${o.fecha}`} o={o} hoy={hoy} conNegocio={false} conFecha />)}</div>
            ) : (
              <p className="vacio-lista tarjeta">Todavía nada hecho.</p>
            )}
          </section>
        );
      })()}

      <div className="acciones" style={{ marginTop: 8 }}>
        <Link href={`/dinero/nuevo?negocio=${n.id}&tipo=ingreso&volver=/n/${n.id}`} className="btn btn-secundario btn-chico">+ Ingreso</Link>
        <Link href={`/dinero/nuevo?negocio=${n.id}&tipo=gasto&volver=/n/${n.id}`} className="btn btn-secundario btn-chico">+ Gasto</Link>
      </div>

      <Link href={nuevaHref} className="fab" aria-label="Nueva tarea" style={{ background: n.color }}><Icono id="mas" tam={28} /></Link>
    </>
  );
}
