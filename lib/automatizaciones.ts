import "server-only";
import { revalidateTag } from "next/cache";
import {
  actualizarRegistro,
  crearRegistro,
  getEsquema,
  getRegistrosSinCache,
  tagTabla,
  type AirRecord,
} from "@/lib/airtable";
import { campoPrincipal, nombreDeRegistro, opciones, textoConEnlaces, textoPrincipal, valorSeleccion } from "@/lib/esquema";
import { diasHasta, fecha, hoyISO, moneda, texto } from "@/lib/formato";
import { aNumero } from "@/lib/lista";
import { chatVideos, enviar, enviarAdmins, h, ultimoErrorTelegram } from "@/lib/telegram";
import { AUTOMATIZACIONES as A, DECISIONES, EQUIPO, GALERIAS, PRIVADO, TABLAS, ZONA_HORARIA } from "@/config/galerias";

/*
 * Automatizaciones. Se ejecutan desde /api/automatizaciones (tareas programadas de Netlify)
 * y, para los clientes, también justo después de guardar desde la app.
 * Todas son idempotentes: se pueden ejecutar varias veces sin repetir avisos.
 */

const C = A.campos;
const gCli = GALERIAS[TABLAS.clientes];
const gEnt = GALERIAS[TABLAS.entrega];
const gLead = GALERIAS[TABLAS.leads];
const gGas = GALERIAS[TABLAS.gastos];

/** Dinero sin decimales para los mensajes. */
const dinero = (n: unknown) => moneda(n, { id: "", name: "", type: "currency", options: { symbol: "$", precision: 0 } });

const invalidar = (...tablas: string[]) => {
  for (const t of tablas) {
    try {
      revalidateTag(tagTabla(t), { expire: 0 });
    } catch {}
  }
};

const ids = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const str = (clave: unknown) => String(clave);

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** "2026-09-26T18:42:26.000Z" → "2026-09-26" en la zona del negocio. */
const fechaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date(iso));

type Persona = { id: string; nombre: string; chatId: string; usuario: string };

/** "@Fede_EP " → "fede_ep" */
const usuarioTg = (v: unknown) => String(v ?? "").trim().replace(/^@/, "").toLowerCase();

async function equipo(): Promise<Map<string, Persona>> {
  const regs = await getRegistrosSinCache(EQUIPO.tabla);
  return new Map(
    regs.map((r) => [
      r.id,
      {
        id: r.id,
        nombre: String(r.fields[EQUIPO.nombre] ?? "Sin nombre"),
        chatId: String(r.fields[C.telegramChatId] ?? "").trim(),
        usuario: usuarioTg(r.fields[C.telegramUsuario]),
      },
    ]),
  );
}

const nombres = (lista: string[], personas: Map<string, Persona>) =>
  lista.map((id) => personas.get(id)?.nombre ?? "?").join(", ") || "—";

const nombreCliente = (r: AirRecord) => textoPrincipal(r.fields[str(gCli.nombre)]) || "Sin nombre";

type TipoAviso = "nuevo" | "confirmado";

/**
 * Mensaje del grupo para un cliente: datos del evento, el team con quién confirmó y el botón
 * "Confirmo mi presencia". Se vuelve a generar cada vez que alguien confirma.
 */
