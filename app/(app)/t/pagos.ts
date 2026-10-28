"use server";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { tagTabla } from "@/lib/datos";
import { requireAdmin } from "@/lib/auth";
import { hoyISO } from "@/lib/formato";
import { guardarContrato, guardarPagos as guardar, leerPagos, marcarDepositoPagado, marcarEnviado, type CambiosPagos } from "@/lib/pagos";
import { guardarMachote, leerMachote, registrarEnvio, rellenar } from "@/lib/envios";
import { redondear, type Pago } from "@/lib/impuestos";
import * as tgs from "@/lib/tugirosuite";
import { TABLAS } from "@/config/galerias";

/** Pagos del cliente, su contrato en TuGiroSuite y los documentos que se le mandan (solo administradores). */

export type Resultado = { error?: string };

function refrescar() {
  updateTag(tagTabla(TABLAS.clientes));
  updateTag(tagTabla(TABLAS.contabilidad));
}

async function intentar(etiqueta: string, fn: () => Promise<void>): Promise<Resultado> {
  try {
    await fn();
  } catch (e) {
    console.error(`[pagos] ${etiqueta}:`, e);
    return { error: (e as Error).message };
  } finally {
    refrescar();
  }
  return {};
}

const pagoTGS = (p: Pago, fraccion: number | null): tgs.PagoTGS => ({
  base: p.base,
  iva: p.iva,
  extra_pct: fraccion ? redondear(fraccion * 100) : 0,
  extra: p.extra,
  total: p.total,
});

/** Cliente y montos tal como los lee TuGiroSuite (contrato e invoices). */
const montos = (p: NonNullable<Awaited<ReturnType<typeof leerPagos>>>) => ({
  cliente: { nombre: p.nombre.trim(), email: p.email!, ...(p.telefono ? { tel: p.telefono } : {}) },
  total: p.total,
  subtotal: p.subtotal,
  deposito: p.deposito ?? 0,
  iva: p.depositoIva || p.balanceIva,
  pagos: { deposito: pagoTGS(p.pagoDeposito, p.depositoExtra), balance: pagoTGS(p.pagoBalance, p.balanceExtra) },
});

export async function guardarPagos(id: string, cambios: CambiosPagos): Promise<Resultado> {
  await requireAdmin();
  return intentar("guardar", () => guardar(id, cambios));
}

/** Rellena en TuGiroSuite el contrato (con o sin dron) y el invoice del depósito, como borradores. */
export async function prepararContrato(id: string, dron: boolean): Promise<Resultado> {
  await requireAdmin();
  return intentar("preparar", async () => {
    const p = await leerPagos(id);
    if (!p) throw new Error("No se encontró el cliente.");
    if (p.contrato) throw new Error("Este cliente ya tiene un contrato. Descártalo antes de preparar otro.");
    const faltan = [
      !p.nombre.trim() && "nombre",
      !p.email && "email del cliente",
      !p.fecha && "fecha del evento",
      !p.servicios.length && "paquetes",
      p.servicios.some((s) => s.precio == null) && "precio de cada paquete",
      !(p.total > 0) && "costo total",
      !(p.deposito && p.deposito > 0) && "depósito",
    ].filter(Boolean);
    if (faltan.length) throw new Error(`Falta: ${faltan.join(", ")}.`);
    if (p.deposito! > p.subtotal) throw new Error("El depósito es mayor que el costo de los paquetes.");
    const h = await headers();
    const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
    const no = await tgs.crearContrato({
      ...montos(p),
      fecha_evento: p.fecha!,
      ...(p.venue ? { venue: p.venue } : {}),
      servicios: p.servicios.map((s) => ({ nombre: s.nombre, precio: s.precio, ...(s.descripcion?.trim() ? { descripcion: s.descripcion.trim() } : {}) })),
      resumen: { opciones: p.resumenOpciones, ...(p.resumenTexto.trim() ? { texto: p.resumenTexto.trim() } : {}) },
      dron,
      autofirma: false,
      avisoUrl: `${base}/t/clientes/${id}`,
    });
    await guardarContrato(id, no, "borrador");
  });
}

