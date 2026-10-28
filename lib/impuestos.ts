/**
 * Impuestos de cada pago (depósito y balance). El costo de los paquetes va siempre sin impuestos;
 * el IVA (16 %) y el % adicional se eligen por separado para cada pago y se calculan sobre él:
 * paquetes 2000 · depósito 1000 + IVA 160 = 1160 · balance 1000 sin impuestos = 1000.
 *
 * Es el mismo cálculo que la vista clientes_totales; aquí sirve para recalcular al escribir.
 */

export const IVA = 0.16;

export const redondear = (n: number) => Math.round(n * 100) / 100;

/** Cómo se cobra un pago: con IVA o no, y porcentaje adicional como fracción (0.03 = 3 %; null = no se usa). */
export type Cargos = { iva: boolean; extra: number | null };
export type Pago = { base: number; iva: number; extra: number; total: number };

export function calcularPago(base: number, c: Cargos): Pago {
  const iva = c.iva ? redondear(base * IVA) : 0;
  const extra = c.extra ? redondear(base * c.extra) : 0;
  return { base: redondear(base), iva, extra, total: redondear(base + iva + extra) };
}

export function calcularPagos(subtotal: number, deposito: number, d: Cargos, b: Cargos) {
  const dep = calcularPago(deposito, d);
  const bal = calcularPago(subtotal - deposito, b);
  return {
    deposito: dep,
    balance: bal,
    iva: redondear(dep.iva + bal.iva),
    extra: redondear(dep.extra + bal.extra),
    total: redondear(dep.total + bal.total),
  };
}

/** 0.035 → "3.5" */
export const porcentaje = (f: number | null) => (f == null ? "" : String(redondear(f * 100)));
