import "server-only";
import { sql } from "@/lib/datos";
import { horario, type Jornada } from "@/lib/horario";

export { horario, horarioVideo, tieneVideo, type Jornada } from "@/lib/horario";

/**
 * Días del servicio de un cliente (de 1 a 7). Cada día tiene el horario de FOTOGRAFÍA (fecha,
 * inicio y fin) y, si el video empieza en otro momento, el de VIDEOGRAFÍA (su fecha, inicio y fin).
 * Viven en clientes.jornadas; la fecha de fotografía del día 1 es siempre la fecha del evento,
 * así un evento de varios días es un solo cliente.
 */

export const MAX_DIAS = 7;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const txt = (v: unknown) => (typeof v === "string" ? v : "");

/** Las jornadas guardadas, con el día 1 en la fecha del evento. Sin nada guardado: un día sin horario. */
export function conFechaEvento(fechaEvento: string | null, guardadas: unknown): Jornada[] {
  const lista: Jornada[] = (Array.isArray(guardadas) ? guardadas : []).slice(0, MAX_DIAS).map((j) => ({
    fecha: txt(j?.fecha),
    inicio: txt(j?.inicio),
    fin: txt(j?.fin),
    videoFecha: txt(j?.videoFecha),
    videoInicio: txt(j?.videoInicio),
    videoFin: txt(j?.videoFin),
  }));
  if (!lista.length) lista.push({ fecha: "", inicio: "", fin: "", videoFecha: "", videoInicio: "", videoFin: "" });
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

/** Guarda los días; la fecha de fotografía del día 1 pasa a ser la fecha del evento. */
export async function guardarJornadas(id: string, dias: Jornada[]): Promise<void> {
  if (!Array.isArray(dias) || dias.length < 1 || dias.length > MAX_DIAS) throw new Error(`Elige de 1 a ${MAX_DIAS} días.`);
  const limpias = dias.map((d, i) => {
    const v = (k: keyof Jornada) => String(d?.[k] ?? "").trim();
    const fecha = v("fecha");
    const inicio = v("inicio");
    const fin = v("fin");
    const videoInicio = v("videoInicio");
    const videoFin = v("videoFin");
    // Sin fecha de video pero con horas: el video es el mismo día que la fotografía.
    const videoFecha = v("videoFecha") || (videoInicio || videoFin ? fecha : "");
    const dia = `del día ${i + 1}`;
    if (!FECHA.test(fecha)) throw new Error(`Falta la fecha de fotografía ${dia}.`);
    if (inicio && !HORA.test(inicio)) throw new Error(`La hora de inicio de fotografía ${dia} no es válida.`);
    if (fin && !HORA.test(fin)) throw new Error(`La hora final de fotografía ${dia} no es válida.`);
    if (videoFecha && !FECHA.test(videoFecha)) throw new Error(`La fecha de videografía ${dia} no es válida.`);
    if (videoInicio && !HORA.test(videoInicio)) throw new Error(`La hora de inicio de videografía ${dia} no es válida.`);
    if (videoFin && !HORA.test(videoFin)) throw new Error(`La hora final de videografía ${dia} no es válida.`);
    return { fecha, inicio, fin, videoFecha, videoInicio, videoFin };
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

/**
 * Líneas de fecha para los mensajes de Telegram.
 * Sin videografía aparte: un día → "📅 sáb, 14 mar 2027 · 17:00–23:00"; varios días → "📅 3 días"
 * y una línea por día. Con videografía, cada día lleva su línea 📸 Fotografía y 🎥 Videografía.
 */
export function lineasFecha(fechaEvento: string, jornadas: Jornada[] | undefined, formato: (f: string) => string): string[] {
  const dias: Jornada[] = jornadas?.length
    ? jornadas
    : [{ fecha: fechaEvento, inicio: "", fin: "", videoFecha: "", videoInicio: "", videoFin: "" }];
  const f = (d: string) => formato(d) || "Sin fecha";
  const unaLinea = (j: Jornada) => [f(j.fecha), horario(j)].filter(Boolean).join(" · ");
  const servicios = (j: Jornada, sangria: string) => {
    const video = { inicio: j.videoInicio, fin: j.videoFin };
    return [
      `${sangria}📸 Fotografía: ${[f(j.fecha), horario(j)].filter(Boolean).join(" · ")}`,
      `${sangria}🎥 Videografía: ${[f(j.videoFecha || j.fecha), horario(video)].filter(Boolean).join(" · ")}`,
    ];
  };
  const conVideo = (j: Jornada) => Boolean(j.videoFecha || j.videoInicio || j.videoFin);

  if (dias.length === 1) {
    const j = dias[0];
    return conVideo(j) ? [`📅 ${f(j.fecha)}`, ...servicios(j, "")] : [`📅 ${unaLinea(j)}`];
  }
  return [
    `📅 ${dias.length} días`,
    ...dias.flatMap((j, i) =>
      conVideo(j) ? [`   Día ${i + 1}: ${f(j.fecha)}`, ...servicios(j, "      ")] : [`   Día ${i + 1}: ${unaLinea(j)}`],
    ),
  ];
}