/**
 * Manda al cliente solo los documentos elegidos (p. ej. solo el invoice) con el mensaje machote y
 * lo apunta en el historial. Si va el invoice del depósito, el depósito queda pagado (con fecha de hoy si no tenía).
 */
export async function enviarContrato(id: string, documentos: string[]): Promise<Resultado> {
  const u = await requireAdmin();
  return intentar("enviar", async () => {
    const p = await leerPagos(id);
    if (!p?.contrato) throw new Error("Primero prepara el contrato.");
    if (!p.email) throw new Error("Falta el email del cliente.");
    const c = await tgs.leerContrato(p.contrato);
    const elegidos = c.documentos.filter((d) => documentos.includes(d.id));
    if (!elegidos.length) throw new Error("Elige al menos un documento.");
    const titulos = elegidos.map((d) => d.titulo);
    const m = await leerMachote();
    const asunto = rellenar(m.asunto, p, titulos);
    const mensaje = rellenar(m.mensaje, p, titulos);
    await tgs.enviarContrato(p.contrato, { subject: asunto, message: mensaje, documentos: elegidos.map((d) => d.id) });
    await registrarEnvio({
      clienteId: id,
      enviadoPor: u.nombre,
      destinatario: p.email,
      contratoNo: p.contrato,
      documentos: elegidos.map((d) => ({ id: d.id, titulo: d.titulo })),
      asunto,
      mensaje,
      tipo: "enviar",
    });
    await marcarEnviado(id);
    if (elegidos.some((d) => d.solo_lectura && d.parte === "Invoice")) await marcarDepositoPagado(id, hoyISO());
  });
}

/** Prepara el invoice del balance (con los montos de «Costo y pagos») para revisarlo y mandarlo solo. */
export async function prepararInvoiceBalance(id: string): Promise<Resultado> {
  await requireAdmin();
  return intentar("invoice-balance", async () => {
    const p = await leerPagos(id);
    if (!p?.contrato) throw new Error("Primero prepara el contrato.");
    if (!p.email) throw new Error("Falta el email del cliente.");
    if (!p.fecha) throw new Error("Falta la fecha del evento.");
    if (!(p.balance > 0)) throw new Error("No hay balance por cobrar.");
    await tgs.crearInvoiceBalance(p.contrato, { ...montos(p), fecha_evento: p.fecha });
  });
}

/** Mensaje (machote) que acompaña a los documentos: el mismo para todos los clientes. */
export async function guardarMensaje(asunto: string, mensaje: string): Promise<Resultado> {
  const u = await requireAdmin();
  return intentar("mensaje", () => guardarMachote(asunto, mensaje, u.nombre));
}

/** Tras la firma del cliente: pone la firma de Elegance y manda los documentos firmados al cliente y a Elegance. */
export async function firmarContrato(id: string): Promise<Resultado> {
  const u = await requireAdmin();
  return intentar("firmar", async () => {
    const p = await leerPagos(id);
    if (!p?.contrato) throw new Error("Este cliente no tiene contrato.");
    await tgs.firmarContrato(p.contrato);
    await guardarContrato(id, p.contrato, "completo");
    const c = await tgs.leerContrato(p.contrato).catch(() => null);
    await registrarEnvio({
      clienteId: id,
      enviadoPor: u.nombre,
      destinatario: p.email,
      contratoNo: p.contrato,
      documentos: (c?.documentos ?? []).filter((d) => !d.solo_lectura).map((d) => ({ id: d.id, titulo: d.titulo })),
      asunto: "Documentos firmados (versión final)",
      mensaje: null,
      tipo: "firmar",
    });
  });
}

/** Borra el contrato en TuGiroSuite (solo si aún no se envió) para preparar otro. */
export async function descartarContrato(id: string): Promise<Resultado> {
  await requireAdmin();
  return intentar("descartar", async () => {
    const p = await leerPagos(id);
    // Si ya no existe en TuGiroSuite (se borró allá), solo se quita de aquí.
    if (p?.contrato) await tgs.descartarContrato(p.contrato).catch((e: Error) => {
      if (!/no encuentr|no encontr|not found/i.test(e.message)) throw e;
    });
    await guardarContrato(id, null, null);
  });
}
