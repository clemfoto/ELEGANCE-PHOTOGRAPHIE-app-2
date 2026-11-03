import "server-only";
import { sql } from "@/lib/datos";

/**
 * Días del servicio de un cliente (de 1 a 7), cada uno con su fecha y su hora de inicio y fin.
 * Viven en clientes.jornadas; el día 1 es siempre la fecha del evento, así un evento de varios
 * días es un solo cliente.
 */

export type Jornada = { fecha: string; inicio: string; fin: string };

export const MAX_DIAS = 7;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Las jornadas guardadas, con el día 1 en la fecha del evento. Sin nada guardado: un día sin horario. */
export function conFechaEvento(fechaEvento: string | null, guardadas: unknown): Jornada[] {
  const lista = (Array.isArray(guardadas) ? guardadas : []).slice(0, MAX_DIAS).map((j) => ({
    fecha: typeof j?.fecha === "string" ? j.fecha : "",
    inicio: typeof j?.inicio === "string" ? j.inicio : "",
    fin: typeof j?.fin === "string" ? j.fin : "",
  }));
  if (!lista.length) lista.push({ fecha: "", inicio: "", fin: "" });
  if (fechaEvento) lista[0].fecha = fechaEvento.slice(0, 10);
  return lista;
}

export async function leerJornadas(id: string): Promise<{ fechaEvento: string | null; jornadas: Jornada[] } | null> {
  const [c] = await sql<{ fecha_evento: string | null; jornadas: unknown }>(
    "select fecha_evento, jornadas from public.clientes where id = $1",
    [id],
  );
  if (!c) return null;
  return { fechaEvento: c.fecha_evento, jornadas: conFechaEvento(c.fecha_evento, c.jornadas) };
}

/** Todas las jornadas de varios días o con horario, por cliente (para el calendario). */
export async function jornadasPorCliente(): Promise<Map<string, Jornada[]>> {
  const filas = await sql<{ id: string; fecha_evento: string | null; jornadas: unknown }>(
    "select id, fecha_evento, jornadas from public.clientes where jsonb_array_length(jornadas) > 0",
  );
  return new Map(filas.map((f) => [f.id, conFechaEvento(f.fecha_evento, f.jornadas)]));
}

/** Guarda los días; la fecha del día 1 pasa a ser la fecha del evento. */
export async function guardarJornadas(id: string, dias: Jornada[]): Promise<void> {
  if (!Array.isArray(dias) || dias.length < 1 || dias.length > MAX_DIAS) throw new Error(`Elige de 1 a ${MAX_DIAS} días.`);
  const limpias = dias.map((d, i) => {
    const fecha = String(d?.fecha ?? "").trim();
    const inicio = String(d?.inicio ?? "").trim();
    const fin = String(d?.fin ?? "").trim();
    if (!FECHA.test(fecha)) throw new Error(`Falta la fecha del día ${i + 1}.`);
    if (inicio && !HORA.test(inicio)) throw new Error(`La hora de inicio del día ${i + 1} no es válida.`);
    if (fin && !HORA.test(fin)) throw new Error(`La hora final del día ${i + 1} no es válida.`);
    return { fecha, inicio, fin };
  });
  for (let i = 1; i < limpias.length; i++) {
    if (limpias[i].fecha < limpias[i - 1].fecha) throw new Error(`El día ${i + 1} es antes que el día ${i}.`);
  }
  await sql("update public.clientes set jornadas = $2::jsonb, fecha_evento = $3::date where id = $1", [
    id,
    JSON.stringify(limpias),
    limpias[0].fecha,
  ]);
}

/** "15:00–23:00" (o solo la que haya). */
export const horario = (j: Pick<Jornada, "inicio" | "fin">) =>
  j.inicio && j.fin ? `${j.inicio}–${j.fin}` : j.inicio ? `desde ${j.inicio}` : j.fin ? `hasta ${j.fin}` : "";

/**
 * Líneas de fecha para los mensajes de Telegram: un día → "📅 sáb, 14 mar 2027 · 17:00–23:00";
 * varios días → "📅 3 días" y una línea por día con su fecha y horario.
 */
export function lineasFecha(fechaEvento: string, jornadas: Jornada[] | undefined, formato: (f: string) => string): string[] {
  const dias = jornadas?.length ? jornadas : [{ fecha: fechaEvento, inicio: "", fin: "" }];
  const linea = (j: Jornada) => [formato(j.fecha) || "Sin fecha", horario(j)].filter(Boolean).join(" · ");
  if (dias.length === 1) return [`📅 ${linea(dias[0])}`];
  return [`📅 ${dias.length} días`, ...dias.map((j, i) => `   Día ${i + 1}: ${linea(j)}`)];
}
