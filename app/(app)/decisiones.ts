"use server";
import { forbidden, notFound } from "next/navigation";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { reenviarAvisoCliente } from "@/lib/automatizaciones";
import { actualizarRegistro, getRegistro, tagTabla } from "@/lib/airtable";
import { requireAdmin } from "@/lib/auth";
import { opciones, valorSeleccion } from "@/lib/esquema";
import { texto } from "@/lib/formato";
import { DECISIONES, GALERIAS, TABLAS } from "@/config/galerias";

/** Acciones de un toque del panel "Lo que necesita decisión" (solo administradores). */

function refrescar(...tablas: string[]) {
  for (const t of tablas) updateTag(tagTabla(t));
  updateTag(tagTabla(TABLAS.clientes));
}

/** Visto bueno a una entrega en revisión. */
export async function aprobarEntrega(id: string): Promise<void> {
  await requireAdmin();
  const campo = String(GALERIAS[TABLAS.entrega].status);
  const r = await getRegistro(TABLAS.entrega, id);
  if (!r) notFound();
  const actual = opciones(r.fields[campo]);
  const nuevo = [...new Set([...actual.filter((x) => x !== DECISIONES.entregaEnRevision), DECISIONES.entregaAprobada])];
  await actualizarRegistro(TABLAS.entrega, id, { [campo]: await valorSeleccion(TABLAS.entrega, campo, nuevo) });
  refrescar(TABLAS.entrega);
}

/** Aprueba o rechaza un gasto. Quien lo pagó no puede aprobarlo: lo decide otro socio. */
export async function decidirGasto(id: string, aprobado: boolean): Promise<void> {
  const u = await requireAdmin();
  const g = GALERIAS[TABLAS.gastos];
  const r = await getRegistro(TABLAS.gastos, id);
  if (!r) notFound();
  const pagadores = (r.fields[String(g.pagador)] as string[] | undefined) ?? [];
  if (pagadores.includes(u.id)) forbidden();
  await actualizarRegistro(TABLAS.gastos, id, {
    [String(g.aprobacion)]: aprobado ? DECISIONES.aprobado : DECISIONES.rechazado,
    [String(g.aprobadoPor)]: [u.id],
  });
  refrescar(TABLAS.gastos, TABLAS.equipo);
}


/** Reenvía al grupo de eventos el aviso de un cliente, con el botón para confirmar presencia. */
export async function reenviarAviso(id: string): Promise<void> {
  await requireAdmin();
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  if (!(await reenviarAvisoCliente(id, base))) throw new Error("No se pudo enviar el aviso a Telegram.");
}
