"use server";
import { updateTag } from "next/cache";
import { tagTabla } from "@/lib/datos";
import { requireAdmin } from "@/lib/auth";
import { guardarJornadas as guardar, type Jornada } from "@/lib/jornadas";
import { TABLAS } from "@/config/galerias";

/** Días del servicio y sus horarios (ficha de cliente, solo administradores). */
export async function guardarJornadas(id: string, dias: Jornada[]): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await guardar(id, dias);
  } catch (e) {
    console.error("[jornadas] guardar:", e);
    return { error: (e as Error).message };
  } finally {
    updateTag(tagTabla(TABLAS.clientes));
  }
  return {};
}
