import "server-only";
import { getEsquema, getRegistros, type AirRecord } from "@/lib/airtable";
import type { Usuario } from "@/lib/auth";
import { esAdmin, nombreDeRegistro, nombresDe, opciones, puedeVerTabla, rutaTabla, textoConEnlaces } from "@/lib/esquema";
import { dinero, texto } from "@/lib/formato";
import { aNumero } from "@/lib/lista";
import { firmaCorta } from "@/lib/token";
import { AUTOMATIZACIONES, GALERIAS, MARCA, TABLAS } from "@/config/galerias";

/** Todo lo que tiene fecha en la base, como una sola lista de eventos (calendario de la app y feed .ics). */

export type TipoEvento = "evento" | "lead" | "entrega" | "tarea" | "pago";

export type EventoCal = {
  uid: string;
  tipo: TipoEvento;
  /** "YYYY-MM-DD" en la zona del negocio. */
  dia: string;
  titulo: string;
  detalle: string;
  href?: string;
};

export const TIPOS: Record<TipoEvento, { nombre: string; color: string }> = {
  evento: { nombre: "Eventos", color: "#4a565d" },
  lead: { nombre: "Leads", color: "#b7791f" },
  entrega: { nombre: "Entregas", color: "#55336a" },
  tarea: { nombre: "Vencimientos", color: "#9a3b2e" },
  pago: { nombre: "Cobros", color: "#2f5226" },
};

const ids = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const esDia = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);

