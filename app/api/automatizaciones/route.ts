import { NextResponse, type NextRequest } from "next/server";
import { getUsuario } from "@/lib/auth";
import { esAdmin } from "@/lib/esquema";
import {
  avisosVideos,
  informeMensual,
  procesarClientes,
  recordatoriosEntrega,
  recordatoriosLeads,
} from "@/lib/automatizaciones";
import { configurarWebhook, estadoWebhook, igualSeguro, secretoCron, telegramConfigurado } from "@/lib/telegram";

export const maxDuration = 60;

/**
 * Ejecuta las automatizaciones.
 *  - Tareas programadas de Netlify: cabecera x-cron-secret.
 *  - Un administrador con sesión: botones de la página "Más".
 * ?tarea=frecuente | diaria | mensual | webhook | estado
 */
async function manejar(req: NextRequest) {
  const porCron = igualSeguro(req.headers.get("x-cron-secret"), secretoCron());
  if (!porCron) {
    const u = await getUsuario();
    if (!u || !esAdmin(u)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const tarea = req.nextUrl.searchParams.get("tarea") ?? "frecuente";
  const base = req.nextUrl.origin;
  if (!telegramConfigurado()) {
    return NextResponse.json({ error: "Falta TELEGRAM_BOT_TOKEN en las variables de entorno." }, { status: 400 });
  }

  const log: string[] = [];
  try {
    switch (tarea) {
      case "frecuente":
        log.push(...(await procesarClientes(base)), ...(await avisosVideos(base)));
        break;
      case "diaria":
        log.push(...(await recordatoriosEntrega()), ...(await recordatoriosLeads(base)));
        break;
      case "mensual":
        log.push(...(await informeMensual(req.nextUrl.searchParams.get("mes") ?? undefined)));
        break;
      case "webhook":
        await configurarWebhook(`${base}/api/telegram`);
        log.push(`Bot conectado a ${base}/api/telegram`);
        break;
      case "estado":
        return NextResponse.json(await estadoWebhook());
      default:
        return NextResponse.json({ error: "Tarea desconocida" }, { status: 400 });
    }
  } catch (e) {
    console.error(`[automatizaciones] ${tarea}`, e);
    return NextResponse.json({ error: (e as Error).message, log }, { status: 500 });
  }
  console.info(`[automatizaciones] ${tarea}:`, log.length ? log.join(" | ") : "sin cambios");
  return NextResponse.json({ ok: true, tarea, log });
}

export const GET = manejar;
export const POST = manejar;
