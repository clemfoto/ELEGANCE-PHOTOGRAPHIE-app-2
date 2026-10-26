// @ts-nocheck — JavaScript simple ejecutado por Deno en Supabase Edge Functions.
/**
 * Copia toda la base de Airtable "Elegance Photographie CRM" a Supabase sin perder nada.
 * Corre dentro de Supabase (Edge Function), así que la clave de servicio nunca sale del servidor.
 *
 *   POST /functions/v1/migrar-airtable?simular=1   # solo respaldo + análisis, no escribe en las tablas
 *   POST /functions/v1/migrar-airtable             # respaldo + copia + verificación
 *   Cabecera obligatoria: x-migracion-clave: <valor de la tabla privada migracion_clave>
 *
 * Secreto: AIRTABLE_TOKEN (solo lectura: data.records:read + schema.bases:read).
 * SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
 *
 * Qué hace:
 * 1. Descarga el esquema y todos los registros y los guarda en el bucket privado "respaldos"
 *    (airtable-<fecha>/datos.json y los adjuntos). Airtable no se toca nunca: solo lectura.
 * 2. Inserta o actualiza cada fila conservando su ID "rec…" y el registro original en `airtable_raw`.
 * 3. Rehace los enlaces (tablas puente) y sube los adjuntos al bucket privado "adjuntos".
 * 4. Compara conteos de filas, enlaces y adjuntos entre Airtable y Supabase.
 *
 * Se puede ejecutar varias veces: la última ejecución deja Supabase igual que Airtable.
 */

const BASE = Deno.env.get("AIRTABLE_BASE_ID") || "appV0PordtxxqzY5C";
const AT_TOKEN = Deno.env.get("AIRTABLE_TOKEN");
const SB_URL = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  // La clave vive en una tabla con RLS y sin políticas: solo la puede leer el servidor.
  const claves = await (await sb("/rest/v1/migracion_clave?select=clave")).json();
  const enviada = req.headers.get("x-migracion-clave");
  if (!enviada || !claves.some((c) => c.clave === enviada)) return new Response("No autorizado", { status: 401 });
  const simular = new URL(req.url).searchParams.has("simular");
  const log = [];
  const problemas = [];
  try {
    if (!AT_TOKEN) throw new Error("Falta el secreto AIRTABLE_TOKEN.");
    await migrar(simular, log, problemas);
  } catch (e) {
    problemas.push(`Error: ${e.message}`);
  }
  return Response.json({ ok: problemas.length === 0, simular, problemas, log });
});

/* ---------- mapa Airtable → Supabase ---------- */

const texto = (v) => (v == null || v === "" ? null : String(v));
const fecha = (v) => (v ? String(v).slice(0, 10) : null);
const numero = (v) => (v == null || v === "" ? null : Number(v));
const casilla = (v) => v === true;
const lista = (v) => (Array.isArray(v) ? v.map(String) : []);
const json = (v) => v ?? null;

// Campos que no necesitan columna propia (repiten un dato que ya se guarda).
const SIN_COLUMNA = ["fld1UYWOqzIEOycTu"]; // Clientes.CREATED TIME = createdTime del registro

