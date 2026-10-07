import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRegistro, getRegistros, type AirRecord } from "@/lib/airtable";
import { cfg, contextoTabla, type Contexto } from "@/lib/contexto";
import { campoPrincipal, esAdmin, esSoloLectura, rutaTabla, textoPrincipal, titulo } from "@/lib/esquema";
import { fecha, texto } from "@/lib/formato";
import { Valor } from "@/components/Valor";
import SubirArchivo from "@/components/SubirArchivo";
import BotonBorrar from "@/components/BotonBorrar";
import BotonHecha from "@/components/BotonHecha";
import { AccionLead, Pasos } from "@/components/vistas/Leads";
import PanelAcceso from "@/components/PanelAcceso";
import PanelTelegram from "@/components/PanelTelegram";
import PanelConfirmacion from "@/components/PanelConfirmacion";
import BotonAccion from "@/components/BotonAccion";
import { DECISIONES, EQUIPO, GALERIAS, TABLAS } from "@/config/galerias";

type Props = { params: Promise<{ tabla: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tabla, id } = await params;
  const ctx = await contextoTabla(tabla);
  const r = await getRegistro(ctx.t.id, id);
  return { title: r ? textoPrincipal(r.fields[campoPrincipal(ctx.t).name]) || titulo(ctx.t) : titulo(ctx.t) };
}

