import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { actualizarRegistro, getRegistrosSinCache, tagTabla } from "@/lib/airtable";
import {
  confirmarPresencia,
  etiquetaEvento,
  pendientesDeConfirmar,
  personaPorChat,
} from "@/lib/automatizaciones";
import { editarMensaje, enviar, h, igualSeguro, leerCodigoVinculo, responderBoton, secretoWebhook } from "@/lib/telegram";
import { AUTOMATIZACIONES as A, EQUIPO, MARCA } from "@/config/galerias";

type Update = {
  message?: { chat: { id: number; type: string }; from?: { id: number }; text?: string };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { chat: { id: number }; message_id: number; text?: string };
  };
};

const normalizar = (t: string) => t.trim().toLowerCase().replace(/[.!¡]/g, "");

/** Webhook del bot de Telegram: confirmaciones, vinculación de cuentas y /id. */
export async function POST(req: NextRequest) {
  if (!igualSeguro(req.headers.get("x-telegram-bot-api-secret-token"), secretoWebhook())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const u = (await req.json()) as Update;
  try {
    if (u.callback_query) await boton(u.callback_query);
    else if (u.message?.text) await mensaje(u.message as Required<Update>["message"] & { text: string });
  } catch (e) {
    console.error("[telegram] error procesando update", e);
  }
  // Siempre 200: si no, Telegram reintenta el mismo mensaje.
  return NextResponse.json({ ok: true });
}

async function boton(q: NonNullable<Update["callback_query"]>) {
  const [tipo, clienteId] = (q.data ?? "").split(":");
  if (tipo !== "c" || !clienteId) return responderBoton(q.id, "Acción no reconocida.");
  const persona = await personaPorChat(String(q.from.id));
  if (!persona) return responderBoton(q.id, "Tu Telegram no está conectado a la app.");
  const respuesta = await confirmarPresencia(persona, clienteId);
  await responderBoton(q.id, respuesta);
  if (q.message) {
    await editarMensaje(q.message.chat.id, q.message.message_id, `${h(q.message.text ?? "")}\n\n✅ <b>${h(respuesta)}</b>`);
  }
}

async function mensaje(m: { chat: { id: number; type: string }; from?: { id: number }; text: string }) {
  const chat = String(m.chat.id);
  const texto = m.text.trim();

  if (/^\/id(@\w+)?$/i.test(texto)) {
    return enviar(chat, `El ID de este chat es: <code>${chat}</code>`);
  }

  if (texto.startsWith("/start")) {
    const codigo = texto.split(/\s+/)[1];
    const equipoId = codigo ? leerCodigoVinculo(codigo) : null;
    if (!equipoId) {
      return enviar(
        chat,
        `Hola 👋 Soy el bot de ${MARCA.nombre}.\nPara recibir avisos, entra en la app → <b>Más</b> → <b>Conectar Telegram</b>.`,
      );
    }
    // Un chat solo puede estar vinculado a una persona.
    const regs = await getRegistrosSinCache(EQUIPO.tabla);
    for (const r of regs) {
      if (r.id !== equipoId && String(r.fields[A.campos.telegramChatId] ?? "") === chat) {
        await actualizarRegistro(EQUIPO.tabla, r.id, { [A.campos.telegramChatId]: null });
      }
    }
    await actualizarRegistro(EQUIPO.tabla, equipoId, { [A.campos.telegramChatId]: chat });
    revalidateTag(tagTabla(EQUIPO.tabla), { expire: 0 });
    const nombre = String(regs.find((r) => r.id === equipoId)?.fields[EQUIPO.nombre] ?? "");
    return enviar(
      chat,
      `✅ Listo${nombre ? `, ${h(nombre.split(" ")[0])}` : ""}. Tu Telegram quedó conectado.\nAquí recibirás tus eventos para confirmar y los recordatorios de entrega.`,
    );
  }

  // Confirmación escrita ("confirmo", "sí"…).
  if (m.chat.type === "private" && A.palabrasConfirmar.includes(normalizar(texto))) {
    const persona = await personaPorChat(chat);
    if (!persona) return enviar(chat, "Tu Telegram no está conectado. Hazlo desde la app → Más → Conectar Telegram.");
    const pendientes = await pendientesDeConfirmar(persona);
    if (!pendientes.length) return enviar(chat, "No tienes eventos pendientes de confirmar. 👌");
    if (pendientes.length === 1) return enviar(chat, h(await confirmarPresencia(persona, pendientes[0].id)));
    return enviar(
      chat,
      "Tienes varios eventos pendientes. ¿Cuál confirmas?",
      pendientes.map((r) => ({ texto: `✅ ${etiquetaEvento(r)}`.slice(0, 60), datos: `c:${r.id}` })),
    );
  }

  if (m.chat.type === "private") {
    return enviar(chat, "Para confirmar un evento toca el botón del mensaje o responde <b>confirmo</b>.");
  }
}