async function textoAvisoCliente(
  r: AirRecord,
  tipo: TipoAviso,
  base: string,
  personas?: Map<string, Persona>,
  servicios?: (v: unknown) => string,
): Promise<{ texto: string; botones?: { texto: string; datos: string }[] }> {
  personas ??= await equipo();
  servicios ??= await textoConEnlaces(TABLAS.clientes, str(gCli.servicio));
  const f = r.fields;
  const fechaEvento = typeof f[str(gCli.fecha)] === "string" ? String(f[str(gCli.fecha)]) : "";
  const team = ids(f[str(gCli.team)]);
  const confirmados = new Set(ids(f[C.clienteConfirmados]));
  const estados = opciones(f[str(gCli.estado)]);
  const futuro = Boolean(fechaEvento) && fechaEvento >= hoyISO();
  const lineaTeam = team.length
    ? team.map((id) => `${confirmados.has(id) ? "✅" : "⏳"} ${h(personas.get(id)?.nombre ?? "?")}`).join("\n")
    : "Sin team asignado";
  const faltan = team.filter((id) => !confirmados.has(id)).length;
  const mensaje = [
    tipo === "nuevo" ? `🎬 <b>Nuevo cliente: ${h(nombreCliente(r))}</b>` : `✅ <b>Cliente confirmado: ${h(nombreCliente(r))}</b>`,
    `📅 ${h(fecha(fechaEvento) || "Sin fecha")}`,
    `📍 ${h(texto(f[str(gCli.venue)]) || "Sin venue")}`,
    servicios(f[str(gCli.servicio)]) ? `📋 ${h(servicios(f[str(gCli.servicio)]))}` : "",
    tipo === "nuevo" ? `💰 ${h(dinero(f[str(gCli.precio)]) || "Sin precio")}` : "",
    estados.length ? `🔵 ${h(estados.join(", "))}` : "",
    f[C.clienteSolicitudes] ? `📝 ${h(texto(f[C.clienteSolicitudes]))}` : "",
    `\n👥 <b>Team</b> (${team.length - faltan}/${team.length} confirmados)\n${lineaTeam}`,
    futuro && faltan ? `\nTeam: toca el botón para confirmar tu presencia.` : "",
    `\n<a href="${base}/t/clientes/${r.id}">Abrir en la app</a>`,
  ]
    .filter(Boolean)
    .join("\n");
  const botones = futuro && team.length ? [{ texto: "✅ Confirmo mi presencia", datos: `c:${r.id}` }] : undefined;
  return { texto: mensaje, botones };
}

async function enviarAvisoCliente(
  r: AirRecord,
  tipo: TipoAviso,
  base: string,
  personas?: Map<string, Persona>,
  servicios?: (v: unknown) => string,
): Promise<boolean> {
  const m = await textoAvisoCliente(r, tipo, base, personas, servicios);
  return enviarAdmins(m.texto, m.botones);
}

/** Reenvía al grupo el aviso de un cliente (botón de la ficha), p. ej. para avisos antiguos sin botón. */
export async function reenviarAvisoCliente(clienteId: string, base: string): Promise<boolean> {
  const r = (await getRegistrosSinCache(TABLAS.clientes)).find((x) => x.id === clienteId);
  if (!r) return false;
  const tipo = opciones(r.fields[str(gCli.estado)]).includes(A.estadoConfirmado) ? "confirmado" : "nuevo";
  return enviarAvisoCliente(r, tipo, base);
}

/** Mensaje del grupo actualizado tras una confirmación (mismo tipo que el original). */
export async function avisoActualizado(clienteId: string, textoOriginal: string, base: string) {
  const r = (await getRegistrosSinCache(TABLAS.clientes)).find((x) => x.id === clienteId);
  if (!r) return null;
  return textoAvisoCliente(r, textoOriginal.includes("Cliente confirmado") ? "confirmado" : "nuevo", base);
}

/* ------------------------------------------------------------------ */
/* 1. Nuevos clientes: aviso a admins, invitaciones y entrega a 9 semanas */
/* ------------------------------------------------------------------ */

