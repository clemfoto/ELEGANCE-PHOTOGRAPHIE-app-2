"use server";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { tagTabla } from "@/lib/datos";
import { requireAdmin } from "@/lib/auth";
import { hoyISO } from "@/lib/formato";
import { guardarContrato, guardarPagos as guardar, leerPagos, marcarDepositoPagado, type CambiosPagos } from "@/lib/pagos";
import * as tgs from "@/lib/tugirosuite";
import { TABLAS } from "@/config/galerias";

/** Pagos del cliente y su contrato en TuGiroSuite (solo administradores). */

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
      !p.servicios.length && "servicios",
      p.servicios.some((s) => s.precio == null) && "precio de cada servicio",
      !(p.total > 0) && "costo total",
      !(p.deposito && p.deposito > 0) && "depósito",
    ].filter(Boolean);
    if (faltan.length) throw new Error(`Falta: ${faltan.join(", ")}.`);
    if (p.deposito! > p.total) throw new Error("El depósito es mayor que el costo total.");
    const h = await headers();
    const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
    const no = await tgs.crearContrato({
      cliente: { nombre: p.nombre.trim(), email: p.email!, ...(p.telefono ? { tel: p.telefono } : {}) },
      fecha_evento: p.fecha!,
      ...(p.venue ? { venue: p.venue } : {}),
      servicios: p.servicios.map((s) => ({ nombre: s.nombre, precio: s.precio })),
      total: p.total,
      deposito: p.deposito!,
      iva: p.aplicaIva,
      dron,
      avisoUrl: `${base}/t/clientes/${id}`,
    });
    await guardarContrato(id, no, "borrador");
  });
}

/** Manda al cliente el contrato para firmar y el invoice del depósito; el depósito queda pagado. */
export async function enviarContrato(id: string): Promise<Resultado> {
  await requireAdmin();
  return intentar("enviar", async () => {
    const p = await leerPagos(id);
    if (!p?.contrato) throw new Error("Primero prepara el contrato.");
    await tgs.enviarContrato(p.contrato, p.nombre.trim());
    await marcarDepositoPagado(id, hoyISO());
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
