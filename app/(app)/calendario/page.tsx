import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireUsuario } from "@/lib/auth";
import { esAdmin, esPropietario } from "@/lib/esquema";
import { TIPOS, eventosCalendario, tokenCalendario, type EventoCal } from "@/lib/calendario";
import { hoyISO, mayuscula, sumarDias } from "@/lib/formato";
import CopiarEnlace from "@/components/CopiarEnlace";

export const metadata: Metadata = { title: "Calendario" };

type Props = { searchParams: Promise<{ mes?: string }> };

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

function mesSiguiente(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default async function Calendario({ searchParams }: Props) {
  const u = await requireUsuario();
  const hoy = hoyISO();
  const pedido = (await searchParams).mes;
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) ? pedido : hoy.slice(0, 7);

  const eventos = await eventosCalendario(u);
  const delMes = eventos.filter((e) => e.dia.startsWith(mes));
  const porDia = new Map<string, EventoCal[]>();
  for (const e of delMes) porDia.set(e.dia, [...(porDia.get(e.dia) ?? []), e]);

  // Rejilla de lunes a domingo
  const primero = `${mes}-01`;
  const semanaDia = (new Date(`${primero}T12:00:00Z`).getUTCDay() + 6) % 7;
  const inicio = sumarDias(primero, -semanaDia);
  const ultimo = sumarDias(`${mesSiguiente(mes, 1)}-01`, -1);
  const celdas: string[] = [];
  for (let d = inicio; d <= ultimo || celdas.length % 7; d = sumarDias(d, 1)) celdas.push(d);

  const nombreMes = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${primero}T12:00:00Z`));
  const nombreDia = (d: string) =>
    new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const ruta = `/api/calendario/${tokenCalendario(u.id)}.ics`;
  const webcal = `webcal://${host}${ruta}`;
  const https = `${proto}://${host}${ruta}`;

  return (
    <>
      <header className="cabecera">
        <div className="cabecera-fila">
          <h1 className="titulo">{mayuscula(nombreMes)}</h1>
        </div>
        <nav className="cal-nav" aria-label="Cambiar de mes">
          <Link href={`/calendario?mes=${mesSiguiente(mes, -1)}`} className="btn btn-secundario btn-chico" aria-label="Mes anterior">‹</Link>
          <Link href="/calendario" className="btn btn-secundario btn-chico">Hoy</Link>
          <Link href={`/calendario?mes=${mesSiguiente(mes, 1)}`} className="btn btn-secundario btn-chico" aria-label="Mes siguiente">›</Link>
        </nav>
      </header>

      <div className="cal-leyenda">
        {Object.entries(TIPOS)
          .filter(([k]) => (esAdmin(u) || !["lead", "pago"].includes(k)) && (k !== "privado" || esPropietario(u)))
          .map(([k, t]) => (
          <span key={k}>
            <i style={{ background: t.color }} />
            {t.nombre}
          </span>
        ))}
      </div>

      <div className="cal tarjeta">
        {DIAS.map((d) => (
          <span key={d} className="cal-cab">{d}</span>
        ))}
        {celdas.map((d) => {
          const evs = porDia.get(d) ?? [];
          const fuera = !d.startsWith(mes);
          const clase = `cal-dia ${fuera ? "fuera" : ""} ${d === hoy ? "hoy" : ""} ${evs.length ? "con" : ""}`;
          const contenido = (
            <>
              <span className="cal-num">{Number(d.slice(8))}</span>
              <span className="cal-puntos">
                {evs.slice(0, 4).map((e, i) => (
                  <i key={i} style={{ background: TIPOS[e.tipo].color }} />
                ))}
              </span>
              <span className="cal-etiquetas">
                {evs.slice(0, 3).map((e, i) => (
                  <span key={i} style={{ borderColor: TIPOS[e.tipo].color }}>{e.titulo}</span>
                ))}
                {evs.length > 3 && <small>+{evs.length - 3}</small>}
              </span>
            </>
          );
          return evs.length && !fuera ? (
            <a key={d} href={`#d-${d}`} className={clase}>{contenido}</a>
          ) : (
            <span key={d} className={clase}>{contenido}</span>
          );
        })}
      </div>

      <section className="seccion">
        <h2 className="seccion-titulo">
          Agenda del mes <span className="contador">{delMes.length}</span>
        </h2>
        {!delMes.length && <p className="muted">Nada este mes.</p>}
        {[...porDia.entries()].map(([d, evs]) => (
          <div key={d} id={`d-${d}`} className={`agenda-dia ${d < hoy ? "pasado" : ""}`}>
            <h3 className="agenda-fecha">{mayuscula(nombreDia(d))}{d === hoy && " · hoy"}</h3>
            <div className="filas">
              {evs.map((e) => {
                const cuerpo = (
                  <>
                    <i className="agenda-marca" style={{ background: TIPOS[e.tipo].color }} />
                    <span className="fila-cuerpo">
                      <span className="fila-titulo">{e.titulo}</span>
                      <span className="fila-meta">{e.detalle}</span>
                    </span>
                  </>
                );
                return e.href ? (
                  <Link key={`${e.tipo}-${e.uid}`} href={e.href} className="fila tarjeta">{cuerpo}</Link>
                ) : (
                  <div key={`${e.tipo}-${e.uid}`} className="fila tarjeta">{cuerpo}</div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="tarjeta bloque">
        <h2 className="seccion-titulo">Verlo en el calendario del iPhone o la Mac</h2>
        <p className="muted">Suscríbete una vez y los eventos, entregas y vencimientos aparecerán solos en tu calendario (se actualiza cada hora).</p>
        <a className="btn btn-primario btn-bloque" href={webcal}>Suscribirme</a>
        <CopiarEnlace texto={https} />
        <span className="campo-ayuda">
          Si el botón no abre el calendario: iPhone → Ajustes → Calendario → Cuentas → Añadir cuenta → Otra → Añadir calendario suscrito, y pega el enlace.
          En Google Calendar: «Otros calendarios» → «Desde URL». El enlace es personal: no lo compartas.
        </span>
      </section>
    </>
  );
}
