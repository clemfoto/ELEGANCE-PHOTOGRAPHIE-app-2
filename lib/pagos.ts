import "server-only";
import { sql } from "@/lib/datos";
import type { Pago } from "@/lib/impuestos";

/**
 * Pagos de un cliente: precio de cada paquete para ese cliente (puede llevar descuento),
 * depósito y balance, cada uno con su IVA y % adicional si se usan. Los totales salen de la
 * vista clientes_totales (mismo cálculo que lib/impuestos.ts).
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
  /** Costo que venía de Airtable: es el subtotal mientras ningún paquete tenga precio. */
  costoAnterior: number | null;
  deposito: number | null;
  depositoIva: boolean;
  /** Fracción: 0.03 = 3 %. */
  depositoExtra: number | null;
  balanceIva: boolean;
  balanceExtra: number | null;
  depositoPagadoEn: string | null;
  /** Costo de los paquetes, sin impuestos. */
  subtotal: number;
  pagoDeposito: Pago;
  pagoBalance: Pago;
  iva: number;
  extra: number;
  /** Total a cobrar (paquetes + impuestos de cada pago). */
  total: number;
  /** Balance a cobrar, con sus impuestos. */
  balance: number;
  contrato: string | null;
  /** Resumen del servicio: detalles elegidos de las opciones de sus servicios y texto libre. */
  resumenOpciones: string[];
  resumenTexto: string;
};

export async function leerPagos(id: string): Promise<Pagos | null> {
  const [c] = await sql<{
    id: string;
    nombre: string | null;
    fecha_evento: string | null;
    venue: string | null;
    email: string | null;
    telefono: string | null;
    costo: number | null;
    deposito: number | null;
    deposito_iva: boolean;
    deposito_extra: number | null;
    balance_iva: boolean;
    balance_extra: number | null;
    deposito_pagado_en: string | null;
    tugirosuite_contrato_id: string | null;
    solicitud_especial: string | null;
    resumen_opciones: string[];
    subtotal: number;
    t_deposito: number;
    t_deposito_iva: number;
    t_deposito_extra: number;
    deposito_total: number;
    balance_base: number;
    t_balance_iva: number;
    t_balance_extra: number;
    balance: number;
    iva: number;
    extra: number;
    total: number;
  }>(
    `select c.id, c.nombre, c.fecha_evento, c.venue, c.email, c.telefono, c.costo, c.deposito,
            c.deposito_iva, c.deposito_extra, c.balance_iva, c.balance_extra,
            c.deposito_pagado_en, c.tugirosuite_contrato_id, c.solicitud_especial, c.resumen_opciones,
            t.subtotal, t.deposito as t_deposito, t.deposito_iva as t_deposito_iva, t.deposito_extra as t_deposito_extra,
            t.deposito_total, t.balance_base, t.balance_iva as t_balance_iva, t.balance_extra as t_balance_extra,
            t.balance, t.iva, t.extra, t.total
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
    deposito: c.deposito,
    depositoIva: c.deposito_iva,
    depositoExtra: c.deposito_extra,
    balanceIva: c.balance_iva,
    balanceExtra: c.balance_extra,
    depositoPagadoEn: c.deposito_pagado_en,
    subtotal: c.subtotal,
    pagoDeposito: { base: c.t_deposito, iva: c.t_deposito_iva, extra: c.t_deposito_extra, total: c.deposito_total },
    pagoBalance: { base: c.balance_base, iva: c.t_balance_iva, extra: c.t_balance_extra, total: c.balance },
    iva: c.iva,
    extra: c.extra,
    total: c.total,
    balance: c.balance,
    contrato: c.tugirosuite_contrato_id,
    resumenOpciones: c.resumen_opciones ?? [],
    resumenTexto: c.solicitud_especial ?? "",
  };
}

export type CambiosPagos = {
  precios: Record<string, number | null>;
  deposito: number | null;
  depositoIva: boolean;
  /** Porcentajes como fracción (0.03 = 3 %). */
  depositoExtra: number | null;
  balanceIva: boolean;
  balanceExtra: number | null;
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

/** Porcentaje adicional como fracción; 0 o vacío = no se usa. */
const fraccion = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Math.round(Number(v) * 10000) / 10000;
  if (!isFinite(n) || n < 0 || n > 10) throw new Error("El porcentaje adicional no es válido.");
  return n || null;
};

export async function guardarPagos(id: string, d: CambiosPagos): Promise<void> {
  const email = d.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El email del cliente no es válido.");
  for (const [servicio, precio] of Object.entries(d.precios)) {
    await sql("update public.cliente_servicios set precio = $3 where cliente_id = $1 and servicio_id = $2", [id, servicio, monto(precio)]);
  }
  await sql(
    `update public.clientes set deposito = $2, email = $3, telefono = $4, resumen_opciones = $5, solicitud_especial = $6,
            deposito_iva = $7, deposito_extra = $8, balance_iva = $9, balance_extra = $10 where id = $1`,
    [
      id,
      monto(d.deposito),
      email,
      d.telefono?.trim() || null,
      [...new Set((d.resumenOpciones ?? []).map((x) => String(x).trim()).filter(Boolean))].slice(0, 50),
      d.resumenTexto?.trim().slice(0, 4000) || null,
      Boolean(d.depositoIva),
      fraccion(d.depositoExtra),
      Boolean(d.balanceIva),
      fraccion(d.balanceExtra),
    ],
  );
}

/** Guarda el número de contrato de TuGiroSuite (o lo borra al descartarlo). */
export async function guardarContrato(id: string, no: string | null, estado: string | null): Promise<void> {
  await sql("update public.clientes set tugirosuite_contrato_id = $2, tugirosuite_estado = $3 where id = $1", [id, no, estado]);
}

/** Al mandar el invoice, el depósito queda pagado (con fecha de hoy si no tenía). */
export async function marcarDepositoPagado(id: string, hoy: string): Promise<void> {
  await sql("update public.clientes set deposito_pagado_en = coalesce(deposito_pagado_en, $2::date) where id = $1", [id, hoy]);
}

export async function marcarEnviado(id: string): Promise<void> {
  await sql("update public.clientes set tugirosuite_estado = 'enviado' where id = $1 and tugirosuite_estado = 'borrador'", [id]);
}
