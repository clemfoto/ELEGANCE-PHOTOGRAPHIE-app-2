"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { negocio, type NegocioId } from "@/config/negocios";
import * as datos from "@/lib/datos";
import { esFecha, esHora, hoyISO } from "@/lib/fechas";
import { requireSesion } from "@/lib/sesion";
import { COOKIE, DURACION_S, claveCorrecta, crearToken, firmar, secretoTelegram } from "@/lib/token";
import { api, enviar, nombreBot, telegramConfigurado } from "@/lib/telegram";
import type { Movimiento, Tarea, TipoRepeticion } from "@/lib/tipos";

export type Estado = { error?: string; ok?: string } | undefined;

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const refrescar = () => revalidatePath("/", "layout");
/** Solo rutas internas, para no redirigir fuera de la app. */
const destino = (v: string, porDefecto: string) => (v.startsWith("/") && !v.startsWith("//") ? v : porDefecto);

// ---------- acceso ----------

export async function entrar(_: Estado, fd: FormData): Promise<Estado> {
  if (!claveCorrecta(texto(fd, "clave"))) {
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Contraseña incorrecta." };
  }
  (await cookies()).set(COOKIE, crearToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DURACION_S });
  redirect("/");
}

export async function salir() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

// ---------- tareas ----------

export async function guardarTareaAccion(_: Estado, fd: FormData): Promise<Estado> {
  await requireSesion();
  const id = texto(fd, "id");
  const previa = id ? await datos.obtenerTarea(id) : undefined;
  if (id && !previa) return { error: "La tarea ya no existe." };

  const n = negocio(texto(fd, "negocio"));
  const titulo = texto(fd, "titulo");
  const fecha = texto(fd, "fecha");
  const hora = texto(fd, "hora");
  if (!n) return { error: "Elige el negocio." };
  if (!titulo) return { error: "Escribe la tarea." };
  if (!esFecha(fecha)) return { error: "Elige una fecha." };
  if (hora && !esHora(hora)) return { error: "Hora no válida." };

  const tipo = (texto(fd, "repetir") || "nunca") as TipoRepeticion;
  if (!["nunca", "diaria", "semanal", "mensual", "anual"].includes(tipo)) return { error: "Repetición no válida." };
  const hasta = texto(fd, "hasta");
  if (hasta && (!esFecha(hasta) || hasta < fecha)) return { error: "«Hasta» debe ser después de la fecha de inicio." };
  const dias = fd.getAll("dias").map(Number).filter((d) => d >= 0 && d <= 6);
  const duracion = Number(texto(fd, "duracion")) || undefined;

  const t: Tarea = {
    id: previa?.id ?? datos.nuevoId(),
    negocio: n.id,
    titulo: titulo.slice(0, 200),
    notas: texto(fd, "notas").slice(0, 4000) || undefined,
    fecha,
    hora: hora || undefined,
    duracion: hora && duracion ? Math.min(duracion, 24 * 60) : undefined,
    repetir: {
      tipo,
      cada: Math.min(Math.max(1, Number(texto(fd, "cada")) || 1), 99),
      ...(tipo === "semanal" && dias.length ? { dias } : {}),
      ...(tipo !== "nunca" && hasta ? { hasta } : {}),
    },
    recordatorios: [...new Set(fd.getAll("recordatorios").map(Number).filter((m) => Number.isFinite(m) && m >= 0))].sort((a, b) => a - b),
    hechas: previa?.hechas ?? [],
    excepciones: previa?.excepciones ?? [],
    creada: previa?.creada ?? new Date().toISOString(),
  };
  await datos.guardarTarea(t);
  refrescar();
  redirect(destino(texto(fd, "volver"), `/n/${t.negocio}`));
}

export async function alternarHecha(id: string, fecha: string, hecha: boolean) {
  await requireSesion();
  if (!esFecha(fecha)) return;
  await datos.marcarHecha(id, fecha, hecha);
  refrescar();
}