export async function procesarClientes(base: string): Promise<string[]> {
  const log: string[] = [];
  const [clientes, personas, servicios] = await Promise.all([
    getRegistrosSinCache(TABLAS.clientes),
    equipo(),
    textoConEnlaces(TABLAS.clientes, str(gCli.servicio)),
  ]);
  const hoy = hoyISO();
  let entregasCreadas = false;

  for (const r of clientes) {
    const f = r.fields;
    if (opciones(f[str(gCli.estado)]).some((x) => A.estadosClienteIgnorados.includes(x))) continue;
    const nombre = nombreCliente(r);
    const fechaEvento = typeof f[str(gCli.fecha)] === "string" ? String(f[str(gCli.fecha)]) : "";
    const team = ids(f[str(gCli.team)]);
    const cambios: Record<string, unknown> = {};

    const estados = opciones(f[str(gCli.estado)]);
    const confirmado = estados.includes(A.estadoConfirmado);

    // Aviso al grupo de eventos (una sola vez por cliente).
    if (f[C.clienteNotificado] !== true) {
      const ok = await enviarAvisoCliente(r, "nuevo", base, personas, servicios);
      if (ok) {
        cambios[C.clienteNotificado] = true;
        // Si ya llega confirmado, el aviso de nuevo cliente vale también como aviso de confirmación.
        if (confirmado) cambios[C.clienteAvisoConfirmado] = true;
        log.push(`Aviso de nuevo cliente: ${nombre}`);
      }

      // Entrega automática: N semanas después del evento (si está activada).
      if (A.crearEntregaAuto && fechaEvento && ids(f[C.clienteEntrega]).length === 0) {
        await crearRegistro(TABLAS.entrega, {
          [str(gEnt.cliente)]: [r.id],
          [str(gEnt.fecha)]: sumarDias(fechaEvento, A.semanasEntrega * 7),
          [str(gEnt.status)]: await valorSeleccion(TABLAS.entrega, str(gEnt.status), [A.estadoEntregaInicial]),
        });
        entregasCreadas = true;
        log.push(`Entrega creada para ${nombre}`);
      }
    }

    // Aviso de cliente CONFIRMADO (una vez), como hacía el escenario "ELEGANCE APP 2" de Make.
    else if (confirmado && f[C.clienteAvisoConfirmado] !== true) {
      const ok = await enviarAvisoCliente(r, "confirmado", base, personas, servicios);
      if (ok) {
        cambios[C.clienteAvisoConfirmado] = true;
        log.push(`Aviso de cliente confirmado: ${nombre}`);
      }
    }

    // Invitaciones por privado (solo si está activado; si no, se confirma en el grupo).
    if (A.invitacionesPrivadas && fechaEvento && fechaEvento >= hoy) {
      const invitados = ids(f[C.clienteInvitados]);
      const confirmados = ids(f[C.clienteConfirmados]);
      const nuevos: string[] = [];
      for (const id of team) {
        if (invitados.includes(id) || confirmados.includes(id)) continue;
        const p = personas.get(id);
        if (!p?.chatId) continue; // se le invitará cuando conecte Telegram
        const ok = await enviar(
          p.chatId,
          [
            `Hola ${h(p.nombre.split(" ")[0])} 👋`,
            `Estás en el equipo de <b>${h(nombre)}</b>`,
            `📅 ${h(fecha(fechaEvento))}`,
            `📍 ${h(texto(f[str(gCli.venue)]) || "Venue por confirmar")}`,
            ``,
            `¿Confirmas tu presencia? Toca el botón o responde <b>confirmo</b>.`,
          ].join("\n"),
          [{ texto: "✅ Confirmo mi presencia", datos: `c:${r.id}` }],
        );
        if (ok) nuevos.push(id);
        else log.push(`⚠️ No se pudo invitar a ${p.nombre} (${nombre}): ${ultimoErrorTelegram()}`);
      }
      if (nuevos.length) {
        cambios[C.clienteInvitados] = [...invitados, ...nuevos];
        log.push(`Invitaciones (${nombre}): ${nombres(nuevos, personas)}`);
      }
    }

    if (Object.keys(cambios).length) await actualizarRegistro(TABLAS.clientes, r.id, cambios);
  }

  invalidar(TABLAS.clientes, EQUIPO.tabla, ...(entregasCreadas ? [TABLAS.entrega] : []));
  return log;
}

/** Si cambia la fecha del evento, mueve las entregas pendientes a 9 semanas después. */
export async function moverEntregas(clienteId: string, fechaEvento: string): Promise<void> {
  const entregas = await getRegistrosSinCache(TABLAS.entrega);
  const nueva = sumarDias(fechaEvento, A.semanasEntrega * 7);
  for (const e of entregas) {
    if (!ids(e.fields[str(gEnt.cliente)]).includes(clienteId)) continue;
    const status = opciones(e.fields[str(gEnt.status)]);
    if (status.some((s) => A.estadosEntregaHechos.includes(s))) continue;
    if (e.fields[str(gEnt.fecha)] === nueva) continue;
    await actualizarRegistro(TABLAS.entrega, e.id, { [str(gEnt.fecha)]: nueva, [C.entregaRecordatorio]: false });
  }
  invalidar(TABLAS.entrega);
}