export async function eventosCalendario(u: Usuario): Promise<EventoCal[]> {
  const esquema = await getEsquema();
  // El rol Equipo ve en el calendario los eventos, las entregas y las tareas (sin leads ni cobros),
  // aunque solo puede abrir las tablas que tiene permitidas.
  const visibles: string[] = esAdmin(u) ? Object.values(TABLAS) : [TABLAS.clientes, TABLAS.entrega, TABLAS.tareas];
  const leer = async (id: string) =>
    visibles.includes(id) && esquema.some((t) => t.id === id) ? getRegistros(id) : ([] as AirRecord[]);
  const ruta = (id: string, rec: string) => {
    const t = puedeVerTabla(u, id) ? esquema.find((x) => x.id === id) : undefined;
    return t ? `${rutaTabla(t)}/${rec}` : undefined;
  };
  const [clientes, leads, entregas, tareas, conta, nombresCliente, nombresEquipo] = await Promise.all([
    leer(TABLAS.clientes),
    leer(TABLAS.leads),
    leer(TABLAS.entrega),
    leer(TABLAS.tareas),
    leer(TABLAS.contabilidad),
    nombresDe(TABLAS.clientes),
    nombresDe(TABLAS.equipo),
  ]);
  const [nombreLead, nombreTarea, nombreConta, servicioCliente] = await Promise.all([
    nombreDeRegistro(TABLAS.leads),
    nombreDeRegistro(TABLAS.tareas),
    nombreDeRegistro(TABLAS.contabilidad),
    textoConEnlaces(TABLAS.clientes, String(GALERIAS[TABLAS.clientes].servicio)),
  ]);
  const cliente = (v: unknown) => ids(v).map((id) => nombresCliente.get(id)).filter(Boolean).join(", ");
  const personas = (v: unknown) => ids(v).map((id) => nombresEquipo.get(id)).filter(Boolean).join(", ");
  const out: EventoCal[] = [];

  const gC = GALERIAS[TABLAS.clientes];
  for (const r of clientes) {
    const d = r.fields[String(gC.fecha)];
    if (!esDia(d) || opciones(r.fields[String(gC.estado)]).some((x) => AUTOMATIZACIONES.estadosClienteIgnorados.includes(x))) continue;
    out.push({
      uid: r.id,
      tipo: "evento",
      dia: d.slice(0, 10),
      titulo: texto(r.fields[String(gC.nombre)]) || "Evento",
      detalle: [servicioCliente(r.fields[String(gC.servicio)]), texto(r.fields[String(gC.venue)]), personas(r.fields[String(gC.team)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.clientes, r.id),
    });
  }

  const gL = GALERIAS[TABLAS.leads];
  for (const r of leads) {
    const d = r.fields[String(gL.fecha)];
    if (!esDia(d) || AUTOMATIZACIONES.estadosLeadCerrados.includes(texto(r.fields[String(gL.estado)]))) continue;
    out.push({
      uid: r.id,
      tipo: "lead",
      dia: d.slice(0, 10),
      titulo: `Lead: ${nombreLead(r) || "sin nombre"}`,
      detalle: [texto(r.fields[String(gL.servicio)]), texto(r.fields[String(gL.estado)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.leads, r.id),
    });
  }

  const gE = GALERIAS[TABLAS.entrega];
  for (const r of entregas) {
    const d = r.fields[String(gE.fecha)];
    if (!esDia(d)) continue;
    const status = opciones(r.fields[String(gE.status)]);
    if (status.some((s) => AUTOMATIZACIONES.estadosEntregaHechos.includes(s))) continue;
    out.push({
      uid: r.id,
      tipo: "entrega",
      dia: d.slice(0, 10),
      titulo: `Entrega: ${cliente(r.fields[String(gE.cliente)]) || "sin cliente"}`,
      detalle: [status.join(", "), personas(r.fields[String(gE.responsable)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.entrega, r.id),
    });
  }

  const gT = GALERIAS[TABLAS.tareas];
  for (const r of tareas) {
    const d = r.fields[String(gT.fecha)];
    if (!esDia(d) || (gT.estadosHechos as string[]).includes(texto(r.fields[String(gT.estado)]))) continue;
    out.push({
      uid: r.id,
      tipo: "tarea",
      dia: d.slice(0, 10),
      titulo: `Vence: ${nombreTarea(r) || "tarea"}`,
      detalle: [cliente(r.fields[String(gT.cliente)]), personas(r.fields[String(gT.responsables)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.tareas, r.id),
    });
  }

  // Cobros: saldo pendiente de Contabilidad en su fecha de balance (solo administradores).
  const gK = GALERIAS[TABLAS.contabilidad];
  for (const r of conta) {
    const d = r.fields[String(gK.fechaBalance)];
    const pendiente = aNumero(r.fields[String(gK.pendiente)]);
    if (!esDia(d) || pendiente <= 0) continue;
    out.push({
      uid: r.id,
      tipo: "pago",
      dia: d.slice(0, 10),
      titulo: `Cobro: ${cliente(r.fields["Cliente"]) || nombreConta(r) || "balance"}`,
      detalle: `Balance pendiente ${dinero(pendiente)}`,
      href: ruta(TABLAS.contabilidad, r.id),
    });
  }

  return out.sort((a, b) => a.dia.localeCompare(b.dia));
}

/* ---------- suscripción (.ics) ---------- */

export const tokenCalendario = (equipoId: string) => `${equipoId}.${firmaCorta("calendario", equipoId)}`;

const escapar = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

/** Parte las líneas largas como pide el estándar (75 octetos). */
function plegar(linea: string): string {
  const partes: string[] = [];
  let actual = "";
  for (const c of linea) {
    if (Buffer.byteLength(actual + c) > 74) {
      partes.push(actual);
      actual = " " + c;
    } else actual += c;
  }
  partes.push(actual);
  return partes.join("\r\n");
}

const sinGuiones = (dia: string) => dia.replace(/-/g, "");
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function aIcs(eventos: EventoCal[], base: string, nombre: string): string {
  const ahora = utc(new Date());
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${MARCA.nombre}//App//ES`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(nombre)}`,
    "X-WR-TIMEZONE:America/Mexico_City",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of eventos) {
    lineas.push("BEGIN:VEVENT", `UID:${e.uid}-${e.tipo}@${MARCA.corto.toLowerCase()}`, `DTSTAMP:${ahora}`);
    const fin = new Date(`${e.dia}T12:00:00Z`);
    fin.setUTCDate(fin.getUTCDate() + 1);
    lineas.push(`DTSTART;VALUE=DATE:${sinGuiones(e.dia)}`, `DTEND;VALUE=DATE:${sinGuiones(fin.toISOString().slice(0, 10))}`, "TRANSP:TRANSPARENT");
    lineas.push(`SUMMARY:${escapar(e.titulo)}`, `CATEGORIES:${escapar(TIPOS[e.tipo].nombre)}`);
    if (e.detalle) lineas.push(`DESCRIPTION:${escapar(e.detalle)}`);
    if (e.href) lineas.push(`URL:${base}${e.href}`);
    lineas.push("END:VEVENT");
  }
  lineas.push("END:VCALENDAR");
  return lineas.map(plegar).join("\r\n") + "\r\n";
}