/** modo "dia": quita solo ese día de una tarea repetitiva; "serie": borra la tarea entera. */
export async function borrarTareaAccion(id: string, modo: "dia" | "serie", fecha: string | undefined, volver: string) {
  await requireSesion();
  if (modo === "dia" && fecha && esFecha(fecha)) {
    await datos.cambiarTarea(id, (t) => {
      t.excepciones = [...new Set([...t.excepciones, fecha])];
    });
  } else {
    await datos.borrarTarea(id);
  }
  refrescar();
  redirect(destino(volver, "/"));
}

/** Mueve una ocurrencia a otro día (solo tareas sin repetición) — usado por "Pasar a mañana". */
export async function moverTarea(id: string, fecha: string) {
  await requireSesion();
  if (!esFecha(fecha)) return;
  await datos.cambiarTarea(id, (t) => {
    if (t.repetir.tipo === "nunca") t.fecha = fecha;
  });
  refrescar();
}

// ---------- contabilidad ----------

export async function guardarMovimientoAccion(_: Estado, fd: FormData): Promise<Estado> {
  await requireSesion();
  const id = texto(fd, "id");
  const previo = id ? await datos.obtenerMovimiento(id) : undefined;
  if (id && !previo) return { error: "El movimiento ya no existe." };
  const n = negocio(texto(fd, "negocio"));
  const tipo = texto(fd, "tipo");
  const concepto = texto(fd, "concepto");
  const fecha = texto(fd, "fecha");
  const monto = Number(texto(fd, "monto").replace(/[^\d.,-]/g, "").replace(",", "."));
  if (!n) return { error: "Elige el negocio." };
  if (tipo !== "ingreso" && tipo !== "gasto") return { error: "Elige ingreso o gasto." };
  if (!concepto) return { error: "Escribe el concepto." };
  if (!esFecha(fecha)) return { error: "Elige la fecha." };
  if (!Number.isFinite(monto) || monto <= 0) return { error: "Escribe un monto mayor que 0." };

  const m: Movimiento = {
    id: previo?.id ?? datos.nuevoId(),
    negocio: n.id as NegocioId,
    tipo,
    fecha,
    concepto: concepto.slice(0, 200),
    monto: Math.round(monto * 100) / 100,
    categoria: texto(fd, "categoria").slice(0, 60) || undefined,
    notas: texto(fd, "notas").slice(0, 2000) || undefined,
    creado: previo?.creado ?? new Date().toISOString(),
  };
  await datos.guardarMovimiento(m);
  refrescar();
  redirect(destino(texto(fd, "volver"), `/dinero?mes=${fecha.slice(0, 7)}`));
}

export async function borrarMovimientoAccion(id: string, volver: string) {
  await requireSesion();
  await datos.borrarMovimiento(id);
  refrescar();
  redirect(destino(volver, "/dinero"));
}

// ---------- Telegram ----------

async function origen() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Registra el webhook del bot y devuelve el enlace t.me que, al pulsar «Iniciar», guarda tu chat. */
export async function conectarTelegram(): Promise<{ url?: string; error?: string }> {
  await requireSesion();
  if (!telegramConfigurado()) return { error: "Falta la variable TELEGRAM_BOT_TOKEN en Netlify." };
  try {
    const base = await origen();
    if (!base.startsWith("https://")) return { error: "Telegram solo funciona con la app publicada (https)." };
    await api("setWebhook", { url: `${base}/api/telegram`, secret_token: secretoTelegram(), allowed_updates: ["message", "callback_query"] });
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const codigo = `${exp}_${firmar(`conectar:${exp}`).slice(0, 32)}`;
    return { url: `https://t.me/${await nombreBot()}?start=${codigo}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo conectar con Telegram." };
  }
}

export async function probarTelegram(): Promise<Estado> {
  await requireSesion();
  const { telegramChatId } = await datos.leerAjustes();
  if (!telegramChatId) return { error: "Primero conecta Telegram." };
  try {
    await enviar(telegramChatId, `👋 Prueba del organizador · ${hoyISO()}\nAquí te llegarán los recordatorios.`);
    return { ok: "Mensaje enviado." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo enviar." };
  }
}

export async function desconectarTelegram() {
  await requireSesion();
  await datos.cambiarAjustes((a) => {
    delete a.telegramChatId;
    delete a.telegramNombre;
  });
  refrescar();
}