/* ------------------------------------------------------------------ */
/* 2. Confirmación de presencia desde Telegram                          */
/* ------------------------------------------------------------------ */

export async function personaPorChat(chatId: string): Promise<Persona | null> {
  for (const p of (await equipo()).values()) if (p.chatId === chatId) return p;
  return null;
}

/**
 * Quién tocó un botón: por su Telegram conectado o, si aún no lo conectó, por su
 * "Usuario Telegram" de la ficha de Equipo (útil al confirmar desde el grupo).
 */
export async function personaPorTelegram(
  userId: string,
  usuario?: string,
  nombre?: string,
  entre?: string[],
): Promise<Persona | null> {
  const personas = [...(await equipo()).values()];
  const u = usuarioTg(usuario);
  const encontrada =
    personas.find((p) => p.chatId === userId) ?? (u ? personas.find((p) => p.usuario === u) : undefined);
  if (encontrada) return encontrada;
  // Último recurso (confirmación desde el grupo): su nombre de Telegram coincide con el de UNA
  // sola persona del team de ese evento que aún no tiene Telegram conectado. Se guarda el vínculo.
  const n = simple(nombre);
  if (!n || !entre) return null;
  const candidatas = personas.filter(
    (p) => entre.includes(p.id) && !p.chatId && simple(p.nombre).split(" ")[0] === n.split(" ")[0],
  );
  if (candidatas.length !== 1) return null;
  const p = candidatas[0];
  await actualizarRegistro(EQUIPO.tabla, p.id, { [C.telegramChatId]: userId });
  invalidar(EQUIPO.tabla);
  return { ...p, chatId: userId };
}

/** "Gabý  López" → "gaby lopez" */
const simple = (t: unknown) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/** Team del evento (para reconocer a quien confirma desde el grupo). */
export async function teamDeCliente(clienteId: string): Promise<string[]> {
  const r = (await getRegistrosSinCache(TABLAS.clientes)).find((x) => x.id === clienteId);
  return ids(r?.fields[str(gCli.team)]);
}

/** Marca a la persona como confirmada en el cliente y avisa a los administradores. */
export async function confirmarPresencia(persona: Persona, clienteId: string, avisar = true): Promise<string> {
  const clientes = await getRegistrosSinCache(TABLAS.clientes);
  const r = clientes.find((x) => x.id === clienteId);
  if (!r) return "No encontré ese evento.";
  const nombre = nombreCliente(r);
  if (!ids(r.fields[str(gCli.team)]).includes(persona.id)) return `No estás en el equipo de ${nombre}.`;
  const confirmados = ids(r.fields[C.clienteConfirmados]);
  if (confirmados.includes(persona.id)) return `Ya tenías confirmado ${nombre}. ¡Gracias!`;

  await actualizarRegistro(TABLAS.clientes, r.id, { [C.clienteConfirmados]: [...confirmados, persona.id] });
  invalidar(TABLAS.clientes, EQUIPO.tabla);
  if (avisar) await enviarAdmins(
    `✅ <b>${h(persona.nombre)}</b> confirmó su presencia en <b>${h(nombre)}</b> (${h(fecha(r.fields[str(gCli.fecha)]))}).`,
  );
  return `¡Listo! Confirmaste tu presencia en ${nombre}. 🙌`;
}

/** Eventos futuros a los que la persona fue invitada y aún no confirmó. */
export async function pendientesDeConfirmar(persona: Persona): Promise<AirRecord[]> {
  const hoy = hoyISO();
  return (await getRegistrosSinCache(TABLAS.clientes)).filter((r) => {
    const f = r.fields;
    return (
      ids(f[str(gCli.team)]).includes(persona.id) &&
      !ids(f[C.clienteConfirmados]).includes(persona.id) &&
      String(f[str(gCli.fecha)] ?? "") >= hoy
    );
  });
}

export const etiquetaEvento = (r: AirRecord) => `${nombreCliente(r)} · ${fecha(r.fields[str(gCli.fecha)])}`;

/* ------------------------------------------------------------------ */
/* 3. Recordatorio de entrega una semana antes                          */
/* ------------------------------------------------------------------ */