// Por tabla: campos → [columna, conversión]; enlaces → tabla puente; adjuntos → nombre del campo.
// Los enlaces inversos (el otro lado de cada pareja) se listan en `inversos`: son los mismos enlaces vistos desde la otra tabla.
const TABLAS = [
  {
    tabla: "equipo", id: "tbljsGsSe2Ep1Fnjy",
    campos: {
      fldQtXAphK2wPQZJz: ["nombre", texto], fldKiAiv4fG762RdH: ["rol", texto], fldyy4uRYOHOlvSNa: ["email", texto],
      fldeUlcxMZ19KoNoP: ["telefono", texto], fldwPw1lKTMkhSOKH: ["usuario_telegram", texto],
      fldDEVJ20jJWPuO1g: ["activo", casilla], fldcJjiInQEkfgvTf: ["telegram_chat_id", texto],
      fldtkqvffx3SLfDPs: ["codigo_invitacion", texto], fldkpZmeKDFS9bnQY: ["estado_invitacion", texto],
      fldVh7nV0OXl2bDU6: ["clave_cifrada", texto],
    },
    inversos: ["fldEDArafehb66n9j", "fldAnpulYuZDhUuj2", "fldxRQzMa7s92IllB", "fldAQkfGPy7VR0zrK", "fldzYhbZxzUu0SFlH",
      "fldtdjD1dYrF7J9hZ", "fldg3AGn8UqiYEdrX", "fld3Xic5Sc8ogsj8o", "fldtFCN18yivjxEy1", "fldkeromA8JIVKQyy", "fldeURO6cHW5TFq7O"],
  },
  {
    tabla: "servicios", id: "tblst8FBjp9HUIU5v",
    campos: {
      fld3bkLBfAeI9Q5sV: ["nombre", texto], fldbRfcqIdObgAlub: ["descripcion", texto],
      fldgpOxA9X8JgA6RX: ["notas_internas", texto], fldb4a6ctlCRgHjWP: ["clientes_texto", texto],
    },
    inversos: ["fldGfTCoU054QIzMZ"],
  },
  {
    tabla: "clientes", id: "tbl6nQUYzRSY8PWZ4",
    campos: {
      fldFVYDOxXffeoQzh: ["nombre", texto], fldJbw2DTqm2vPLKR: ["fecha_evento", fecha], fldsxlbLW4Qpnztr2: ["venue", texto],
      fldX48Mc1qMb95Kpq: ["costo", numero], fldPnRUSZKOqXtkFG: ["solicitud_especial", texto],
      fld90ICzfbaFGSAlz: ["team_members_antiguo", lista], fldgsuUk3KfbitzPc: ["estado", lista],
      fldqePjDnPFiAs14s: ["notificado", casilla], fldF8DxVth6rxiM9u: ["aviso_confirmado", casilla],
      fld2mbR139wbyYrIe: ["creado_por", json], fldewEFTeABXa1pM8: ["modificado_en", texto],
    },
    enlaces: [
      { campo: "fldjlxe5Ut8V7KwPJ", puente: "cliente_servicios", cols: ["cliente_id", "servicio_id"] },
      { campo: "fldMW50I0rtxUe5z6", puente: "cliente_equipo", cols: ["cliente_id", "equipo_id"], extra: { tipo: "asignado" } },
      { campo: "fldOjNMWIWeFann5j", puente: "cliente_equipo", cols: ["cliente_id", "equipo_id"], extra: { tipo: "confirmado" } },
      { campo: "fldEKw9t5qU9FeA5h", puente: "cliente_equipo", cols: ["cliente_id", "equipo_id"], extra: { tipo: "invitado_telegram" } },
    ],
    adjuntos: { fldnvAtufMtm8ZLuC: "archivos" },
    inversos: ["fldpcHIbTIZonO7nV", "fldWS22tNsHmn90wG", "fldrj9yWWMv6Ipqva", "fldNxcbBIQC1dNG70", "flddgHHfUDwD46w8T"],
  },
  {
    tabla: "tareas", id: "tbl4okeRHTWLcbwC7",
    campos: {
      fldMgRyoQjClYoktq: ["tarea", texto], fldfhjG3TNUxSV8Va: ["responsable_antiguo", texto], fld7tNekqTt3AiFYy: ["color", texto],
      fldO7mPFyhIh15JqI: ["cliente_antiguo", texto], fldRl23YLWyxQ5mp8: ["descripcion", texto],
      fldHaxSGEdMsjDzn8: ["fecha_limite", fecha], fldWtDREqdCAtkHGv: ["colaboradores", (v) => v ?? []],
      fldXrEYci1YF1yzbK: ["estado", texto],
    },
    enlaces: [
      { campo: "fldz39E12VRYirGy7", puente: "tarea_responsables", cols: ["tarea_id", "equipo_id"] },
      { campo: "fldxZHzZRJhUgi0oN", puente: "tarea_clientes", cols: ["tarea_id", "cliente_id"] },
    ],
  },
  {
    tabla: "calendario", id: "tblSpztRvvebMefcg",
    campos: {
      fldhhGJ80yTzPF9w3: ["nombre_evento", texto], fld10WLxR8fvgjrfK: ["fecha", fecha], fldf5rwUCZ0QUJWrI: ["venue", texto],
      fld5wGE0o8TlsGp5F: ["servicio", texto], fldxLgRnlRElLc3jk: ["color", texto], fldUenuVLX1GFMmvx: ["cliente", texto],
    },
  },
  {
    tabla: "leads", id: "tbl7sBK5QD0ZHIDMA",
    campos: {
      fldTF6y8erTWCE2Un: ["nombre", texto], fldGbRmfMO3iCjcgs: ["fecha_evento", fecha], fld7rSfopfgRyDHeA: ["venue", texto],
      fldXef8bfEbzZrCNa: ["estado", texto], fldtE1ebomv83o6xt: ["cliente_convertido", texto], fldayTxwl9BQ1F55Z: ["field_6", texto],
      fldPHmfBcgbBCrfVN: ["recordatorios_enviados", numero], fld2pzf7euGH0eWkH: ["notas", texto],
      flduxPykU6QxvhHcW: ["email", texto], fldJvjZ8nB04hctui: ["origen", texto], fldB6IHRSZNCIoaLH: ["ubicacion", texto],
    },
    enlaces: [
      { campo: "fldPbCdjwCQgeu9gb", puente: "lead_contactos", cols: ["lead_id", "equipo_id"], extra: { numero: 1 } },
      { campo: "flderzDaEAsqJkCyz", puente: "lead_contactos", cols: ["lead_id", "equipo_id"], extra: { numero: 2 } },
      { campo: "fldCQ821wEV7beMpQ", puente: "lead_contactos", cols: ["lead_id", "equipo_id"], extra: { numero: 3 } },
      { campo: "fldpfRUBMGRHIpRof", puente: "lead_contactos", cols: ["lead_id", "equipo_id"], extra: { numero: 4 } },
      { campo: "fld8OIKdIsRwpVaxc", puente: "lead_clientes", cols: ["lead_id", "cliente_id"] },
    ],
  },
  {
    tabla: "entregas", id: "tblltg6JFKtSwnXnm",
    campos: {
      fldRWgiIUNX2JRH9t: ["nombre_cliente", texto], fldvWjgdqA9NIytES: ["fecha_entrega_original", fecha],
      fldXZ77IPInwrnoqv: ["status", texto], fldSL3n5oCa8KwqBQ: ["link_entrega", texto], fldfva4UfN4xPiUAM: ["notas_cambios", texto],
      fldhgL9vb8kS7Wimm: ["recordatorio_enviado", casilla], fldEvHZZlXVYafR5t: ["aviso_enviado", casilla],
      fldGxyACWn7YTrWVI: ["creado_en", texto],
    },
    enlaces: [
      { campo: "fldbYr7JImLMgmZpk", puente: "entrega_clientes", cols: ["entrega_id", "cliente_id"] },
      { campo: "fldvdyUr2iTDychBo", puente: "entrega_responsables", cols: ["entrega_id", "equipo_id"] },
    ],
    adjuntos: { fldrKMu34XhPPB2qk: "cambios_deseados" },
  },
  {
    tabla: "contabilidad", id: "tbl0hZCWeLtmriphU",
    campos: {
      fldApA5y61MY4hNLj: ["concepto", texto], fldorsgeMQXQpXcBj: ["deposito", numero], fld7TxIJeG1NGIBzU: ["fecha_deposito", fecha],
      fld6Vx06kdJjCb05d: ["fecha_balance", fecha], fld3Sg24nphdeVjga: ["notas", texto],
    },
    enlaces: [{ campo: "fld8N8B6PI9ykQLgB", puente: "contabilidad_clientes", cols: ["contabilidad_id", "cliente_id"] }],
    calculados: ["fldwyPoprDfeqLjyg", "fldd2QB8pVa1QMo8t"], // vista contabilidad_saldos
  },
  {
    tabla: "gastos", id: "tblVtMgHzjUYHX5nv",
    campos: {
      fldBJPtSLvhJfW6Tn: ["gasto", texto], fld4U1UNCpu27PPte: ["fecha", fecha], fldqySWoDhiAgLXmB: ["cantidad", numero],
      fldmEtvNzBOe4Zwsl: ["forma_pago", texto], flddQuHkJnt4H4qtf: ["categoria", texto], fldC9BMDZ3w1f6cHv: ["aprobacion", texto],
    },
    enlaces: [
      { campo: "fldMOiuFh8XpMazzs", puente: "gasto_clientes", cols: ["gasto_id", "cliente_id"] },
      { campo: "fldvgWAF2rIh2UAHZ", puente: "gasto_equipo", cols: ["gasto_id", "equipo_id"], extra: { tipo: "pago" } },
      { campo: "fldfvNazeMjY6QHmx", puente: "gasto_equipo", cols: ["gasto_id", "equipo_id"], extra: { tipo: "aprobacion" } },
    ],
    adjuntos: { fldYQwARUYKWJ9Y2j: "comprobante" },
  },
];

