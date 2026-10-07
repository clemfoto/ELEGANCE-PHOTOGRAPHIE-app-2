import "server-only";

/** Cliente mínimo del bot de Telegram (TELEGRAM_BOT_TOKEN). */

type Boton = { text: string; callback_data?: string; url?: string };

export const telegramConfigurado = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);

export async function api<T = unknown>(metodo: string, cuerpo: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN.");
  const res = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${metodo}: ${json.description ?? res.status}`);
  return json.result;
}

export function enviar(chatId: string, texto: string, botones?: Boton[][]) {
  return api("sendMessage", {
    chat_id: chatId,
    text: texto,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(botones ? { reply_markup: { inline_keyboard: botones } } : {}),
  });
}

export const nombreBot = async () => (await api<{ username: string }>("getMe", {})).username;

export const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
