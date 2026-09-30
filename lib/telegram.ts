import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Bot de Telegram. Variables de entorno:
 *   TELEGRAM_BOT_TOKEN      token que da @BotFather
 *   TELEGRAM_ADMIN_CHAT_ID  ID del grupo de administradores (el bot lo dice con /id)
 */

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
export const chatAdmin = () => process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
/** Grupo "VIDEOS ELEGANCE" (si no se configura, los avisos de videos van a los administradores). */
export const chatVideos = () => process.env.TELEGRAM_VIDEOS_CHAT_ID || chatAdmin();
export const telegramConfigurado = () => Boolean(token());

export type Boton = { texto: string; datos: string };

async function api<T = unknown>(metodo: string, cuerpo: Record<string, unknown>): Promise<T> {
  if (!token()) throw new Error("Falta TELEGRAM_BOT_TOKEN.");
  const res = await fetch(`${process.env.TELEGRAM_API_URL || "https://api.telegram.org"}/bot${token()}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${metodo}: ${json.description}`);
  return json.result;
}

/** Envía un mensaje (HTML) con botones opcionales. Devuelve false si no se pudo. */
export async function enviar(chatId: string, texto: string, botones?: Boton[]): Promise<boolean> {
  if (!chatId || !token()) return false;
  try {
    await api("sendMessage", {
      chat_id: chatId,
      text: texto,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(botones?.length
        ? { reply_markup: { inline_keyboard: botones.map((b) => [{ text: b.texto, callback_data: b.datos }]) } }
        : {}),
    });
    return true;
  } catch (e) {
    console.error("[telegram] no se pudo enviar a", chatId, e);
    return false;
  }
}

export async function enviarAdmins(texto: string): Promise<boolean> {
  if (!chatAdmin()) console.warn("[telegram] falta TELEGRAM_ADMIN_CHAT_ID; no se avisa a administradores.");
  return enviar(chatAdmin(), texto);
}

export async function responderBoton(callbackId: string, texto: string) {
  await api("answerCallbackQuery", { callback_query_id: callbackId, text: texto }).catch(() => {});
}

export async function editarMensaje(chatId: number | string, mensajeId: number, texto: string) {
  await api("editMessageText", { chat_id: chatId, message_id: mensajeId, text: texto, parse_mode: "HTML" }).catch(
    () => {},
  );
}

let usuarioBot: string | null = null;
/** Nombre de usuario del bot (para el enlace t.me/…). */
export async function nombreBot(): Promise<string | null> {
  if (usuarioBot || !token()) return usuarioBot;
  try {
    usuarioBot = (await api<{ username: string }>("getMe", {})).username;
  } catch {
    usuarioBot = null;
  }
  return usuarioBot;
}

export async function configurarWebhook(url: string) {
  return api("setWebhook", {
    url,
    secret_token: secretoWebhook(),
    allowed_updates: ["message", "callback_query"],
  });
}

export async function estadoWebhook() {
  return api<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo", {});
}

/* ---------- secretos derivados de AUTH_SECRET (sin variables extra) ---------- */

const derivar = (uso: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "").update(uso).digest("base64url").slice(0, 40);

export const secretoWebhook = () => derivar("telegram-webhook");
export const secretoCron = () => derivar("cron");

export function igualSeguro(a: string | null, b: string): boolean {
  if (!a) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Enlace de vinculación: /start <recId>_<firma>. Telegram admite hasta 64 caracteres. */
export function codigoVinculo(equipoId: string): string {
  return `${equipoId}_${derivar(`vinculo:${equipoId}`).slice(0, 24)}`;
}

export function leerCodigoVinculo(codigo: string): string | null {
  // La firma (base64url) puede contener "_": se separa solo en el primero.
  const corte = codigo.indexOf("_");
  const id = corte > 0 ? codigo.slice(0, corte) : "";
  const firma = corte > 0 ? codigo.slice(corte + 1) : "";
  if (!id || !firma || !/^rec[A-Za-z0-9]{14}$/.test(id)) return null;
  return igualSeguro(firma, derivar(`vinculo:${id}`).slice(0, 24)) ? id : null;
}

/** Escapa texto para parse_mode HTML de Telegram. */
export const h = (t: unknown) =>
  String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