export async function recordatoriosEntrega(): Promise<string[]> {
  const log: string[] = [];
  const [entregas, clientes, personas] = await Promise.all([
    getRegistrosSinCache(TABLAS.entrega),
    getRegistrosSinCache(TABLAS.clientes),
    equipo(),
  ]);
  const nombreEntrega = await nombreDeRegistro(TABLAS.entrega);
  for (const e of entregas) {
    const f = e.fields;
    if (f[C.entregaRecordatorio] === true) continue;
    const status = opciones(f[str(gEnt.status)]);
    if (status.some((s) => A.estadosEntregaHechos.includes(s))) continue;
    const d = diasHasta(f[str(gEnt.fecha)]);
    if (d == null || d < 0 || d > A.diasAvisoEntrega) continue;

    const cliente = clientes.find((c) => ids(f[str(gEnt.cliente)]).includes(c.id));
    const nombre = cliente ? nombreCliente(cliente) : nombreEntrega(e) || "un cliente";
    const cuando = d === 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d} días`;
    const msg = `⏰ <b>Recordatorio de entrega</b>\n${cuando} tienes que entregar <b>${h(nombre)}</b> (${h(fecha(f[str(gEnt.fecha)]))}).`;

    const responsables = ids(f[str(gEnt.responsable)]).map((id) => personas.get(id)).filter(Boolean) as Persona[];
    let enviado = false;
    for (const p of responsables) if (p.chatId) enviado = (await enviar(p.chatId, msg)) || enviado;
    if (!enviado) {
      enviado = await enviarAdmins(
        `${msg}\n⚠️ ${responsables.length ? `${h(nombres(responsables.map((p) => p.id), personas))} no tiene Telegram conectado.` : "No hay responsable de entrega asignado."}`,
      );
    }
    if (enviado) {
      await actualizarRegistro(TABLAS.entrega, e.id, { [C.entregaRecordatorio]: true });
      log.push(`Recordatorio de entrega: ${nombre} (${cuando.toLowerCase()})`);
    }
  }
  if (log.length) invalidar(TABLAS.entrega);
  return log;
}

/* ------------------------------------------------------------------ */
/* 4. Recordatorios de contacto de leads (cada 7 días)                  */
/* ------------------------------------------------------------------ */

export async function recordatoriosLeads(base: string): Promise<string[]> {
  const log: string[] = [];
  const [leads, personas] = await Promise.all([getRegistrosSinCache(TABLAS.leads), equipo()]);
  const contactos = (gLead.contactos as string[]) ?? [];
  const principal = campoPrincipal((await getEsquema()).find((t) => t.id === TABLAS.leads)!);

  for (const r of leads) {
    const f = r.fields;
    if (A.estadosLeadCerrados.includes(texto(f[str(gLead.estado)]))) continue;
    const dias = -(diasHasta(fechaLocal(r.createdTime)) ?? 0);
    const paso = Math.min(contactos.length - 1, Math.floor(dias / A.diasEntreContactos)); // 1 = toca el 2º contacto
    const enviados = aNumero(f[C.leadRecordatorios]);
    if (paso < 1 || paso <= enviados) continue;

    const nombre = textoPrincipal(f[principal.name]) || "Lead sin nombre";
    const siguiente = contactos[paso];
    if (ids(f[siguiente]).length === 0) {
      const hechos = contactos
        .slice(0, paso)
        .map((c, i) => `${i + 1}º: ${ids(f[c]).length ? h(nombres(ids(f[c]), personas)) : "—"}`)
        .join(" · ");
      await enviarAdmins(
        [
          `📞 <b>Toca el ${paso + 1}º contacto</b> con <b>${h(nombre)}</b>`,
          `Ingresó hace ${dias} días (${h(fecha(fechaLocal(r.createdTime)))}).`,
          f[str(gLead.servicio)] ? `🎥 ${h(texto(f[str(gLead.servicio)]))}` : "",
          hechos,
          `<a href="${base}/t/leads/${r.id}">Abrir lead</a>`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      log.push(`Recordatorio ${paso + 1}º contacto: ${nombre}`);
    }
    await actualizarRegistro(TABLAS.leads, r.id, { [C.leadRecordatorios]: paso });
  }
  if (log.length) invalidar(TABLAS.leads);
  return log;
}

/* ------------------------------------------------------------------ */
/* 5. Meses (resumen privado de "Mis gastos"; el informe contable al   */
/* grupo se quitó: los datos de contabilidad no se mandan a Telegram)  */
/* ------------------------------------------------------------------ */

/** Mes anterior al actual, "YYYY-MM". */
export function mesAnterior(): string {
  const [y, m] = hoyISO().split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

const nombreMes = (mes: string) =>
  new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(`${mes}-15T12:00:00Z`));

/* ------------------------------------------------------------------ */
/* 6. Apartado privado del dueño (PRIVADO)                              */
/* Solo se manda al Telegram personal de cada dueño, nunca a los grupos. */
/* ------------------------------------------------------------------ */

/** Dueños con Telegram conectado. */
async function chatsPropietarios(): Promise<string[]> {
  const personas = await equipo();
  return PRIVADO.propietarios.map((id) => personas.get(id)?.chatId ?? "").filter(Boolean);
}

/** Recordatorio de "Mi calendario" unos días antes (PRIVADO.calendario.diasAviso). */
export async function recordatoriosPrivados(): Promise<string[]> {
  const pC = PRIVADO.calendario;
  if (!PRIVADO.propietarios.length || !(await getEsquema()).some((t) => t.id === pC.tabla)) return [];
  const chats = await chatsPropietarios();
  if (!chats.length) return ["Mi calendario: el dueño no tiene Telegram conectado."];
  const log: string[] = [];
  const nombre = await nombreDeRegistro(pC.tabla);
  for (const r of await getRegistrosSinCache(pC.tabla)) {
    const f = r.fields;
    if (f[pC.recordatorio] === true) continue;
    const d = diasHasta(f[pC.fecha]);
    if (d == null || d < 0 || d > pC.diasAviso) continue;
    const cuando = d === 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d} días`;
    const msg = [
      `🔒 <b>${cuando}: ${h(nombre(r) || "evento privado")}</b>`,
      [fecha(f[pC.fecha]), texto(f[pC.hora]), texto(f[pC.lugar])].filter(Boolean).map(h).join(" · "),
    ].join("\n");
    let enviado = false;
    for (const chat of chats) enviado = (await enviar(chat, msg)) || enviado;
    if (enviado) {
      await actualizarRegistro(pC.tabla, r.id, { [pC.recordatorio]: true });
      log.push(`Recordatorio privado (${cuando.toLowerCase()})`);
    }
  }
  if (log.length) invalidar(pC.tabla);
  return log;
}

