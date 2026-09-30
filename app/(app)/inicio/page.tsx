import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { AirRecord } from "@/lib/airtable";
import { requireUsuario } from "@/lib/auth";
import { enlacesGlobales } from "@/lib/contexto";
import { esAdmin, nombreDeRegistro } from "@/lib/esquema";
import { decisiones } from "@/lib/panel";
import { diasHasta, dinero, fecha, mayuscula, texto } from "@/lib/formato";
import { aNumero } from "@/lib/lista";
import { Avatares } from "@/components/Valor";
import BotonAccion from "@/components/BotonAccion";
import { DECISIONES, GALERIAS, TABLAS } from "@/config/galerias";

export const metadata: Metadata = { title: "Inicio" };

const g = (tabla: string, clave: string) => String(GALERIAS[tabla]?.[clave] ?? "");
const v = (r: AirRecord, tabla: string, clave: string) => r.fields[g(tabla, clave)];

function hace(dias: number | null): string {
  if (dias == null) return "";
  const n = Math.abs(dias);
  if (dias === 0) return "hoy";
  if (dias < 0) return n === 1 ? "hace 1 día" : `hace ${n} días`;
  return n === 1 ? "mañana" : `en ${n} días`;
}

export default async function Inicio() {
  const u = await requireUsuario();
  const admin = esAdmin(u);
  // El panel de decisiones es solo para administradores.
  if (!admin) redirect("/");
  const [d, enlaces, nombreGasto, nombreLead, nombreConta, nombreTarea] = await Promise.all([
    decisiones(u),
    enlacesGlobales(u),
    nombreDeRegistro(TABLAS.gastos),
    nombreDeRegistro(TABLAS.leads),
    nombreDeRegistro(TABLAS.contabilidad),
    nombreDeRegistro(TABLAS.tareas),
  ]);
  const clientes = enlaces.nombres[TABLAS.clientes];
  const ruta = (tabla: string, id: string) => (enlaces.rutas[tabla] ? `${enlaces.rutas[tabla]}/${id}` : undefined);
  const nombreCliente = (r: AirRecord, campo: string) =>
    ((r.fields[campo] as string[] | undefined) ?? []).map((id) => clientes.get(id) ?? "").filter(Boolean).join(", ");
  const saludo = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d.hoy}T12:00:00`));

  return (
    <>
      <header className="cabecera">
        <p className="muted inicio-fecha">{mayuscula(saludo)}</p>
        <h1 className="titulo">Hola, {u.nombre.split(" ")[0]}</h1>
      </header>

      <section className="seccion">
        <div className="cabecera-fila">
          <h2 className="seccion-titulo">
            Lo que necesita decisión <span className="contador">{d.total}</span>
          </h2>
          <Link href="/calendario" className="btn btn-secundario btn-chico">
            Calendario
          </Link>
        </div>

        {d.total === 0 && <p className="tarjeta todo-ok">Todo al día. No hay nada pendiente de decidir. ✓</p>}

        <Grupo titulo="Entregas esperando visto bueno" n={d.entregasRevision.length}>
          {d.entregasRevision.map((r) => (
            <Fila key={r.id} href={ruta(TABLAS.entrega, r.id)} titulo={nombreCliente(r, g(TABLAS.entrega, "cliente")) || "Entrega"}
              meta={[v(r, TABLAS.entrega, "fecha") && `Entrega ${fecha(v(r, TABLAS.entrega, "fecha"))}`, texto(v(r, TABLAS.entrega, "link")) && "con link"]}
              lado={<Avatares ids={v(r, TABLAS.entrega, "responsable")} enlaces={enlaces} />}
              accion={admin && <BotonAccion accion="aprobarEntrega" id={r.id}>Dar visto bueno</BotonAccion>} />
          ))}
        </Grupo>

        {admin && (
          <Grupo titulo="Gastos por aprobar" n={d.gastosPorAprobar.length} nota={`Más de ${dinero(DECISIONES.limiteGasto)}: lo aprueba un socio distinto de quien pagó.`}>
            {d.gastosPorAprobar.map((r) => {
              const pagadores = (v(r, TABLAS.gastos, "pagador") as string[] | undefined) ?? [];
              const loPague = pagadores.includes(u.id);
              return (
                <Fila key={r.id} href={ruta(TABLAS.gastos, r.id)} titulo={nombreGasto(r) || "Gasto"}
                  meta={[dinero(aNumero(v(r, TABLAS.gastos, "monto"))), fecha(v(r, TABLAS.gastos, "fecha")), texto(v(r, TABLAS.gastos, "categoria"))]}
                  lado={<Avatares ids={pagadores} enlaces={enlaces} />}
                  accion={loPague ? <span className="nota-chica">Lo aprueba otro socio</span> : (
                    <>
                      <BotonAccion accion="aprobarGasto" id={r.id}>Aprobar</BotonAccion>
                      <BotonAccion accion="rechazarGasto" id={r.id} tipo="secundario" confirmar="¿Rechazar este gasto?">Rechazar</BotonAccion>
                    </>
                  )} />
              );
            })}
          </Grupo>
        )}

        <Grupo titulo="Leads sin primer contacto" n={d.leadsSinContacto.length} nota={`Llevan más de ${DECISIONES.horasLeadSinContacto} horas sin que nadie les escriba.`}>
          {d.leadsSinContacto.map((r) => (
            <Fila key={r.id} href={ruta(TABLAS.leads, r.id)} titulo={nombreLead(r) || "Lead"}
              meta={[`Entró ${hace(diasHasta(r.createdTime.slice(0, 10)))}`, texto(v(r, TABLAS.leads, "servicio")), v(r, TABLAS.leads, "fecha") && `Evento ${fecha(v(r, TABLAS.leads, "fecha"))}`]} />
          ))}
        </Grupo>

        {admin && (
          <Grupo titulo="Pagos vencidos" n={d.pagosVencidos.length} nota={`Saldo pendiente más de ${DECISIONES.diasPagoVencido} días después de la fecha de balance.`}>
            {d.pagosVencidos.map((r) => (
              <Fila key={r.id} href={ruta(TABLAS.contabilidad, r.id)} titulo={nombreCliente(r, "Cliente") || nombreConta(r) || "Pago"}
                meta={[`Balance vencido ${hace(diasHasta(v(r, TABLAS.contabilidad, "fechaBalance")))}`]}
                lado={<strong className="precio">{dinero(aNumero(v(r, TABLAS.contabilidad, "pendiente")))}</strong>} />
            ))}
          </Grupo>
        )}

        <Grupo titulo="Clientes sin team members" n={d.sinTeam.length}>
          {d.sinTeam.map((r) => (
            <Fila key={r.id} href={ruta(TABLAS.clientes, r.id)} titulo={texto(r.fields[g(TABLAS.clientes, "nombre")])}
              meta={[fecha(v(r, TABLAS.clientes, "fecha")), hace(diasHasta(v(r, TABLAS.clientes, "fecha"))), texto(v(r, TABLAS.clientes, "venue"))]} />
          ))}
        </Grupo>

        <Grupo titulo="Fechas duplicadas" n={d.duplicadas.length} nota="Dos o más eventos el mismo día.">
          {d.duplicadas.map((x) => (
            <div key={x.fecha} className="tarjeta duplicada">
              <p className="duplicada-fecha">{mayuscula(fecha(x.fecha))} · {hace(diasHasta(x.fecha))}</p>
              {x.clientes.map((r) => (
                <Link key={r.id} href={ruta(TABLAS.clientes, r.id) ?? "#"} className="duplicada-cliente">
                  <span>{texto(r.fields[g(TABLAS.clientes, "nombre")])}</span>
                  <Avatares ids={v(r, TABLAS.clientes, "team")} enlaces={enlaces} />
                </Link>
              ))}
            </div>
          ))}
        </Grupo>
      </section>

      {d.misEventos.length > 0 && (
        <section className="seccion">
          <h2 className="seccion-titulo">Tus próximos eventos</h2>
          <div className="filas">
            {d.misEventos.map((r) => (
              <Fila key={r.id} href={ruta(TABLAS.clientes, r.id)} titulo={texto(r.fields[g(TABLAS.clientes, "nombre")])}
                meta={[fecha(v(r, TABLAS.clientes, "fecha")), hace(diasHasta(v(r, TABLAS.clientes, "fecha"))), texto(v(r, TABLAS.clientes, "venue"))]}
                lado={<Avatares ids={v(r, TABLAS.clientes, "team")} confirmados={v(r, TABLAS.clientes, "confirmados")} enlaces={enlaces} />} />
            ))}
          </div>
        </section>
      )}

      {d.misTareas.length > 0 && (
        <section className="seccion">
          <h2 className="seccion-titulo">Tus tareas</h2>
          <div className="filas">
            {d.misTareas.map((r) => {
              const dias = diasHasta(v(r, TABLAS.tareas, "fecha"));
              return (
                <Fila key={r.id} href={ruta(TABLAS.tareas, r.id)} titulo={nombreTarea(r) || "Tarea"}
                  meta={[nombreCliente(r, g(TABLAS.tareas, "cliente")), dias == null ? "sin fecha" : dias < 0 ? `venció ${hace(dias)}` : `vence ${hace(dias)}`]}
                  urgente={dias != null && dias <= 1} />
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function Grupo({ titulo, n, nota, children }: { titulo: string; n: number; nota?: string; children: React.ReactNode }) {
  if (!n) return null;
  return (
    <div className="grupo-decision">
      <h3 className="grupo-titulo">
        {titulo} <span className="contador alerta">{n}</span>
      </h3>
      {nota && <p className="nota-chica">{nota}</p>}
      <div className="filas">{children}</div>
    </div>
  );
}

function Fila({
  href,
  titulo,
  meta,
  lado,
  accion,
  urgente,
}: {
  href?: string;
  titulo: string;
  meta: unknown[];
  lado?: React.ReactNode;
  accion?: React.ReactNode;
  urgente?: boolean;
}) {
  const textoMeta = meta.filter((x) => typeof x === "string" && x).join(" · ");
  const cuerpo = (
    <>
      <span className="fila-cuerpo">
        <span className="fila-titulo">{titulo || "Sin nombre"}</span>
        {textoMeta && <span className={`fila-meta ${urgente ? "fecha-urgente" : ""}`}>{textoMeta}</span>}
      </span>
      {lado && <span className="fila-lado">{lado}</span>}
    </>
  );
  return (
    <div className="tarjeta decision">
      {href ? <Link href={href} className="fila decision-fila">{cuerpo}</Link> : <div className="fila decision-fila">{cuerpo}</div>}
      {accion && <div className="decision-acciones">{accion}</div>}
    </div>
  );
}
