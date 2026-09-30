import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { CACHE_SEGUNDOS } from "@/config/galerias";

/**
 * Cliente de Airtable. Solo se usa en el servidor: el token nunca llega al navegador.
 * Airtable permite ~5 peticiones/s por base, así que las peticiones se ponen en cola
 * y las lecturas se cachean unos segundos.
 */

const API = process.env.AIRTABLE_API_URL || "https://api.airtable.com";
const CONTENT_API = process.env.AIRTABLE_API_URL || "https://content.airtable.com";
// Base "Elegance Photographie CRM". Se puede cambiar con AIRTABLE_BASE_ID.
const BASE = process.env.AIRTABLE_BASE_ID || "appV0PordtxxqzY5C";

export type Choice = { id?: string; name: string; color?: string };
export type Field = {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: {
    choices?: Choice[];
    linkedTableId?: string;
    prefersSingleRecordLink?: boolean;
    precision?: number;
    symbol?: string;
    result?: { type: string; options?: Field["options"] };
    [k: string]: unknown;
  };
};
export type Table = { id: string; name: string; description?: string; primaryFieldId: string; fields: Field[] };
export type AirRecord = { id: string; createdTime: string; fields: Record<string, unknown> };

export const tagTabla = (tableId: string) => `t:${tableId}`;
export const TAG_ESQUEMA = "esquema";

/* ---------- cola de peticiones (≈4/s) ---------- */

let cola: Promise<unknown> = Promise.resolve();
const INTERVALO_MS = 250;

function enCola<T>(fn: () => Promise<T>): Promise<T> {
  const p = cola.then(fn, fn);
  cola = p.then(
    () => new Promise((r) => setTimeout(r, INTERVALO_MS)),
    () => new Promise((r) => setTimeout(r, INTERVALO_MS)),
  );
  return p;
}

export class AirtableError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function peticion<T>(url: string, init: RequestInit = {}, intento = 0): Promise<T> {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new AirtableError(500, "Falta AIRTABLE_TOKEN en las variables de entorno.");
  const res = await enCola(() =>
    fetch(url, {
      ...init,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    }),
  );
  if (res.status === 429 && intento < 3) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** intento));
    return peticion<T>(url, init, intento + 1);
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body?.error?.message || body?.error?.type || body?.error || msg;
    } catch {}
    throw new AirtableError(res.status, `Airtable ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

/* ---------- esquema ---------- */

async function leerEsquema(): Promise<Table[]> {
  const data = await peticion<{ tables: Table[] }>(`${API}/v0/meta/bases/${BASE}/tables`);
  return data.tables.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    primaryFieldId: t.primaryFieldId,
    fields: t.fields.map(({ id, name, type, description, options }) => ({ id, name, type, description, options })),
  }));
}

/** Esquema de la base. Se refresca cada 5 minutos para recoger tablas y campos nuevos. */
export const getEsquema = unstable_cache(leerEsquema, ["airtable-esquema", BASE], {
  revalidate: 300,
  tags: [TAG_ESQUEMA],
});

/* ---------- registros ---------- */

async function leerRegistros(tableId: string): Promise<AirRecord[]> {
  const out: AirRecord[] = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (offset) qs.set("offset", offset);
    const data = await peticion<{ records: AirRecord[]; offset?: string }>(`${API}/v0/${BASE}/${tableId}?${qs}`);
    out.push(...data.records);
    offset = data.offset;
  } while (offset && out.length < 5000);
  return out;
}

/** Lectura directa, sin caché (para el login, donde un dato viejo bloquearía el acceso). */
export const getRegistrosSinCache = leerRegistros;

/**
 * Todos los registros de una tabla (cacheados unos segundos, se invalidan al escribir).
 * Si la tabla ya no existe (se borró en Airtable y el esquema en caché aún la tiene),
 * devuelve una lista vacía y pide releer el esquema, en lugar de romper la página.
 */
export async function getRegistros(tableId: string): Promise<AirRecord[]> {
  try {
    return await unstable_cache(() => leerRegistros(tableId), ["airtable-registros", BASE, tableId], {
      revalidate: CACHE_SEGUNDOS,
      tags: [tagTabla(tableId)],
    })();
  } catch (e) {
    const noExiste = e instanceof AirtableError ? e.status === 404 || e.status === 403 : /Airtable (404|403)/.test(String(e));
    if (!noExiste) throw e;
    console.warn(`[airtable] la tabla ${tableId} no existe o no es accesible: se ignora`, String(e));
    try {
      revalidateTag(TAG_ESQUEMA, { expire: 0 });
    } catch {}
    return [];
  }
}

export async function getRegistro(tableId: string, id: string): Promise<AirRecord | null> {
  const todos = await getRegistros(tableId);
  const r = todos.find((x) => x.id === id);
  if (r) return r;
  try {
    return await peticion<AirRecord>(`${API}/v0/${BASE}/${tableId}/${id}`);
  } catch (e) {
    if (e instanceof AirtableError && e.status === 404) return null;
    throw e;
  }
}

/* ---------- escritura ---------- */

export async function crearRegistro(tableId: string, fields: Record<string, unknown>): Promise<AirRecord> {
  const data = await peticion<{ records: AirRecord[] }>(`${API}/v0/${BASE}/${tableId}`, {
    method: "POST",
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  return data.records[0];
}

export async function actualizarRegistro(
  tableId: string,
  id: string,
  fields: Record<string, unknown>,
): Promise<AirRecord> {
  const data = await peticion<{ records: AirRecord[] }>(`${API}/v0/${BASE}/${tableId}`, {
    method: "PATCH",
    body: JSON.stringify({ records: [{ id, fields }], typecast: true }),
  });
  return data.records[0];
}

export async function borrarRegistro(tableId: string, id: string): Promise<void> {
  await peticion(`${API}/v0/${BASE}/${tableId}/${id}`, { method: "DELETE" });
}

/** Sube un archivo (máx. 5 MB) a un campo de adjuntos de un registro existente. */
export async function subirAdjunto(
  recordId: string,
  fieldId: string,
  archivo: { contentType: string; filename: string; base64: string },
): Promise<void> {
  await peticion(`${CONTENT_API}/v0/${BASE}/${recordId}/${fieldId}/uploadAttachment`, {
    method: "POST",
    body: JSON.stringify({ contentType: archivo.contentType, file: archivo.base64, filename: archivo.filename }),
  });
}
