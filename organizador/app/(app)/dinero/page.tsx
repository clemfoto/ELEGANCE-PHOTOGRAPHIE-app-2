import Link from "next/link";
import type { Metadata } from "next";
import { NEGOCIOS, negocio } from "@/config/negocios";
import { listarMovimientos } from "@/lib/datos";
import { fechaRelativa, hoyISO, mesCorto, nombreMes, sumarMeses } from "@/lib/fechas";
import { dinero } from "@/lib/formato";
import { Icono } from "@/components/Iconos";
import type { Movimiento } from "@/lib/tipos";

export const metadata: Metadata = { title: "Dinero" };

type Props = { searchParams: Promise<{ mes?: string; n?: string }> };

const totales = (ms: Movimiento[]) => {
  const ingresos = ms.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
  const gastos = ms.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.monto, 0);
  return { ingresos, gastos, balance: ingresos - gastos };
};

export default async function Dinero({ searchParams }: Props) {
  const p = await searchParams;
  const hoy = hoyISO();
  const mes = p.mes && /^\d{4}-\d{2}$/.test(p.mes) ? p.mes : hoy.slice(0, 7);
  const n = negocio(p.n ?? "");
  const url = (cambios: { mes?: string; n?: string | null }) => {
    const q = new URLSearchParams({ mes: cambios.mes ?? mes });
    const nn = cambios.n === undefined ? n?.id : cambios.n;
    if (nn) q.set("n", nn);
    return `/dinero?${q}`;
  };

  const todos = (await listarMovimientos()).filter((m) => !n || m.negocio === n.id);
  const delMes = todos.filter((m) => m.fecha.startsWith(mes)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado.localeCompare(a.creado));
  const t = totales(delMes);

  const porCategoria = new Map<string, number>();
  for (const m of delMes.filter((m) => m.tipo === "gasto")) porCategoria.set(m.categoria ?? "Sin categoría", (porCategoria.get(m.categoria ?? "Sin categoría") ?? 0) + m.monto);
  const categorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);

  const anio = mes.slice(0, 4);
  const meses = Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}`).filter((m) => m <= hoy.slice(0, 7) || todos.some((x) => x.fecha.startsWith(m)));
  const tAnio = totales(todos.filter((m) => m.fecha.startsWith(anio)));

  const porDia = new Map<string, Movimiento[]>();
  for (const m of delMes) porDia.set(m.fecha, [...(porDia.get(m.fecha) ?? []), m]);
  const volver = encodeURIComponent(url({}));
  const nuevo = (tipo: string) => `/dinero/nuevo?tipo=${tipo}${n ? `&negocio=${n.id}` : ""}&volver=${volver}`;

  return (
    <>
      <header className="cabecera">
        <div className="cabecera-fila">
          <h1 className="titulo">Dinero</h1>
          <a href={`/api/exportar?anio=${anio}${n ? `&n=${n.id}` : ""}`} className="btn btn-secundario btn-chico">CSV {anio}</a>
        </div>
        <div className="cal-nav">
          <Link href={url({ mes: sumarMeses(mes, -1) })} className="btn btn-secundario btn-chico" aria-label="Mes anterior" replace>‹</Link>
          <span className="cal-titulo">{nombreMes(mes)}</span>
          <Link href={url({ mes: hoy.slice(0, 7) })} className="btn btn-secundario btn-chico" replace>Hoy</Link>
          <Link href={url({ mes: sumarMeses(mes, 1) })} className="btn btn-secundario btn-chico" aria-label="Mes siguiente" replace>›</Link>
        </div>
        <div className="filtros">
          <Link href={url({ n: null })} className={`filtro ${!n ? "activo" : ""}`} replace>Todos</Link>
          {NEGOCIOS.map((x) => (
            <Link key={x.id} href={url({ n: x.id })} className="filtro" replace
              style={n?.id === x.id ? { background: x.color, borderColor: x.color, color: "#fff" } : undefined}>
              <i style={{ background: n?.id === x.id ? "#fff" : x.color }} />
              {x.corto}
            </Link>
          ))}
        </div>
      </header>

      <section className="resumen" style={n ? { background: n.color } : undefined}>
        <span className="resumen-label">Balance {n ? `· ${n.corto}` : ""}</span>
        <span className="resumen-cifra">{dinero(t.balance)}</span>
        <div className="resumen-fila">
          <div><span className="resumen-label">Ingresos</span><strong className="ingreso">+{dinero(t.ingresos)}</strong></div>
          <div><span className="resumen-label">Gastos</span><strong className="gasto">−{dinero(t.gastos)}</strong></div>
        </div>
      </section>

      <div className="acciones" style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <Link href={nuevo("ingreso")} className="btn btn-secundario"><span className="ingreso">+</span> Ingreso</Link>
        <Link href={nuevo("gasto")} className="btn btn-secundario"><span className="gasto">−</span> Gasto</Link>
      </div>

      {!n && (
        <section className="seccion tarjeta">
          <h2 className="seccion-titulo">Por negocio</h2>
          <table className="tabla">
            <thead><tr><th></th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead>
            <tbody>
              {NEGOCIOS.map((x) => {
                const tx = totales(delMes.filter((m) => m.negocio === x.id));
                return (
                  <tr key={x.id}>
                    <td><Link href={url({ n: x.id })} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="insignia" style={{ background: x.color, width: 20, height: 20, fontSize: 11, borderRadius: 6 }}>{x.inicial}</span>{x.corto}</Link></td>
                    <td className="ingreso">{dinero(tx.ingresos)}</td>
                    <td className="gasto">{dinero(tx.gastos)}</td>
                    <td><strong>{dinero(tx.balance)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {categorias.length > 0 && (
        <section className="seccion tarjeta">
          <h2 className="seccion-titulo">Gastos por categoría</h2>
          <div className="filas" style={{ gap: 10 }}>
            {categorias.map(([c, v]) => (
              <div key={c}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5 }}>
                  <span>{c}</span>
                  <span className="monto">{dinero(v)}</span>
                </div>
                <div className="barra"><i style={{ width: `${(v / t.gastos) * 100}%`, background: n?.color ?? "var(--acento)" }} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="seccion">
        <h2 className="seccion-titulo">Movimientos <span className="contador">{delMes.length}</span></h2>
        {!delMes.length && <p className="vacio-lista tarjeta">Sin movimientos este mes.</p>}
        {[...porDia.entries()].map(([d, ms]) => (
          <div key={d} style={{ marginBottom: 12 }}>
            <h3 className="muted" style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{fechaRelativa(d, hoy)}</h3>
            <div className="filas">
              {ms.map((m) => {
                const x = negocio(m.negocio)!;
                return (
                  <Link key={m.id} href={`/dinero/${m.id}?volver=${volver}`} className="fila tarjeta" style={{ "--color": x.color } as React.CSSProperties}>
                    <span className="fila-cuerpo">
                      <span className="fila-titulo">{m.concepto}</span>
                      <span className="fila-meta">
                        {m.categoria && <span>{m.categoria}</span>}
                        {!n && <span className="chip" style={{ background: x.suave, color: x.color }}>{x.corto}</span>}
                      </span>
                    </span>
                    <span className={`monto ${m.tipo}`}>{m.tipo === "ingreso" ? "+" : "−"}{dinero(m.monto)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="seccion tarjeta">
        <h2 className="seccion-titulo">Año {anio}</h2>
        <table className="tabla">
          <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead>
          <tbody>
            {meses.map((m) => {
              const tm = totales(todos.filter((x) => x.fecha.startsWith(m)));
              return (
                <tr key={m} style={m === mes ? { fontWeight: 700 } : undefined}>
                  <td><Link href={url({ mes: m })}>{mesCorto(m)}</Link></td>
                  <td className="ingreso">{dinero(tm.ingresos)}</td>
                  <td className="gasto">{dinero(tm.gastos)}</td>
                  <td>{dinero(tm.balance)}</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 700 }}>
              <td>Total</td>
              <td className="ingreso">{dinero(tAnio.ingresos)}</td>
              <td className="gasto">{dinero(tAnio.gastos)}</td>
              <td>{dinero(tAnio.balance)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <Link href={nuevo("gasto")} className="fab" aria-label="Nuevo movimiento"><Icono id="mas" tam={28} /></Link>
    </>
  );
}