export default async function Ficha({ params }: Props) {
  const { tabla, id } = await params;
  const ctx = await contextoTabla(tabla);
  const r = await getRegistro(ctx.t.id, id);
  if (!r) notFound();

  const base = rutaTabla(ctx.t);
  const principal = campoPrincipal(ctx.t);
  const relacionados = (ctx.g.relacionados ?? []).filter((x) => ctx.campos.some((f) => f.name === x.campo));
  const enRelacionados = new Set(relacionados.map((x) => x.campo));
  const campos = ctx.campos.filter((f) => f.id !== principal.id && !enRelacionados.has(f.name));

  const hechos = (ctx.g.estadosHechos as string[] | undefined) ?? [];
  const esTarea = ctx.g.vista === "tareas" && cfg(ctx, "estado");

  return (
    <>
      <header className="cabecera cabecera-ficha">
        <Link href={base} className="volver">
          ‹ {titulo(ctx.t)}
        </Link>
        <div className="cabecera-fila">
          {esTarea && <BotonHecha tabla={ctx.t.id} id={r.id} hecha={hechos.includes(texto(r.fields[String(ctx.g.estado)]))} />}
          <h1 className="titulo titulo-ficha">{textoPrincipal(r.fields[principal.name]) || "Sin nombre"}</h1>
        </div>
        <div className="acciones">
          <Link href={`${base}/${r.id}/editar`} className="btn btn-primario">
            Editar
          </Link>
          {esAdmin(ctx.u) && <AccionesDecision r={r} tabla={ctx.t.id} yo={ctx.u.id} />}
          {esAdmin(ctx.u) && <BotonBorrar tabla={ctx.t.id} id={r.id} />}
        </div>
      </header>

      {ctx.t.id === EQUIPO.tabla && esAdmin(ctx.u) && <PanelAcceso r={r} esYo={r.id === ctx.u.id} />}
      {ctx.t.id === EQUIPO.tabla && esAdmin(ctx.u) && <PanelTelegram r={r} />}
      {ctx.t.id === TABLAS.clientes && esAdmin(ctx.u) && <PanelConfirmacion r={r} />}

      {ctx.g.vista === "tareas" && <EventoDeTarea r={r} ctx={ctx} />}

      {ctx.g.vista === "leads" && (
        <section className="tarjeta bloque">
          <h2 className="seccion-titulo">Contactos</h2>
          <Pasos r={r} ctx={ctx} />
          <AccionLead id={r.id} cliente={((r.fields[String(ctx.g.clienteRelacionado)] as string[]) ?? [])[0]} ctx={ctx} />
        </section>
      )}

      <section className="tarjeta bloque">
        <dl className="campos">
          {campos.map((f) => (
            <div key={f.id} className="campo-ficha">
              <dt>
                {f.name}
                {esSoloLectura(f) && <span className="calc" title="Se calcula en Airtable"> · auto</span>}
              </dt>
              <dd>
                <Valor f={f} v={r.fields[f.name]} enlaces={ctx.enlaces} />
                {f.type === "multipleAttachments" && (
                  <SubirArchivo tabla={ctx.t.id} campo={f.id} registro={r.id} etiqueta={`Añadir a ${f.name}`} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {relacionados.map((x) => (
        <Relacionados key={x.campo} ctx={ctx} r={r} campo={x.campo} titulo={x.titulo} />
      ))}
    </>
  );
}

/** Registros enlazados (p. ej. tareas, entregas y pagos de un cliente) con acceso directo. */
async function Relacionados({ ctx, r, campo, titulo }: { ctx: Contexto; r: AirRecord; campo: string; titulo: string }) {
  const f = ctx.campos.find((x) => x.name === campo)!;
  const destino = f.options?.linkedTableId ?? "";
  const ruta = ctx.enlaces.rutas[destino];
  const ids = (r.fields[f.name] as string[] | undefined) ?? [];
  const nombres = ctx.enlaces.nombres[destino];
  const inverso = f.options?.inverseLinkFieldId as string | undefined;
  const tablaDestino = ctx.esquema.find((t) => t.id === destino);
  // Resumen breve de cada registro enlazado: su primer campo de estado, si tiene.
  const estado = tablaDestino?.fields.find((x) => (x.type === "singleSelect" || x.type === "multipleSelects") && /estado|status/i.test(x.name));
  const regs = estado && ids.length ? await getRegistros(destino) : [];

  return (
    <section className="seccion">
      <div className="cabecera-fila">
        <h2 className="seccion-titulo">
          {titulo} <span className="contador">{ids.length}</span>
        </h2>
        {ruta && inverso && (
          <Link href={`${ruta}/nuevo?pre_${inverso}=${r.id}`} className="btn btn-secundario btn-chico">
            + Añadir
          </Link>
        )}
      </div>
      {ids.length ? (
        <div className="filas">
          {ids.map((id) => {
            const est = estado && regs.find((x) => x.id === id)?.fields[estado.name];
            const contenido = (
              <>
                <span className="fila-cuerpo">
                  <span className="fila-titulo">{nombres?.get(id) ?? "Registro"}</span>
                </span>
                {est ? <Valor f={estado} v={est} enlaces={ctx.enlaces} /> : null}
              </>
            );
            return ruta ? (
              <Link key={id} href={`${ruta}/${id}`} className="fila tarjeta">
                {contenido}
              </Link>
            ) : (
              <div key={id} className="fila tarjeta">
                {contenido}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">Nada todavía.</p>
      )}
    </section>
  );
}

/** Botones de decisión en la ficha (los mismos que en el panel de inicio). */
function AccionesDecision({ r, tabla, yo }: { r: AirRecord; tabla: string; yo: string }) {
  const g = GALERIAS[tabla] ?? {};
  if (tabla === TABLAS.entrega) {
    const st = r.fields[String(g.status)];
    const lista = (Array.isArray(st) ? st : [st]).map(texto);
    return lista.includes(DECISIONES.entregaEnRevision) ? <BotonAccion accion="aprobarEntrega" id={r.id}>Dar visto bueno</BotonAccion> : null;
  }
  if (tabla === TABLAS.gastos) {
    if (texto(r.fields[String(g.aprobacion)]) !== DECISIONES.aprobacionPendiente) return null;
    if (((r.fields[String(g.pagador)] as string[] | undefined) ?? []).includes(yo)) return <span className="nota-chica">Lo aprueba otro socio</span>;
    return (
      <>
        <BotonAccion accion="aprobarGasto" id={r.id}>Aprobar</BotonAccion>
        <BotonAccion accion="rechazarGasto" id={r.id} tipo="secundario" confirmar="¿Rechazar este gasto?">Rechazar</BotonAccion>
      </>
    );
  }
  return null;
}

/** Datos del evento de una tarea (nombre, fecha, venue y servicio), visibles también para el rol Equipo. */
function EventoDeTarea({ r, ctx }: { r: AirRecord; ctx: Contexto }) {
  const ids = (r.fields[String(ctx.g.cliente)] as string[] | undefined) ?? [];
  const ruta = ctx.enlaces.rutas[TABLAS.clientes];
  const eventos = ids.map((id) => ({ id, c: ctx.clientes?.get(id) })).filter((x) => x.c);
  if (!eventos.length) return null;
  return (
    <section className="tarjeta bloque">
      <h2 className="seccion-titulo">Evento</h2>
      {eventos.map(({ id, c }) => (
        <dl key={id} className="campos">
          <div className="campo-ficha">
            <dt>Cliente</dt>
            <dd>{ruta ? <Link href={`${ruta}/${id}`}>{c!.nombre}</Link> : c!.nombre}</dd>
          </div>
          {c!.fecha && (
            <div className="campo-ficha">
              <dt>Fecha</dt>
              <dd>{fecha(c!.fecha)}</dd>
            </div>
          )}
          {c!.venue && (
            <div className="campo-ficha">
              <dt>Venue</dt>
              <dd>{c!.venue}</dd>
            </div>
          )}
          {c!.servicio && (
            <div className="campo-ficha">
              <dt>Servicio</dt>
              <dd>{c!.servicio}</dd>
            </div>
          )}
        </dl>
      ))}
    </section>
  );
}
