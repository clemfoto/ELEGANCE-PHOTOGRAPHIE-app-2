import "server-only";
import { HORA_SIN_HORARIO, POSPONER_MIN, negocio, RECORDATORIOS } from "@/config/negocios";
import { aEpoch, fechaRelativa, hoyISO, horaFin, sumarDias } from "./fechas";
import { ocurrencias } from "./recurrencia";
import { cambiarAvisos, leerAjustes, listarTareas, obtenerTarea } from "./datos";
import { enviar, escapar, telegramConfigurado } from "./telegram";
import type { Tarea } from "./tipos";

export type Aviso = { clave: string; tareaId: string; fecha: string; cuando: number; titulo: string; cuerpo: string };

const MAX_ANTELACION_DIAS = Math.ceil(Math.max(...RECORDATORIOS.map((r) => r.min)) / 1440) + 1;

function textos(t: Tarea, fecha: string, hoy: string) {
  const n = negocio(t.negocio);
  const cuando = `${fechaRelativa(fecha, hoy)}${t.hora ? ` · ${t.hora}${t.duracion ? `–${horaFin(t.hora, t.duracion)}` : ""}` : ""}`;
  return { titulo: `${n?.corto ?? ""}: ${t.titulo}`, cuerpo: cuando, negocio: n?.nombre ?? "" };
}

/** Avisos cuyo momento cae entre `desde` y `hasta` (ms), de tareas sin hacer. */
export function calcularAvisos(tareas: Tarea[], desde: number, hasta: number, ahora = new Date()): Aviso[] {
  const hoy = hoyISO(ahora);
  const res: Aviso[] = [];
  for (const o of ocurrencias(tareas, sumarDias(hoy, -1), sumarDias(hoy, MAX_ANTELACION_DIAS))) {
    if (o.hecha) continue;
    const inicio = aEpoch(o.fecha, o.tarea.hora ?? HORA_SIN_HORARIO);
    for (const min of o.tarea.recordatorios) {
      const cuando = inicio - min * 60000;
      if (cuando < desde || cuando > hasta) continue;
      const { titulo, cuerpo } = textos(o.tarea, o.fecha, hoy);
      res.push({ clave: `${o.tarea.id}|${o.fecha}|${min}`, tareaId: o.tarea.id, fecha: o.fecha, cuando, titulo, cuerpo });
    }
  }
  return res.sort((a, b) => a.cuando - b.cuando);
}

/** Recordatorios de las próximas horas para avisar desde el propio móvil mientras la app está abierta. */
export async function proximosAvisos(horas = 24): Promise<Aviso[]> {
  const ahora = Date.now();
  return calcularAvisos(await listarTareas(), ahora, ahora + horas * 3600000);
}

export function mensajeTelegram(t: Tarea, fecha: string) {
  const { titulo, cuerpo, negocio: nombre } = textos(t, fecha, hoyISO());
  const texto = [`⏰ <b>${escapar(titulo.replace(/^[^:]+: /, ""))}</b>`, `${escapar(nombre)} · ${escapar(cuerpo)}`, t.notas ? `\n${escapar(t.notas)}` : ""]
    .filter(Boolean)
    .join("\n");
  const botones = [[
    { text: "✅ Hecha", callback_data: `h|${t.id}|${fecha}` },
    { text: `⏰ ${POSPONER_MIN} min`, callback_data: `p|${t.id}|${fecha}` },
  ]];
  return { texto, botones };
}

/** Lo llama la tarea programada cada 5 minutos: manda por Telegram los recordatorios que tocan. */
export async function revisarRecordatorios(): Promise<{ enviados: number; motivo?: string }> {
  if (!telegramConfigurado()) return { enviados: 0, motivo: "Sin TELEGRAM_BOT_TOKEN" };
  const { telegramChatId } = await leerAjustes();
  if (!telegramChatId) return { enviados: 0, motivo: "Telegram sin conectar" };

  const ahora = Date.now();
  // Ventana hacia atrás: si una ejecución se salta, el aviso sale en la siguiente (hasta 2 h tarde).
  const avisos = calcularAvisos(await listarTareas(), ahora - 2 * 3600000, ahora);
  let enviados = 0;

  const pendientes: { clave: string; tareaId: string; fecha: string; pospuesto?: boolean }[] = [];
  await cambiarAvisos((e) => {
    for (const a of avisos) if (!e.enviados[a.clave]) pendientes.push(a);
    for (const [clave, p] of Object.entries(e.pospuestos)) if (p.cuando <= ahora) pendientes.push({ clave, tareaId: p.tarea, fecha: p.fecha, pospuesto: true });
  });

  for (const p of pendientes) {
    const t = await obtenerTarea(p.tareaId);
    try {
      if (t && !t.hechas.includes(p.fecha)) {
        const { texto, botones } = mensajeTelegram(t, p.fecha);
        await enviar(telegramChatId, texto, botones);
        enviados++;
      }
    } catch (e) {
      console.error("recordatorio", p.clave, e);
      continue; // se reintenta en la siguiente ejecución
    }
    await cambiarAvisos((e) => {
      if (p.pospuesto) delete e.pospuestos[p.clave];
      else e.enviados[p.clave] = ahora;
    });
  }

  // Limpieza: se olvidan los enviados de hace más de 10 días.
  await cambiarAvisos((e) => {
    for (const [k, v] of Object.entries(e.enviados)) if (v < ahora - 10 * 86400000) delete e.enviados[k];
  });
  return { enviados };
}

export function posponer(tareaId: string, fecha: string) {
  const cuando = Date.now() + POSPONER_MIN * 60000;
  return cambiarAvisos((e) => {
    e.pospuestos[`${tareaId}|${fecha}|pos${cuando}`] = { tarea: tareaId, fecha, cuando };
  });
}
