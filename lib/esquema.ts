import "server-only";
import { getEsquema, getRegistros, type Field, type Table } from "@/lib/airtable";
import { CAMPOS_OCULTOS, CAMPOS_SOLO_BOTONES, EQUIPO, GALERIAS, TABLAS, NAV_MAS, NAV_PRINCIPAL, TABLAS_OCULTAS, TABLAS_ROL_EQUIPO } from "@/config/galerias";
import type { Usuario } from "@/lib/auth";

/** Tipos calculados por Airtable: se muestran pero no se editan. */
const SOLO_LECTURA = new Set([
  "formula",
  "rollup",
  "multipleLookupValues",
  "lookup",
  "count",
  "autoNumber",
  "createdTime",
  "lastModifiedTime",
  "createdBy",
  "lastModifiedBy",
  "button",
  "aiText",
  "externalSyncSource",
  // Colaboradores de Airtable: la app usa la tabla Equipo en su lugar.
  "singleCollaborator",
  "multipleCollaborators",
]);

export const esSoloLectura = (f: Field) => SOLO_LECTURA.has(f.type) || CAMPOS_SOLO_BOTONES.includes(f.name);
export const esAntiguo = (f: Field) => /\(antiguo\)\s*$/i.test(f.name);

export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Nombre para mostrar: "GASTOS" → "Gastos". */
export function titulo(t: Table): string {
  return t.name === t.name.toUpperCase() ? t.name.charAt(0) + t.name.slice(1).toLowerCase() : t.name;
}

export const esAdmin = (u: Usuario) => u.rol === EQUIPO.rolAdmin;

export function puedeVerTabla(u: Usuario, tableId: string): boolean {
  return esAdmin(u) || TABLAS_ROL_EQUIPO.includes(tableId);
}

/**
 * Un campo es visible si no es "(antiguo)" y, cuando enlaza a otra tabla,
 * el usuario puede ver esa tabla (las personas de Equipo siempre se ven).
 */
export function campoVisible(u: Usuario, f: Field, t?: Table): boolean {
  if (esAntiguo(f) || CAMPOS_OCULTOS.includes(f.name)) return false;
  const ocultar = t ? (GALERIAS[t.id]?.ocultar as string[] | undefined) : undefined;
  if (ocultar?.includes(f.name)) return false;
  const destino = f.options?.linkedTableId;
  if (f.type === "multipleRecordLinks" && destino) {
    return destino === EQUIPO.tabla || puedeVerTabla(u, destino);
  }
  return true;
}

export function camposVisibles(u: Usuario, t: Table): Field[] {
  return t.fields.filter((f) => campoVisible(u, f, t));
}

export function campoPrincipal(t: Table): Field {
  return t.fields.find((f) => f.id === t.primaryFieldId) || t.fields[0];
}

export function campo(t: Table, nombre: unknown): Field | undefined {
  return typeof nombre === "string" ? t.fields.find((f) => f.name === nombre) : undefined;
}

export async function tablaPorId(id: string): Promise<Table | undefined> {
  return (await getEsquema()).find((t) => t.id === id);
}

export async function tablaPorSlug(s: string): Promise<Table | undefined> {
  return (await getEsquema()).find((t) => slug(t.name) === s || t.id === s);
}

export const rutaTabla = (t: Table) => `/t/${slug(t.name)}`;

/** Tablas que ve el usuario, en orden de navegación: principales, "Más" y nuevas. */
export async function navegacion(u: Usuario) {
  const tablas = (await getEsquema()).filter((t) => puedeVerTabla(u, t.id) && !TABLAS_OCULTAS.includes(t.id));
  const principal = NAV_PRINCIPAL.map((id) => tablas.find((t) => t.id === id)).filter(Boolean) as Table[];
  const conocidas = new Set([...NAV_PRINCIPAL, ...NAV_MAS]);
  const mas = [
    ...(NAV_MAS.map((id) => tablas.find((t) => t.id === id)).filter(Boolean) as Table[]),
    ...tablas.filter((t) => !conocidas.has(t.id)),
  ];
  const item = (t: Table) => ({ id: t.id, titulo: titulo(t), href: rutaTabla(t) });
  const calendario = { id: "calendario", titulo: "Calendario", href: "/calendario" };
  // El rol Equipo solo tiene Tareas y Calendario; el Administrador, además, el panel de inicio.
  if (!esAdmin(u)) return { principal: [...principal.map(item), calendario], mas: mas.map(item) };
  return {
    principal: [{ id: "inicio", titulo: "Inicio", href: "/inicio" }, ...principal.map(item)],
    mas: [calendario, ...mas.map(item)],
  };
}