/* ---------- Airtable (solo lectura) ---------- */

async function airtable(url) {
  for (let intento = 0; ; intento++) {
    const res = await fetch(`https://api.airtable.com${url}`, { headers: { Authorization: `Bearer ${AT_TOKEN}` } });
    if (res.status === 429 && intento < 5) { await espera(1000 * 2 ** intento); continue; }
    if (!res.ok) salir(`Airtable ${res.status} en ${url}: ${await res.text()}`);
    await espera(250); // ~4 peticiones/s
    return res.json();
  }
}

async function registros(tableId) {
  const todos = [];
  let offset;
  do {
    const q = new URLSearchParams({ pageSize: "100", returnFieldsByFieldId: "true" });
    if (offset) q.set("offset", offset);
    const r = await airtable(`/v0/${BASE}/${tableId}?${q}`);
    todos.push(...r.records);
    offset = r.offset;
  } while (offset);
  return todos;
}

/* ---------- Supabase (service_role) ---------- */

async function sb(ruta, init = {}) {
  const res = await fetch(`${SB_URL}${ruta}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, ...init.headers },
  });
  if (!res.ok) salir(`Supabase ${res.status} en ${init.method || "GET"} ${ruta}: ${await res.text()}`);
  return res;
}

async function upsert(tabla, filas, conflicto) {
  for (let i = 0; i < filas.length; i += 200) {
    await sb(`/rest/v1/${tabla}?on_conflict=${conflicto}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(filas.slice(i, i + 200)),
    });
  }
}

