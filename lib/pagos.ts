import "server-only";
import { sql } from "@/lib/datos";

/**
 * Pagos de un cliente: precio de cada servicio para ese cliente (puede llevar descuento),
 * IVA, depósito y balance. Los totales salen de la vista clientes_totales.
 */

export type ServicioPrecio = {
  id: string;
  nombre: string;
  lista: number | null;
  precio: number | null;
  descripcion: string | null;
  /** Detalles que se pueden elegir para el resumen (Servicios → "Opciones del resumen"). */
  opciones: string[];
};
export type Pagos = {
  id: string;
  nombre: string;
  fecha: string | null;
  venue: string | null;
  email: string | null;
  telefono: string | null;
  servicios: ServicioPrecio[];
  /** Costo que venía de Airtable: es el subtotal mientras ningún servicio tenga precio. */
  costoAnterior: number | null;
  aplicaIva: boolean;
  deposito: number | null;
  depositoPagadoEn: string | null;
  subtotal: number;
  iva: number;
  total: number;
  balance: number;
  contrato: string | null;
  /** Resumen del servicio: detalles elegidos de las opciones de sus servicios y texto libre. */
  resumenOpciones: string[];
  resumenTexto: string;
};

export const IVA = 0.16;

export async function leerPagos(id: string): Promise<Pagos | null> {
  const [c] = await sql<{
    id: string;
    nombre: string | null;
    fecha_evento: string | null;
    venue: string | null;
    email: string | null;
    telefono: string | null;
    costo: number | null;
    aplica_iva: boolean;
    deposito: number | null;
    deposito_pagado_en: string | null;
    tugirosuite_contrato_id: string | null;
    solicitud_especial: string | null;
    resumen_opciones: string[];
    subtotal: number;
    iva: number;
    total: number;
    balance: number;
  }>(
    `select c.id, c.nombre, c.fecha_evento, c.venue, c.email, c.telefono, c.costo, c.aplica_iva, c.deposito,
            c.deposito_pagado_en, c.tugirosuite_contrato_id, c.solicitud_especial, c.resumen_opciones, t.subtotal, t.iva, t.total, t.balance
       from public.clientes c join public.clientes_totales t on t.id = c.id
      where c.id = $1`,
    [id],
  );
  if (!c) return null;
  const filas = await sql<Omit<ServicioPrecio, "opciones"> & { opciones: string | null }>(
    `select s.id, coalesce(s.nombre, 'Servicio') as nombre, s.precio as lista, cs.precio, s.descripcion, s.opciones
       from public.cliente_servicios cs join public.servicios s on s.id = cs.servicio_id
      where cs.cliente_id = $1 order by cs.orden, s.nombre`,
    [id],
  );
  const servicios = filas.map((s) => ({ ...s, opciones: lineas(s.opciones) }));
  return {
    id: c.id,
    nombre: c.nombre ?? "",
    fecha: c.fecha_evento,
    venue: c.venue,
    email: c.email,
    telefono: c.telefono,
    servicios,
    costoAnterior: c.costo,
    aplicaIva: c.aplica_iva,
    deposito: c.deposito,
    depositoPagadoEn: c.deposito_pagado_en,
    subtotal: c.subtotal,
    iva: c.iva,
    total: c.total,
    balance: c.balance,
    contrato: c.tugirosuite_contrato_id,
    resumenOpciones: c.resumen_opciones ?? [],
    resumenTexto: c.solicitud_especial ?? "",
  };
}

export type CambiosPagos = {
  precios: Record<string, number | null>;
  aplicaIva: boolean;
  deposito: number | null;
  email: string | null;
  telefono: string | null;
  resumenOpciones: string[];
  resumenTexto: string;
};

const lineas = (t: string | null | undefined) =>
  [...new Set((t ?? "").split(/\r?\n/).map((x) => x.replace(/^[-•*\s]+/, "").trim()).filter(Boolean))];

const monto = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Math.round(Number(v) * 100) / 100;
  if (!isFinite(n) || n < 0) throw new Error("Los montos deben ser números positivos.");
  return n;
};

export async function guardarPagos(id: string, d: CambiosPagos): Promise<void> {
  const email = d.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El email del cliente no es válido.");
  for (const [servicio, precio] of Object.entries(d.precios)) {
    await sql("update public.cliente_servicios set precio = $3 where cliente_id = $1 and servicio_id = $2", [id, servicio, monto(precio)]);
  }
  await sql(
    `update public.clientes set aplica_iva = $2, deposito = $3, email = $4, telefono = $5,
            resumen_opciones = $6, solicitud_especial = $7 where id = $1`,
    [
      id,
      Boolean(d.aplicaIva),
      monto(d.deposito),
      email,
      d.telefono?.trim() || null,
      [...new Set((d.resumenOpciones ?? []).map((x) => String(x).trim()).filter(Boolean))].slice(0, 50),
      d.resumenTexto?.trim().slice(0, 4000) || null,
    ],
  );
}

/** Guarda el número de contrato de TuGiroSuite (o lo borra al descartarlo). */
export async function guardarContrato(id: string, no: string | null, estado: string | null): Promise<void> {
  await sql("update public.clientes set tugirosuite_contrato_id = $2, tugirosuite_estado = $3 where id = $1", [id, no, estado]);
}

/** Al mandar el contrato con el invoice, el depósito queda pagado (con fecha de hoy si no tenía). */
export async function marcarDepositoPagado(id: string, hoy: string): Promise<void> {
  await sql(
    "update public.clientes set deposito_pagado_en = coalesce(deposito_pagado_en, $2::date), tugirosuite_estado = 'enviado' where id = $1",
    [id, hoy],
  );
}