/** Texto que representa un registro (su campo principal). */
export function textoPrincipal(valor: unknown): string {
  if (valor == null) return "";
  if (Array.isArray(valor)) return valor.map(textoPrincipal).filter(Boolean).join(", ");
  if (typeof valor === "object") return String((valor as { name?: string }).name ?? "");
  return String(valor);
}

export type Opcion = { id: string; nombre: string };

/** id → nombre de los registros de una tabla, para mostrar enlaces. */
export async function nombresDe(tableId: string): Promise<Map<string, string>> {
  const t = await tablaPorId(tableId);
  if (!t) return new Map();
  const principal = campoPrincipal(t);
  const regs = await getRegistros(tableId);
  return new Map(regs.map((r) => [r.id, textoPrincipal(r.fields[principal.name]) || "Sin nombre"]));
}

/** Índices de nombres de todas las tablas enlazadas desde `t` que el usuario puede ver. */
export async function nombresEnlazados(u: Usuario, t: Table): Promise<Record<string, Map<string, string>>> {
  const destinos = new Set(
    camposVisibles(u, t)
      .filter((f) => f.type === "multipleRecordLinks" && f.options?.linkedTableId)
      .map((f) => f.options!.linkedTableId!),
  );
  const out: Record<string, Map<string, string>> = {};
  await Promise.all([...destinos].map(async (id) => (out[id] = await nombresDe(id))));
  return out;
}

export type ResumenCliente = { nombre: string; fecha: string; venue: string; servicio: string };

/**
 * Datos básicos de cada cliente (nombre, fecha, venue y servicio) para quien no puede abrir Clientes:
 * el rol Equipo los ve en sus tareas y en el calendario, sin precios ni otros detalles.
 */
export async function resumenClientes(): Promise<Map<string, ResumenCliente>> {
  const g = GALERIAS[TABLAS.clientes];
  const regs = await getRegistros(TABLAS.clientes);
  const t = (v: unknown) => textoPrincipal(v);
  const servicio = await textoConEnlaces(TABLAS.clientes, String(g.servicio));
  return new Map(
    regs.map((r) => [
      r.id,
      {
        nombre: t(r.fields[String(g.nombre)]) || "Cliente",
        fecha: typeof r.fields[String(g.fecha)] === "string" ? String(r.fields[String(g.fecha)]) : "",
        venue: t(r.fields[String(g.venue)]),
        servicio: servicio(r.fields[String(g.servicio)]),
      },
    ]),
  );
}

/** Devuelve una función que da el nombre (campo principal) de un registro de esa tabla. */
export async function nombreDeRegistro(tableId: string): Promise<(r: { fields: Record<string, unknown> }) => string> {
  const t = await tablaPorId(tableId);
  const principal = t ? campoPrincipal(t).name : "";
  return (r) => (principal ? textoPrincipal(r.fields[principal]) : "");
}

/**
 * Texto de un campo que puede ser un enlace (p. ej. los servicios de un cliente):
 * si trae IDs de registros, los cambia por sus nombres.
 */
export async function textoConEnlaces(tableId: string, campoNombre: string): Promise<(v: unknown) => string> {
  const t = await tablaPorId(tableId);
  const f = t?.fields.find((x) => x.name === campoNombre);
  const destino = f?.type === "multipleRecordLinks" ? f.options?.linkedTableId : undefined;
  const nombres = destino ? await nombresDe(destino) : undefined;
  return (v) => {
    if (nombres && Array.isArray(v)) return (v as string[]).map((id) => nombres.get(id) ?? "").filter(Boolean).join(", ");
    return textoPrincipal(v);
  };
}

/**
 * Valor a escribir en un campo de selección: lista si es de selección múltiple,
 * una sola opción si es simple (la base puede usar uno u otro tipo).
 */
export async function valorSeleccion(tableId: string, campoNombre: string, valores: string[]): Promise<string | string[] | null> {
  const f = (await tablaPorId(tableId))?.fields.find((x) => x.name === campoNombre);
  if (f?.type === "multipleSelects") return valores;
  return valores[valores.length - 1] ?? null;
}

/** Opciones elegidas en un campo de selección simple o múltiple, como lista de textos. */
export function opciones(v: unknown): string[] {
  const lista = Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  return lista.map((x) => (typeof x === "object" && x ? String((x as { name?: string }).name ?? "") : String(x))).filter(Boolean);
}