async function borrarDonde(tabla, col, ids, extra = {}) {
  for (let i = 0; i < ids.length; i += 100) {
    const q = new URLSearchParams({ [col]: `in.(${ids.slice(i, i + 100).join(",")})` });
    for (const [k, v] of Object.entries(extra)) q.set(k, `eq.${v}`);
    await sb(`/rest/v1/${tabla}?${q}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
}

async function contar(tabla, filtro = {}) {
  const q = new URLSearchParams({ select: "*" });
  for (const [k, v] of Object.entries(filtro)) q.set(k, `eq.${v}`);
  const res = await sb(`/rest/v1/${tabla}?${q}`, { method: "HEAD", headers: { Prefer: "count=exact", Range: "0-0" } });
  return Number(res.headers.get("content-range")?.split("/")[1] ?? NaN);
}

/* ---------- programa ---------- */

async function subir(bucket, ruta, cuerpo, tipo) {
  await sb(`/storage/v1/object/${bucket}/${ruta.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { "Content-Type": tipo || "application/octet-stream", "x-upsert": "true" },
    body: cuerpo,
  });
}

async function migrar(simular, log, problemas) {
  const carpeta = `airtable-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const comparar = (que, airtableN, supabaseN) => {
    const ok = airtableN === supabaseN;
    log.push(`${ok ? "✔" : "✘"} ${que}: Airtable ${airtableN} · Supabase ${supabaseN}`);
    if (!ok) problemas.push(`No cuadra ${que}: Airtable ${airtableN}, Supabase ${supabaseN}`);
  };

  const esquema = (await airtable(`/v0/meta/bases/${BASE}/tables`)).tables;
  const datos = {};
  for (const t of TABLAS) {
    datos[t.id] = await registros(t.id);
    log.push(`Airtable ${t.tabla}: ${datos[t.id].length} registros`);
  }
  for (const e of esquema.filter((e) => !TABLAS.some((t) => t.id === e.id))) {
    datos[e.id] = await registros(e.id);
    problemas.push(`Tabla nueva en Airtable sin tabla en Supabase: "${e.name}" (${datos[e.id].length} registros). Está en el respaldo.`);
  }

  // Campos que existen en Airtable y no tienen columna: siguen en airtable_raw, pero se avisa.
  for (const t of TABLAS) {
    const e = esquema.find((x) => x.id === t.id);
    if (!e) { problemas.push(`La tabla ${t.tabla} (${t.id}) ya no existe en Airtable.`); continue; }
    const conocidos = new Set([...Object.keys(t.campos), ...(t.enlaces ?? []).map((l) => l.campo),
      ...Object.keys(t.adjuntos ?? {}), ...(t.inversos ?? []), ...(t.calculados ?? []), ...SIN_COLUMNA]);
    for (const f of e.fields) {
      if (!conocidos.has(f.id)) problemas.push(`Campo nuevo "${e.name}.${f.name}" (${f.type}) sin columna: queda guardado en airtable_raw.`);
    }
  }

  // 0) respaldo completo en el bucket "respaldos" (los enlaces de adjuntos de Airtable caducan en unas horas)
  await subir("respaldos", `${carpeta}/datos.json`,
    JSON.stringify({ base: BASE, fecha: new Date().toISOString(), esquema, registros: datos }), "application/json");
  const adjuntos = [];
  for (const t of TABLAS) {
    for (const [campo, nombreCampo] of Object.entries(t.adjuntos ?? {})) {
      for (const r of datos[t.id]) {
        for (const [orden, a] of (r.fields[campo] ?? []).entries()) {
          const res = await fetch(a.url);
          if (!res.ok) { problemas.push(`No se pudo descargar el adjunto ${a.filename} de ${t.tabla}/${r.id}`); continue; }
          const buf = new Uint8Array(await res.arrayBuffer());
          const nombreSeguro = (a.filename || "archivo").replace(/[^\w.\-]+/g, "_");
          const storagePath = `${t.tabla}/${r.id}/${a.id}-${nombreSeguro}`;
          await subir("respaldos", `${carpeta}/adjuntos/${storagePath}`, buf, a.type);
          adjuntos.push({ buf, fila: {
            tabla: t.tabla, registro_id: r.id, campo: nombreCampo, orden, airtable_id: a.id, nombre: a.filename ?? null,
            tipo_mime: a.type ?? null, tamano: a.size ?? buf.length, ancho: a.width ?? null, alto: a.height ?? null, storage_path: storagePath,
          } });
        }
      }
    }
  }
  log.push(`Respaldo guardado en respaldos/${carpeta} (datos + ${adjuntos.length} adjuntos)`);
  if (simular) return log.push("Modo simular: no se escribió nada en las tablas.");

  // 1) filas
  const nombrePorId = Object.fromEntries(esquema.flatMap((e) => e.fields.map((f) => [f.id, f.name])));
  for (const t of TABLAS) {
    const filas = datos[t.id].map((r) => {
      const fila = { id: r.id };
      for (const [fld, [col, conv]] of Object.entries(t.campos)) fila[col] = conv(r.fields[fld]);
      fila.creado_en ??= r.createdTime;
      fila.modificado_en ??= fila.creado_en;
      fila.airtable_raw = {
        id: r.id, createdTime: r.createdTime,
        fields: Object.fromEntries(Object.entries(r.fields).map(([k, v]) => [nombrePorId[k] ?? k, v])),
      };
      return fila;
    });
    await upsert(t.tabla, filas, "id");
  }

  // 2) enlaces (se rehacen por completo para los registros importados)
  for (const t of TABLAS) {
    const ids = datos[t.id].map((r) => r.id);
    for (const l of t.enlaces ?? []) {
      await borrarDonde(l.puente, l.cols[0], ids, l.extra);
      const filas = datos[t.id].flatMap((r) =>
        (r.fields[l.campo] ?? []).map((otro, orden) => ({ [l.cols[0]]: r.id, [l.cols[1]]: otro, orden, ...l.extra })));
      if (filas.length) await upsert(l.puente, filas, [...l.cols, ...Object.keys(l.extra ?? {})].join(","));
    }
  }

  // 3) adjuntos → Storage (las filas de adjuntos se rehacen: si se quitó uno en Airtable, se quita aquí)
  for (const t of TABLAS) {
    if (t.adjuntos) await borrarDonde("adjuntos", "registro_id", datos[t.id].map((r) => r.id), { tabla: t.tabla });
  }
  for (const { buf, fila } of adjuntos) await subir("adjuntos", fila.storage_path, buf, fila.tipo_mime);
  if (adjuntos.length) await upsert("adjuntos", adjuntos.map((a) => a.fila), "airtable_id");

  // 4) verificación
  for (const t of TABLAS) {
    comparar(t.tabla, datos[t.id].length, await contar(t.tabla));
    for (const l of t.enlaces ?? []) {
      const esperado = datos[t.id].reduce((n, r) => n + (r.fields[l.campo]?.length ?? 0), 0);
      comparar(`${t.tabla}.${nombrePorId[l.campo]} → ${l.puente}`, esperado, await contar(l.puente, l.extra));
    }
    for (const [campo, nombreCampo] of Object.entries(t.adjuntos ?? {})) {
      const esperado = datos[t.id].reduce((n, r) => n + (r.fields[campo]?.length ?? 0), 0);
      comparar(`${t.tabla}.${nombreCampo} (adjuntos)`, esperado, await contar("adjuntos", { tabla: t.tabla, campo: nombreCampo }));
    }
  }
}

function espera(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function salir(msg) {
  throw new Error(msg);
}
