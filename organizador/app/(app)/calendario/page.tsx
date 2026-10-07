import Link from "next/link";
import type { Metadata } from "next";
import { NEGOCIOS, negocio, type NegocioId } from "@/config/negocios";
import { listarTareas } from "@/lib/datos";
import { esFecha, fechaLarga, horaActual, horaFin, hoyISO, inicioSemana, minutos, nombreMes, sumarDias, sumarMeses } from "@/lib/fechas";
import { ocurrencias, ordenar } from "@/lib/recurrencia";
import FilaTarea from "@/components/FilaTarea";
import { Icono } from "@/components/Iconos";
import type { Ocurrencia } from "@/lib/tipos";

export const metadata: Metadata = { title: "Calendario" };

type Vista = "mes" | "semana" | "dia";
type Props = { searchParams: Promise<{ vista?: string; fecha?: string; n?: string }> };

const CAB = ["L", "M", "X", "J", "V", "S", "D"];
const ALTO_HORA = 56;

export default async function Calendario({ searchParams }: Props) {
  const p = await searchParams;
  const hoy = hoyISO();
  const vista: Vista = p.vista === "semana" || p.vista === "dia" ? p.vista : "mes";
  const fecha = esFecha(p.fecha) ? p.fecha : hoy;
  const filtro = (p.n ?? "").split(",").filter((x): x is NegocioId => Boolean(negocio(x)));
  const activos = filtro.length ? filtro : NEGOCIOS.map((n) => n.id);

  const url = (cambios: { vista?: Vista; fecha?: string; n?: NegocioId[] }) => {
    const q = new URLSearchParams();
    q.set("vista", cambios.vista ?? vista);
    q.set("fecha", cambios.fecha ?? fecha);
    const nn = cambios.n ?? filtro;
    if (nn.length && nn.length < NEGOCIOS.length) q.set("n", nn.join(","));
    return `/calendario?${q}`;
  };

  // Rango visible
  let desde: string, hasta: string, titulo: string, anterior: string, siguiente: string;
  const mes = fecha.slice(0, 7);
  if (vista === "mes") {
    desde = inicioSemana(`${mes}-01`);
    const ultimo = sumarDias(`${sumarMeses(mes, 1)}-01`, -1);
    hasta = sumarDias(inicioSemana(ultimo), 6);
    titulo = nombreMes(mes);
    anterior = `${sumarMeses(mes, -1)}-01`;
    siguiente = `${sumarMeses(mes, 1)}-01`;
  } else if (vista === "semana") {
    desde = inicioSemana(fecha);
    hasta = sumarDias(desde, 6);
    const [d1, d2] = [new Date(`${desde}T12:00:00Z`), new Date(`${hasta}T12:00:00Z`)];
    const f = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
    titulo = `${f.format(d1)} – ${f.format(d2)}`.replace(/\./g, "");
    anterior = sumarDias(fecha, -7);
    siguiente = sumarDias(fecha, 7);
  } else {
    desde = hasta = fecha;
    titulo = fechaLarga(fecha);
    anterior = sumarDias(fecha, -1);
    siguiente = sumarDias(fecha, 1);
  }

  const tareas = (await listarTareas()).filter((t) => activos.includes(t.negocio));
  const os = ocurrencias(tareas, desde, hasta);
  const porDia = new Map<string, Ocurrencia[]>();
  for (const o of os) porDia.set(o.fecha, [...(porDia.get(o.fecha) ?? []), o]);
  const del = (d: string) => porDia.get(d) ?? [];

  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);
  const nueva = (d: string, hora?: string) => `/tarea/nueva?fecha=${d}${hora ? `&hora=${hora}` : ""}&volver=${encodeURIComponent(url({ fecha: d }))}`;

  return (
    <>
      <header className="cabecera">
        <div className="cabecera-fila">
          <h1 className="titulo">Calendario</h1>
          <Link href={nueva(fecha)} className="btn btn-primario btn-nuevo-escritorio">Nueva tarea</Link>
        </div>
        <nav className="segmentos">
          {(["dia", "semana", "mes"] as Vista[]).map((v) => (
            <Link key={v} href={url({ vista: v })} className={`segmento ${vista === v ? "activo" : ""}`} replace>
              {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
            </Link>
          ))}
        </nav>
        <div className="cal-nav">
          <Link href={url({ fecha: anterior })} className="btn btn-secundario btn-chico" aria-label="Anterior" replace>‹</Link>
          <span className="cal-titulo">{titulo}</span>
          <Link href={url({ fecha: hoy })} className="btn btn-secundario btn-chico" replace>Hoy</Link>
          <Link href={url({ fecha: siguiente })} className="btn btn-secundario btn-chico" aria-label="Siguiente" replace>›</Link>
        </div>
        <div className="filtros">
          {NEGOCIOS.map((n) => {
            const on = activos.includes(n.id);
            const otros = on ? activos.filter((x) => x !== n.id) : [...activos, n.id];
            return (
              <Link key={n.id} href={url({ n: otros.length ? otros : NEGOCIOS.map((x) => x.id) })} className="filtro" replace
                style={on ? { background: n.color, borderColor: n.color, color: "#fff" } : { opacity: 0.6 }} aria-pressed={on}>
                <i style={{ background: on ? "#fff" : n.color }} />
                {n.corto}
              </Link>
            );
          })}
        </div>
      </header>

      {vista === "mes" && (
        <>
          <div className="mes tarjeta">
            {CAB.map((c) => <span key={c} className="mes-cab">{c}</span>)}
            {dias.map((d) => {
              const evs = del(d);
              return (
                <Link key={d} href={url({ fecha: d })} replace scroll={false}
                  className={`mes-dia ${d.startsWith(mes) ? "" : "fuera"} ${d === hoy ? "hoy" : ""} ${d === fecha ? "elegido" : ""}`}>
                  <span className="mes-num">{Number(d.slice(8))}</span>
                  <span className="puntos">
                    {evs.slice(0, 6).map((o, i) => <i key={i} style={{ background: negocio(o.tarea.negocio)!.color, opacity: o.hecha ? 0.35 : 1 }} />)}
                  </span>
                  <span className="etiquetas">
                    {evs.slice(0, 3).map((o, i) => (
                      <span key={i} className={o.hecha ? "hecha" : ""} style={{ borderColor: negocio(o.tarea.negocio)!.color }}>
                        {o.tarea.hora ? `${o.tarea.hora} ` : ""}{o.tarea.titulo}
                      </span>
                    ))}
                    {evs.length > 3 && <small>+{evs.length - 3} más</small>}
                  </span>
                </Link>
              );
            })}
          </div>
          <section className="seccion">
            <div className="cabecera-fila" style={{ marginBottom: 10 }}>
              <h2 className="seccion-titulo" style={{ flex: 1, margin: 0 }}>{fechaLarga(fecha)}{fecha === hoy ? " · hoy" : ""}</h2>
              <Link href={url({ vista: "dia" })} className="btn btn-secundario btn-chico">Ver día</Link>
            </div>
            {del(fecha).length ? (
              <div className="filas">{del(fecha).map((o) => <FilaTarea key={o.tarea.id} o={o} hoy={hoy} />)}</div>
            ) : (
              <p className="vacio-lista tarjeta">Nada este día.</p>
            )}
          </section>
        </>
      )}

      {vista === "semana" && (
        <>
          <div className="semana-tira">
            {dias.map((d, i) => (
              <a key={d} href={`#d-${d}`} className={d === hoy ? "hoy" : ""}>
                {CAB[i]}
                <strong>{Number(d.slice(8))}</strong>
                <span className="puntos">{del(d).slice(0, 4).map((o, j) => <i key={j} style={{ background: negocio(o.tarea.negocio)!.color }} />)}</span>
              </a>
            ))}
          </div>
          <div className="semana-cols">
            {dias.map((d) => (
              <section key={d} id={`d-${d}`} className={`dia-semana ${d === hoy ? "hoy" : ""}`}>
                <h3>
                  <Link href={url({ vista: "dia", fecha: d })} style={{ textDecoration: "none" }}>{fechaLarga(d)}{d === hoy ? " · hoy" : ""}</Link>
                  <Link href={nueva(d)} className="mas-dia" aria-label={`Nueva tarea el ${d}`}>+</Link>
                </h3>
                {del(d).length ? (
                  <div className="filas">{del(d).map((o) => <FilaTarea key={o.tarea.id} o={o} hoy={hoy} />)}</div>
                ) : (
                  <p className="nada">—</p>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {vista === "dia" && <VistaDia os={del(fecha)} fecha={fecha} hoy={hoy} nueva={nueva} />}

      <Link href={nueva(fecha)} className="fab" aria-label="Nueva tarea"><Icono id="mas" tam={28} /></Link>
    </>
  );
}

/** Columnas para bloques que se solapan. */
function columnas(os: Ocurrencia[]) {
  const items = ordenar([...os]).map((o) => {
    const ini = minutos(o.tarea.hora!);
    return { o, ini, fin: ini + Math.max(o.tarea.duracion ?? 30, 30), col: 0, cols: 1 };
  });
  let grupo: typeof items = [];
  let finGrupo = -1;
  const cerrar = () => {
    const n = Math.max(...grupo.map((g) => g.col)) + 1;
    grupo.forEach((g) => (g.cols = n));
  };
  for (const it of items) {
    if (it.ini >= finGrupo && grupo.length) {
      cerrar();
      grupo = [];
    }
    const usadas = new Set(grupo.filter((g) => g.fin > it.ini).map((g) => g.col));
    while (usadas.has(it.col)) it.col++;
    grupo.push(it);
    finGrupo = Math.max(finGrupo, it.fin);
  }
  if (grupo.length) cerrar();
  return items;
}

function VistaDia({ os, fecha, hoy, nueva }: { os: Ocurrencia[]; fecha: string; hoy: string; nueva: (d: string, h?: string) => string }) {
  const sinHora = os.filter((o) => !o.tarea.hora);
  const conHora = columnas(os.filter((o) => o.tarea.hora));
  const primera = Math.min(7, ...conHora.map((c) => Math.floor(c.ini / 60)));
  const ultima = Math.max(22, ...conHora.map((c) => Math.ceil(c.fin / 60)));
  const horas = Array.from({ length: Math.min(ultima, 24) - primera }, (_, i) => primera + i);
  const ahora = fecha === hoy ? minutos(horaActual()) : null;

  return (
    <>
      {sinHora.length > 0 && (
        <section className="todo-el-dia">
          <h2 className="seccion-titulo" style={{ margin: 0 }}>Todo el día</h2>
          <div className="filas">{sinHora.map((o) => <FilaTarea key={o.tarea.id} o={o} hoy={hoy} />)}</div>
        </section>
      )}
      <div className="horas">
        <div className="lienzo">
          {horas.map((h) => {
            const hh = `${String(h).padStart(2, "0")}:00`;
            return (
              <Link key={h} href={nueva(fecha, hh)} className="hora-fila" aria-label={`Nueva tarea a las ${hh}`}>
                <span>{hh}</span>
              </Link>
            );
          })}
          {conHora.map(({ o, ini, fin, col, cols }) => {
            const n = negocio(o.tarea.negocio)!;
            const top = ((ini - primera * 60) / 60) * ALTO_HORA;
            const alto = Math.max(((fin - ini) / 60) * ALTO_HORA - 2, 26);
            return (
              <Link key={o.tarea.id} href={`/tarea/${o.tarea.id}?fecha=${o.fecha}`} className={`bloque-hora ${o.hecha ? "hecha" : ""}`}
                style={{ top, height: alto, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`, "--color": n.color, "--suave": n.suave } as React.CSSProperties}>
                <strong>{o.tarea.titulo}</strong>
                {alto > 36 && <span>{o.tarea.hora}{o.tarea.duracion ? `–${horaFin(o.tarea.hora!, o.tarea.duracion)}` : ""} · {n.corto}</span>}
              </Link>
            );
          })}
          {ahora !== null && ahora >= primera * 60 && ahora <= ultima * 60 && (
            <div className="ahora" style={{ top: ((ahora - primera * 60) / 60) * ALTO_HORA }} aria-hidden="true" />
          )}
        </div>
      </div>
      {!os.length && <p className="muted" style={{ textAlign: "center", marginTop: 12 }}>Nada este día. Toca una hora para añadir una tarea.</p>}
    </>
  );
}