/** Resumen del mes de "Mis gastos" (lo lanza la tarea programada del día 1, junto al informe contable). */
export async function informePrivado(mes = mesAnterior()): Promise<string[]> {
  const pG = PRIVADO.gastos;
  if (!PRIVADO.propietarios.length || !(await getEsquema()).some((t) => t.id === pG.tabla)) return [];
  const chats = await chatsPropietarios();
  if (!chats.length) return ["Mis gastos: el dueño no tiene Telegram conectado."];
  const gastos = (await getRegistrosSinCache(pG.tabla)).filter((r) => String(r.fields[pG.fecha] ?? "").startsWith(mes));
  const $ = (n: number) => dinero(n) || "$0";
  const total = gastos.reduce((s, r) => s + aNumero(r.fields[pG.monto]), 0);
  const porCategoria = new Map<string, number>();
  for (const r of gastos) {
    const cat = texto(r.fields[pG.categoria]) || "Sin categoría";
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + aNumero(r.fields[pG.monto]));
  }
  const detalle = [
    `TOTAL ${$(total)} (${gastos.length} movimientos)`,
    ...[...porCategoria.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `  ${c}: ${$(n)}`),
  ].join("\n");
  for (const chat of chats) await enviar(chat, `🔒 <b>Mis gastos · ${h(nombreMes(mes))}</b>\n\n<pre>${h(detalle)}</pre>`);
  return [`Resumen privado de ${mes} enviado.`];
}

