import "server-only";
import { randomUUID } from "node:crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import pg from "pg";
import { CACHE_SEGUNDOS } from "@/config/galerias";
import { MAPA, type Columna, type Enlace, type MapaTabla } from "@/lib/mapa";

/**
 * Datos de la app en Supabase (Postgres + Storage). Solo se usa en el servidor.
 *
 * Devuelve los registros con la misma forma que tenía Airtable ({ id, createdTime, fields }
 * con los campos por nombre), así las galerías, fichas, formularios y automatizaciones no cambian.
 * Dónde se guarda cada campo está en lib/mapa.ts; el esquema (tablas, campos y opciones) en
 * la tabla `app_esquema`.
 *
 * Variables: DATABASE_URL (conexión "Transaction pooler" de Supabase), SUPABASE_URL y
 * SUPABASE_SERVICE_ROLE_KEY (para los archivos del bucket privado "adjuntos").
 */

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

export class DatosError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---------- conexión ---------- */

// Fechas como "AAAA-MM-DD" (sin zona horaria) y bigint/numeric como número, igual que Airtable.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(20, (v) => (v == null ? null : Number(v)));
pg.types.setTypeParser(1700, (v) => (v == null ? null : Number(v)));

let pool: pg.Pool | undefined;

function db(): pg.Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatosError(500, "Falta DATABASE_URL en las variables de entorno.");
  const conexion = new URL(url);
  const local = ["localhost", "127.0.0.1"].includes(conexion.hostname) || conexion.searchParams.get("sslmode") === "disable";
  conexion.searchParams.delete("sslmode"); // el cifrado se configura abajo
  pool = new pg.Pool({
    connectionString: conexion.toString(),
    max: 3,
    idleTimeoutMillis: 10_000,
    // Supabase cifra la conexión con su propia autoridad certificadora.
    ssl: local ? false : { rejectUnauthorized: false },
  });
  return pool;
}

const ident = (nombre: string) => `"${nombre.replace(/"/g, '""')}"`;

function mapaDe(tableId: string): MapaTabla {
  const m = MAPA[tableId];
  if (!m) throw new DatosError(404, `La tabla ${tableId} no existe.`);
  return m;
}

/* ---------- Storage (archivos) ---------- */

const BUCKET = "adjuntos";
const URL_FIRMADA_SEGUNDOS = 24 * 60 * 60;

async function storage(ruta: string, init: RequestInit = {}): Promise<Response> {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !clave) throw new DatosError(500, "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  const res = await fetch(`${base}/storage/v1${ruta}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: clave, Authorization: `Bearer ${clave}`, ...init.headers },
  });
  if (!res.ok) throw new DatosError(res.status, `Storage ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res;
}

const rutaStorage = (ruta: string) => ruta.split("/").map(encodeURIComponent).join("/");

/** Enlaces temporales (24 h) para ver los archivos del bucket privado. */
async function firmar(rutas: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!rutas.length) return out;
  try {
    const res = await storage(`/object/sign/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: URL_FIRMADA_SEGUNDOS, paths: rutas }),
    });
    const base = process.env.SUPABASE_URL!.replace(/\/$/, "");
    for (const x of (await res.json()) as { path: string; signedURL?: string; error?: string }[]) {
      if (x.signedURL) out.set(x.path, `${base}/storage/v1${x.signedURL}`);
    }
  } catch (e) {
    // Sin enlaces se sigue mostrando el registro; solo faltan las vistas previas.
    console.warn("[datos] no se pudieron firmar los adjuntos", String(e));
  }
  return out;
}

