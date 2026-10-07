import { type NextRequest } from "next/server";
import { negocio } from "@/config/negocios";
import { listarMovimientos } from "@/lib/datos";

/** CSV de ingresos y gastos de un año (para el contador o una hoja de cálculo). La sesión la comprueba proxy.ts. */
export async function GET(req: NextRequest) {
  const anio = /^\d{4}$/.test(req.nextUrl.searchParams.get("anio") ?? "") ? req.nextUrl.searchParams.get("anio")! : String(new Date().getFullYear());
  const n = negocio(req.nextUrl.searchParams.get("n") ?? "");
  const filas = (await listarMovimientos())
    .filter((m) => m.fecha.startsWith(anio) && (!n || m.negocio === n.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    ["Fecha", "Negocio", "Tipo", "Concepto", "Categoría", "Monto", "Notas"].map(celda).join(","),
    ...filas.map((m) =>
      [m.fecha, negocio(m.negocio)?.nombre, m.tipo === "ingreso" ? "Ingreso" : "Gasto", m.concepto, m.categoria, (m.tipo === "ingreso" ? m.monto : -m.monto).toFixed(2), m.notas].map(celda).join(","),
    ),
  ].join("\r\n");
  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="contabilidad-${n?.id ?? "todos"}-${anio}.csv"`,
    },
  });
}
