"use server";
import { forbidden, notFound, redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import {
  actualizarRegistro,
  getRegistros,
  borrarRegistro,
  crearRegistro,
  getRegistro,
  tagTabla,
  type Field,
  type Table,
} from "@/lib/airtable";
import { requireUsuario, type Usuario } from "@/lib/auth";
import { campo, campoVisible, esAdmin, esSoloLectura, puedeVerTabla, rutaTabla, tablaPorId, valorSeleccion } from "@/lib/esquema";
import { localAIso } from "@/lib/formato";
import { avisosVideos, moverEntregas, procesarClientes } from "@/lib/automatizaciones";
import { telegramConfigurado } from "@/lib/telegram";
import { DECISIONES, EQUIPO, GALERIAS, TABLAS } from "@/config/galerias";

/** Tras guardar un cliente, lanza sus automatizaciones sin hacer esperar al usuario. */
async function automatizarCliente(clienteId: string, fechaAntes: unknown, fechaDespues: unknown) {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  after(async () => {
    try {
      if (fechaAntes && typeof fechaDespues === "string" && fechaDespues && fechaAntes !== fechaDespues) {
        await moverEntregas(clienteId, fechaDespues);
      }
      if (telegramConfigurado()) await procesarClientes(base);
    } catch (e) {
      console.error("[automatizaciones] tras guardar cliente", e);
    }
  });
}

/** Video nuevo desde la app: se avisa al grupo de videos enseguida (sin esperar a la tarea programada). */
async function automatizarVideo() {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  after(async () => {
    try {
      if (telegramConfigurado()) await avisosVideos(base);
    } catch (e) {
      console.error("[automatizaciones] tras crear video", e);
    }
  });
}

export type EstadoForm = { error?: string };

async function tablaEditable(tableId: string): Promise<{ u: Usuario; t: Table }> {
  const u = await requireUsuario();
  const t = await tablaPorId(tableId);
  if (!t) notFound();
  if (!puedeVerTabla(u, t.id)) forbidden();
  return { u, t };
}

/** Invalida la caché de la tabla y de las tablas enlazadas (sus enlaces inversos cambian). */
function refrescar(t: Table) {
  updateTag(tagTabla(t.id));
  for (const f of t.fields) if (f.options?.linkedTableId) updateTag(tagTabla(f.options.linkedTableId));
}

const TEXTO = new Set(["singleLineText", "email", "url", "phoneNumber", "multilineText", "richText"]);
const NUMERO = new Set(["number", "currency", "percent", "rating", "duration"]);

/** Convierte lo que envía el formulario al formato que espera Airtable, según el tipo del campo. */
function leerCampo(f: Field, form: FormData): unknown {
  const clave = `f:${f.id}`;
  const v = String(form.get(clave) ?? "").trim();
  if (TEXTO.has(f.type)) return v || null;
  if (NUMERO.has(f.type)) {
    if (!v) return null;
    const n = Number(v.replace(",", "."));
    if (isNaN(n)) throw new Error(`"${f.name}" debe ser un número.`);
    return f.type === "percent" ? n / 100 : n;
  }
  switch (f.type) {
    case "checkbox":
      return form.get(clave) === "on";
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    case "dateTime":
      return v ? localAIso(v) : null;
    case "singleSelect":
      return v || null;
    case "multipleSelects":
      return form.getAll(clave).map(String).filter(Boolean);
    case "multipleRecordLinks":
      return form.getAll(clave).map(String).filter((id) => /^rec[A-Za-z0-9]{14}$/.test(id));
    default:
      return undefined;
  }
}

export async function guardarRegistro(
  tableId: string,
  recordId: string | null,
  _: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const { u, t } = await tablaEditable(tableId);
  const fields: Record<string, unknown> = {};
  try {
    for (const f of t.fields) {
      if (!form.has(`p:${f.id}`) || esSoloLectura(f) || !campoVisible(u, f, t)) continue;
      const v = leerCampo(f, form);
      if (v !== undefined) fields[f.name] = v;
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  // En Equipo el email identifica a la persona al entrar: no puede repetirse.
  if (t.id === EQUIPO.tabla && typeof fields[EQUIPO.email] === "string") {
    const email = String(fields[EQUIPO.email]).trim().toLowerCase();
    const otro = (await getRegistros(EQUIPO.tabla)).find(
      (x) => x.id !== recordId && String(x.fields[EQUIPO.email] ?? "").trim().toLowerCase() === email,
    );
    if (otro) return { error: `Ese email ya lo tiene ${String(otro.fields[EQUIPO.nombre] ?? "otra persona")}. Cada persona necesita su propio email.` };
  }

  // Gastos por encima del límite: quedan pendientes hasta que otro socio los apruebe
  // (al crearlos o si cambia el monto). La decisión solo se toma con los botones.
  if (t.id === TABLAS.gastos) {
    const g = GALERIAS[TABLAS.gastos];
    const monto = fields[String(g.monto)];
    const aprob = String(g.aprobacion);
    const antes = recordId ? (await getRegistro(t.id, recordId))?.fields[String(g.monto)] : undefined;
    if (campo(t, aprob) && typeof monto === "number" && monto > DECISIONES.limiteGasto && monto !== antes) {
      fields[aprob] = DECISIONES.aprobacionPendiente;
      if (campo(t, String(g.aprobadoPor))) fields[String(g.aprobadoPor)] = [];
    }
  }

  let id = recordId;
  const campoFecha = t.id === TABLAS.clientes ? String(GALERIAS[TABLAS.clientes].fecha) : "";
  const fechaAntes = recordId && campoFecha ? (await getRegistro(t.id, recordId))?.fields[campoFecha] : undefined;
  try {
    if (recordId) await actualizarRegistro(t.id, recordId, fields);
    else id = (await crearRegistro(t.id, fields)).id;
  } catch (e) {
    return { error: (e as Error).message };
  }
  refrescar(t);
  if (t.id === TABLAS.clientes && id) await automatizarCliente(id, fechaAntes, fields[campoFecha]);
  if (t.id === TABLAS.entrega && !recordId) await automatizarVideo();
  redirect(`${rutaTabla(t)}/${id}`);
}

/** Marca una tarea como hecha / pendiente con un toque (Tareas o cualquier tabla con vista "tareas"). */
export async function alternarTarea(tableId: string, recordId: string, hecha: boolean): Promise<void> {
  const g = GALERIAS[tableId];
  if (g?.vista !== "tareas") forbidden();
  const { t } = await tablaEditable(tableId);
  const estado = String(g.estado);
  const nuevo = hecha ? (g.estadosHechos as string[])[0] : String(g.estadoPendiente);
  await actualizarRegistro(t.id, recordId, { [estado]: nuevo });
  refrescar(t);
}

/** Crea un cliente a partir de un lead y los enlaza. */
export async function convertirLead(recordId: string): Promise<void> {
  const { t: leads } = await tablaEditable(TABLAS.leads);
  const { t: clientes } = await tablaEditable(TABLAS.clientes);
  const lead = await getRegistro(leads.id, recordId);
  if (!lead) notFound();
  const g = GALERIAS[TABLAS.leads];
  const conv = g.conversion as Record<string, [string, string] | string>;

  const fields: Record<string, unknown> = {};
  // Copia cada par [campo del lead, campo del cliente] de la configuración.
  for (const clave of Object.keys(conv).filter((k) => Array.isArray(conv[k]) && k !== "estadoCliente")) {
    const [origen, destino] = conv[clave] as [string, string];
    const fDestino = campo(clientes, destino);
    const valor = lead.fields[origen];
    if (!fDestino || valor == null || valor === "") continue;
    // Solo copia opciones que ya existen en Clientes, para no crear opciones nuevas por error.
    if (fDestino.type === "singleSelect" && !fDestino.options?.choices?.some((c) => c.name === valor)) continue;
    // Un enlace no se puede copiar como texto.
    if (fDestino.type === "multipleRecordLinks") continue;
    fields[destino] = valor;
  }
  const [campoEstado, estadoInicial] = conv.estadoCliente as [string, string];
  if (campo(clientes, campoEstado)) fields[campoEstado] = await valorSeleccion(clientes.id, campoEstado, [estadoInicial]);

  const cliente = await crearRegistro(clientes.id, fields);
  const relacion = String(g.clienteRelacionado);
  const previos = Array.isArray(lead.fields[relacion]) ? (lead.fields[relacion] as string[]) : [];
  await actualizarRegistro(leads.id, recordId, {
    [relacion]: [...previos, cliente.id],
    [String(g.estado)]: conv.estadoLeadGanado,
  });
  refrescar(leads);
  refrescar(clientes);
  await automatizarCliente(cliente.id, undefined, undefined);
  redirect(`${rutaTabla(clientes)}/${cliente.id}`);
}

/** Borrar solo lo puede hacer un administrador. */
export async function borrar(tableId: string, recordId: string): Promise<void> {
  const { u, t } = await tablaEditable(tableId);
  if (!esAdmin(u)) forbidden();
  await borrarRegistro(t.id, recordId);
  refrescar(t);
  redirect(rutaTabla(t));
}
