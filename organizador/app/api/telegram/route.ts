import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { cambiarAjustes, leerAjustes, marcarHecha, obtenerTarea } from "@/lib/datos";
import { posponer } from "@/lib/recordatorios";
import { api, enviar, escapar } from "@/lib/telegram";
import { firmar, iguales, secretoTelegram } from "@/lib/token";
import { POSPONER_MIN } from "@/config/negocios";

type Update = {
  message?: { chat: { id: number; first_name?: string; username?: string }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number; text?: string } };
};

/** Webhook del bot: conectar tu chat (/start con código) y botones de los recordatorios. */
export async function POST(req: NextRequest) {
  if (!iguales(req.headers.get("x-telegram-bot-api-secret-token") ?? "", secretoTelegram())) return NextResponse.json({ ok: false }, { status: 401 });
  const u = (await req.json()) as Update;
  const { telegramChatId } = await leerAjustes();

  if (u.message?.text) {
    const chat = String(u.message.chat.id);
    const m = /^\/start (\d+)_([A-Za-z0-9_-]+)$/.exec(u.message.text.trim());
    if (m && Number(m[1]) > Date.now() / 1000 && iguales(m[2], firmar(`conectar:${m[1]}`).slice(0, 32))) {
      await cambiarAjustes((a) => {
        a.telegramChatId = chat;
        a.telegramNombre = u.message!.chat.first_name ?? u.message!.chat.username;
      });
      revalidatePath("/", "layout");
      await enviar(chat, "✅ Listo: aquí te llegarán los recordatorios de tus tareas.");
    } else if (chat !== telegramChatId) {
      await enviar(chat, "Este bot es privado. Conéctalo desde la app → Ajustes → Telegram.");
    }
    return NextResponse.json({ ok: true });
  }

  const cb = u.callback_query;
  if (cb?.data && cb.message) {
    if (String(cb.message.chat.id) !== telegramChatId) {
      await api("answerCallbackQuery", { callback_query_id: cb.id, text: "No autorizado" });
      return NextResponse.json({ ok: true });
    }
    const [accion, id, fecha] = cb.data.split("|");
    const t = await obtenerTarea(id);
    let aviso = "La tarea ya no existe";
    let pie = "";
    if (t && accion === "h") {
      await marcarHecha(id, fecha, true);
      revalidatePath("/", "layout");
      aviso = "Marcada como hecha";
      pie = "✅ Hecha";
    } else if (t && accion === "p") {
      await posponer(id, fecha);
      aviso = `Te aviso en ${POSPONER_MIN} min`;
      pie = `⏰ Pospuesta ${POSPONER_MIN} min`;
    }
    await api("answerCallbackQuery", { callback_query_id: cb.id, text: aviso });
    if (pie) {
      await api("editMessageText", {
        chat_id: cb.message.chat.id,
        message_id: cb.message.message_id,
        text: `${escapar(cb.message.text ?? "")}\n\n${pie}`,
        parse_mode: "HTML",
      }).catch(() => {});
    }
  }
  return NextResponse.json({ ok: true });
}