async function borrarArchivos(rutas: string[]): Promise<void> {
  if (!rutas.length) return;
  try {
    await storage(`/object/${BUCKET}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: rutas }),
    });
  } catch (e) {
    console.warn("[datos] no se pudieron borrar archivos del bucket", rutas, String(e));
  }
}

/* ---------- esquema ---------- */

async function leerEsquema(): Promise<Table[]> {
  const { rows } = await db().query<{ definicion: Table }>("select definicion from public.app_esquema order by orden, id");
  return rows.map(({ definicion: t }) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    primaryFieldId: t.primaryFieldId,
    fields: t.fields.map(({ id, name, type, description, options }) => ({ id, name, type, description, options })),
  }));
}

/** Esquema de la base. Se refresca cada 5 minutos para recoger campos y opciones nuevos. */
export const getEsquema = unstable_cache(leerEsquema, ["datos-esquema"], {
  revalidate: 300,
  tags: [TAG_ESQUEMA],
});

/* ---------- lectura ---------- */

type Fila = Record<string, unknown> & { id: string; creado_en: Date; airtable_raw?: { fields?: Record<string, unknown> } | null };
type FilaAdjunto = {
  id: string;
  registro_id: string;
  campo: string;
  nombre: string | null;
  tipo_mime: string | null;
  tamano: number | null;
  ancho: number | null;
  alto: number | null;
  storage_path: string;
};

const vacio = (v: unknown) => v == null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : new Date(String(v)).toISOString());
const cumpleFiltro = (fila: Record<string, unknown>, filtro?: Enlace["filtro"]) =>
  !filtro || Object.entries(filtro).every(([k, v]) => fila[k] === v);

/** Puentes distintos de una tabla (varios enlaces pueden compartir puente con distinto filtro). */
function puentes(m: MapaTabla): Enlace[] {
  const vistos = new Map<string, Enlace>();
  for (const e of Object.values(m.enlaces ?? {})) vistos.set(`${e.puente}.${e.propia}`, e);
  return [...vistos.values()];
}

async function leerFilas(tableId: string, ids?: string[]): Promise<AirRecord[]> {
  const m = mapaDe(tableId);
  const t = (await leerEsquema()).find((x) => x.id === tableId);
  if (!t) return [];
  const cx = db();

  const filas = (
    await cx.query<Fila>(
      `select * from public.${ident(m.tabla)} ${ids ? "where id = any($1)" : ""} order by creado_en, id`,
      ids ? [ids] : [],
    )
  ).rows;
  if (!filas.length) return [];
  const todos = filas.map((f) => f.id);

  const [enlaces, adjuntos, vistas] = await Promise.all([
    Promise.all(
      puentes(m).map(async (p) => {
        const { rows } = await cx.query<Record<string, unknown>>(
          // Mismo orden siempre: el de la lista guardada y, a igualdad, por ID del registro enlazado.
          `select * from public.${ident(p.puente)} where ${ident(p.propia)} = any($1) order by orden, ${ident(p.otra)}`,
          [todos],
        );
        return [`${p.puente}.${p.propia}`, rows] as const;
      }),
    ).then((x) => new Map(x)),
    m.adjuntos
      ? cx
          .query<FilaAdjunto>(
            "select * from public.adjuntos where tabla = $1 and registro_id = any($2) order by orden, creado_en",
            [m.tabla, todos],
          )
          .then((r) => r.rows)
      : Promise.resolve([] as FilaAdjunto[]),
    Promise.all(
      [...new Set(Object.values(m.calculados ?? {}).flatMap((x) => ("vista" in x ? [x.vista] : [])))].map(async (vista) => {
        const { rows } = await cx.query<Record<string, unknown>>(`select * from public.${ident(vista)} where id = any($1)`, [todos]);
        return [vista, new Map(rows.map((r) => [String(r.id), r]))] as const;
      }),
    ).then((x) => new Map(x)),
  ]);
  const urls = await firmar(adjuntos.map((a) => a.storage_path));

  return filas.map((fila) => {
    const fields: Record<string, unknown> = {};
    for (const f of t.fields) {
      let v: unknown;
      const col = m.columnas[f.id];
      const enl = m.enlaces?.[f.id];
      const adj = m.adjuntos?.[f.id];
      const calc = m.calculados?.[f.id];
      if (col) {
        v = fila[col.col];
      } else if (enl) {
        v = (enlaces.get(`${enl.puente}.${enl.propia}`) ?? [])
          .filter((x) => x[enl.propia] === fila.id && cumpleFiltro(x, enl.filtro))
          .map((x) => String(x[enl.otra]));
      } else if (adj) {
        v = adjuntos
          .filter((a) => a.registro_id === fila.id && a.campo === adj)
          .map((a) => {
            const url = urls.get(a.storage_path) ?? "";
            const img = Boolean(a.tipo_mime?.startsWith("image/") && url);
            const vista = img ? { url, width: a.ancho ?? undefined, height: a.alto ?? undefined } : undefined;
            return {
              id: a.id,
              url,
              filename: a.nombre ?? "archivo",
              size: a.tamano ?? undefined,
              type: a.tipo_mime ?? undefined,
              width: a.ancho ?? undefined,
              height: a.alto ?? undefined,
              ...(vista ? { thumbnails: { small: vista, large: vista, full: vista } } : {}),
            };
          });
      } else if (calc) {
        v = "vista" in calc ? vistas.get(calc.vista)?.get(fila.id)?.[calc.col] : calc.tipo === "fechaHora" ? iso(fila[calc.col]) : fila[calc.col];
      } else {
        // Campo del esquema sin sitio en lib/mapa.ts: se muestra lo que trajo Airtable (solo lectura).
        v = fila.airtable_raw?.fields?.[f.name];
      }
      if (!vacio(v)) fields[f.name] = v;
    }
    return { id: fila.id, createdTime: iso(fila.creado_en)!, fields };
  });
}

/** Lectura directa, sin caché (para el login, donde un dato viejo bloquearía el acceso). */
export const getRegistrosSinCache = async (tableId: string): Promise<AirRecord[]> =>
  MAPA[tableId] ? leerFilas(tableId) : [];

/** Todos los registros de una tabla (cacheados unos segundos, se invalidan al escribir). */
export async function getRegistros(tableId: string): Promise<AirRecord[]> {
  if (!MAPA[tableId]) return [];
  return unstable_cache(() => leerFilas(tableId), ["datos-registros", tableId], {
    revalidate: CACHE_SEGUNDOS,
    tags: [tagTabla(tableId)],
  })();
}

export async function getRegistro(tableId: string, id: string): Promise<AirRecord | null> {
  const r = (await getRegistros(tableId)).find((x) => x.id === id);
  if (r) return r;
  if (!MAPA[tableId]) return null;
  return (await leerFilas(tableId, [id]))[0] ?? null;
}

/* ---------- escritura ---------- */

function convertir(col: Columna, v: unknown, nombre: string): unknown {
  switch (col.tipo) {
    case "texto":
      if (Array.isArray(v)) v = v[0];
      return v == null || v === "" ? null : String(v);
    case "fecha": {
      if (v == null || v === "") return null;
      const s = String(v).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new DatosError(422, `"${nombre}": fecha no válida.`);
      return s;
    }
    case "numero": {
      if (v == null || v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n)) throw new DatosError(422, `"${nombre}": número no válido.`);
      return n;
    }
    case "casilla":
      return v === true || v === "true" || v === 1 || v === "1";
    case "lista":
      return v == null || v === "" ? [] : (Array.isArray(v) ? v : [v]).map(String);
    case "json":
      return v ?? [];
  }
}

/**
 * Escribe los campos dados (por nombre o por ID) en una transacción: columnas, enlaces y,
 * para adjuntos, la lista que se conserva ([{ id }]). Devuelve el ID del registro.
 */
async function escribir(tableId: string, id: string | null, campos: Record<string, unknown>): Promise<string> {
  const m = mapaDe(tableId);
  const t = (await leerEsquema()).find((x) => x.id === tableId);
  if (!t) throw new DatosError(404, `La tabla ${tableId} no existe.`);

  const columnas: [string, unknown][] = [];
  const enlaces: [Enlace, string[]][] = [];
  const adjuntos: [string, string[]][] = [];
  for (const [clave, v] of Object.entries(campos)) {
    const f = t.fields.find((x) => x.name === clave || x.id === clave);
    if (!f) throw new DatosError(422, `El campo "${clave}" no existe en ${t.name}.`);
    const col = m.columnas[f.id];
    const enl = m.enlaces?.[f.id];
    const adj = m.adjuntos?.[f.id];
    if (col) columnas.push([col.col, convertir(col, v, f.name)]);
    else if (enl) enlaces.push([enl, [...new Set((Array.isArray(v) ? v : v ? [v] : []).map(String))]]);
    else if (adj) {
      const lista = (Array.isArray(v) ? v : []) as { id?: string }[];
      if (lista.some((a) => !a?.id)) throw new DatosError(422, `"${f.name}": los archivos nuevos se suben con el botón de adjuntar.`);
      adjuntos.push([adj, lista.map((a) => String(a.id))]);
    } else throw new DatosError(422, `El campo "${f.name}" es de solo lectura.`);
  }

  const cx = await db().connect();
  const archivosBorrados: string[] = [];
  try {
    await cx.query("begin");
    if (!id) {
      const res = columnas.length
        ? await cx.query<{ id: string }>(
            `insert into public.${ident(m.tabla)} (${columnas.map(([c]) => ident(c)).join(", ")})
             values (${columnas.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
            columnas.map(([, v]) => v),
          )
        : await cx.query<{ id: string }>(`insert into public.${ident(m.tabla)} default values returning id`);
      id = res.rows[0].id;
    } else {
      const res = columnas.length
        ? await cx.query(
            `update public.${ident(m.tabla)} set ${columnas.map(([c], i) => `${ident(c)} = $${i + 2}`).join(", ")} where id = $1`,
            [id, ...columnas.map(([, v]) => v)],
          )
        : await cx.query(`select 1 from public.${ident(m.tabla)} where id = $1`, [id]);
      if (!res.rowCount) throw new DatosError(404, "El registro ya no existe.");
      if (!columnas.length) await cx.query(`update public.${ident(m.tabla)} set modificado_en = now() where id = $1`, [id]);
    }

    for (const [e, otros] of enlaces) {
      const filtro = Object.entries(e.filtro ?? {});
      await cx.query(
        `delete from public.${ident(e.puente)} where ${ident(e.propia)} = $1 ${filtro.map(([k], i) => `and ${ident(k)} = $${i + 2}`).join(" ")}`,
        [id, ...filtro.map(([, v]) => v)],
      );
      for (const [orden, otro] of otros.entries()) {
        const cols = [e.propia, e.otra, "orden", ...filtro.map(([k]) => k)];
        await cx.query(
          `insert into public.${ident(e.puente)} (${cols.map(ident).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
          [id, otro, orden, ...filtro.map(([, v]) => v)],
        );
      }
    }

    for (const [campo, conservar] of adjuntos) {
      const { rows } = await cx.query<{ storage_path: string }>(
        `delete from public.adjuntos where tabla = $1 and registro_id = $2 and campo = $3 and not (id::text = any($4)) returning storage_path`,
        [m.tabla, id, campo, conservar],
      );
      archivosBorrados.push(...rows.map((r) => r.storage_path));
      for (const [orden, adjId] of conservar.entries()) {
        await cx.query("update public.adjuntos set orden = $2 where id::text = $1", [adjId, orden]);
      }
    }

    await cx.query("commit");
  } catch (e) {
    await cx.query("rollback").catch(() => {});
    throw traducirError(e);
  } finally {
    cx.release();
  }
  await borrarArchivos(archivosBorrados);
  return id;
}

/** Mensajes claros para los errores de Postgres más comunes. */
function traducirError(e: unknown): Error {
  if (e instanceof DatosError) return e;
  const err = e as { code?: string; message?: string; constraint?: string };
  if (err.code === "23503") return new DatosError(422, "Uno de los registros enlazados ya no existe.");
  if (err.code === "23505" && err.constraint === "equipo_email_unico") return new DatosError(422, "Ese email ya lo tiene otra persona del equipo.");
  if (err.code === "23505") return new DatosError(422, "Ese registro ya existe.");
  return new DatosError(500, `Base de datos: ${err.message ?? String(e)}`);
}

export async function crearRegistro(tableId: string, fields: Record<string, unknown>): Promise<AirRecord> {
  const id = await escribir(tableId, null, fields);
  return (await leerFilas(tableId, [id]))[0];
}

export async function actualizarRegistro(tableId: string, id: string, fields: Record<string, unknown>): Promise<AirRecord> {
  await escribir(tableId, id, fields);
  return (await leerFilas(tableId, [id]))[0];
}

export async function borrarRegistro(tableId: string, id: string): Promise<void> {
  const m = mapaDe(tableId);
  const cx = db();
  const { rows } = await cx.query<{ storage_path: string }>(
    "select storage_path from public.adjuntos where tabla = $1 and registro_id = $2",
    [m.tabla, id],
  );
  // Los enlaces se borran en cascada y las filas de adjuntos con el trigger de la tabla.
  await cx.query(`delete from public.${ident(m.tabla)} where id = $1`, [id]).catch((e) => {
    throw traducirError(e);
  });
  await borrarArchivos(rows.map((r) => r.storage_path));
}

/** Sube un archivo a un campo de adjuntos de un registro existente. */
export async function subirAdjunto(
  recordId: string,
  fieldId: string,
  archivo: { contentType: string; filename: string; base64: string },
): Promise<void> {
  const m = Object.values(MAPA).find((x) => x.adjuntos?.[fieldId]);
  if (!m) throw new DatosError(422, "Ese campo no admite archivos.");
  const campo = m.adjuntos![fieldId];
  const cx = db();
  const existe = await cx.query(`select 1 from public.${ident(m.tabla)} where id = $1`, [recordId]);
  if (!existe.rowCount) throw new DatosError(404, "El registro ya no existe.");

  const nombre = archivo.filename || "archivo";
  const ruta = `${m.tabla}/${recordId}/${randomUUID()}-${nombre.replace(/[^\w.\-]+/g, "_")}`;
  const cuerpo = Buffer.from(archivo.base64, "base64");
  await storage(`/object/${BUCKET}/${rutaStorage(ruta)}`, {
    method: "POST",
    headers: { "Content-Type": archivo.contentType || "application/octet-stream" },
    body: cuerpo,
  });
  try {
    await cx.query(
      `insert into public.adjuntos (tabla, registro_id, campo, orden, nombre, tipo_mime, tamano, storage_path)
       select $1, $2, $3, coalesce(max(orden) + 1, 0), $4, $5, $6, $7
       from public.adjuntos where tabla = $1 and registro_id = $2 and campo = $3`,
      [m.tabla, recordId, campo, nombre, archivo.contentType || null, cuerpo.length, ruta],
    );
    await cx.query(`update public.${ident(m.tabla)} set modificado_en = now() where id = $1`, [recordId]);
  } catch (e) {
    await borrarArchivos([ruta]);
    throw traducirError(e);
  }
}