/* ------------------------------------------------------------------ */
/* Videos: aviso al grupo y botón "Marcar como entregado"               */
/* (antes escenarios "VIDEOS ELEGANCE 1 y 2" de Make)                   */
/* ------------------------------------------------------------------ */

const botonEntregado = (id: string) => [{ texto: "✅ MARCAR COMO ENTREGADO", datos: `v:${id}` }];

/** Manda cada video nuevo al grupo de videos, una sola vez, con el botón para marcarlo entregado. */
export async function avisosVideos(base: string): Promise<string[]> {
  const log: string[] = [];
  if (!chatVideos()) return log;
  const [videos, clientes, nombreVideo] = await Promise.all([
    getRegistrosSinCache(TABLAS.entrega),
    getRegistrosSinCache(TABLAS.clientes),
    nombreDeRegistro(TABLAS.entrega),
  ]);
  for (const v of videos) {
    const f = v.fields;
    if (f[C.videoAviso] === true) continue;
    const status = opciones(f[str(gEnt.status)]);
    const entregado = status.includes(A.estadoVideoEntregado);
    // Un registro vacío (recién creado en Airtable) se espera a que tenga nombre o cliente.
    const cliente = clientes.find((c) => ids(f[str(gEnt.cliente)]).includes(c.id));
    const nombre = (cliente ? nombreCliente(cliente) : "") || nombreVideo(v);
    if (!nombre) continue;
    if (entregado) {
      await actualizarRegistro(TABLAS.entrega, v.id, { [C.videoAviso]: true });
      continue;
    }
    const adjuntos = Array.isArray(f["CAMBIOS DESEADOS"]) ? (f["CAMBIOS DESEADOS"] as { url?: string; filename?: string }[]) : [];
    const ok = await enviar(
      chatVideos(),
      [
        `🎬 <b>NUEVO VIDEO PARA CAMBIOS</b>`,
        `👤 Cliente: ${h(nombre)}`,
        f[str(gEnt.fecha)] ? `📅 Fecha de entrega: ${h(fecha(f[str(gEnt.fecha)]))}` : "",
        status.length ? `🔵 Estado: ${h(status.join(", "))}` : "",
        f[str(gEnt.cambios)] ? `📝 ${h(texto(f[str(gEnt.cambios)]))}` : "",
        ...adjuntos.filter((a) => a.url).map((a) => `📎 <a href="${h(a.url)}">${h(a.filename || "Cambios")}</a>`),
        `\n<a href="${base}/t/videos/${v.id}">Abrir en la app</a>`,
      ]
        .filter(Boolean)
        .join("\n"),
      botonEntregado(v.id),
    );
    if (ok) {
      await actualizarRegistro(TABLAS.entrega, v.id, { [C.videoAviso]: true });
      log.push(`Video enviado al grupo: ${nombre}`);
    }
  }
  if (log.length) invalidar(TABLAS.entrega);
  return log;
}

/** Botón de Telegram: marca el video como ENTREGADO y devuelve el nombre para el mensaje. */
export async function marcarVideoEntregado(id: string): Promise<{ nombre: string; yaEstaba: boolean } | null> {
  const videos = await getRegistrosSinCache(TABLAS.entrega);
  const v = videos.find((x) => x.id === id);
  if (!v) return null;
  const nombreVideo = await nombreDeRegistro(TABLAS.entrega);
  const clientes = ids(v.fields[str(gEnt.cliente)]).length ? await getRegistrosSinCache(TABLAS.clientes) : [];
  const cliente = clientes.find((c) => ids(v.fields[str(gEnt.cliente)]).includes(c.id));
  const nombre = (cliente ? nombreCliente(cliente) : "") || nombreVideo(v) || "este cliente";
  const actual = opciones(v.fields[str(gEnt.status)]);
  if (actual.includes(A.estadoVideoEntregado)) return { nombre, yaEstaba: true };
  await actualizarRegistro(TABLAS.entrega, id, {
    [str(gEnt.status)]: await valorSeleccion(TABLAS.entrega, str(gEnt.status), [A.estadoVideoEntregado]),
  });
  invalidar(TABLAS.entrega);
  return { nombre, yaEstaba: false };
}
