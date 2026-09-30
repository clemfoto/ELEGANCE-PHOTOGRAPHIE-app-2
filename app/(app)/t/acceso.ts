"use server";
import { updateTag } from "next/cache";
import { actualizarRegistro, getRegistro, tagTabla } from "@/lib/airtable";
import { requireAdmin } from "@/lib/auth";
import { generarCodigo } from "@/lib/clave";
import { EQUIPO, type Rol } from "@/config/galerias";

/** Resultado de las acciones de acceso: el mensaje de error se muestra tal cual en la ficha. */
export type ResultadoAcceso = { error?: string };

async function guardar(id: string, fields: Record<string, unknown>): Promise<ResultadoAcceso> {
  try {
    await actualizarRegistro(EQUIPO.tabla, id, fields);
  } catch (e) {
    console.error("[acceso] no se pudo guardar en Equipo:", e);
    return { error: `Airtable no aceptó el cambio: ${(e as Error).message}` };
  }
  updateTag(tagTabla(EQUIPO.tabla));
  return {};
}

/**
 * Da (o renueva) un código de invitación personal. Borra la contraseña anterior:
 * la persona crea una nueva en /registro con este código.
 */
export async function generarInvitacion(id: string): Promise<ResultadoAcceso> {
  const yo = await requireAdmin();
  const r = await getRegistro(EQUIPO.tabla, id);
  if (!r) return { error: "No se encontró a esta persona en Equipo." };
  if (!String(r.fields[EQUIPO.email] ?? "").trim()) return { error: "Añade primero su email (botón Editar)." };
  if (r.id === yo.id && r.fields[EQUIPO.clave]) return { error: "No puedes renovar tu propio código mientras tienes contraseña." };
  return guardar(id, {
    [EQUIPO.codigo]: generarCodigo(),
    [EQUIPO.estadoInvitacion]: EQUIPO.invitacion.pendiente,
    [EQUIPO.clave]: null,
    // Quien recibe una invitación necesita poder entrar.
    [EQUIPO.activo]: true,
  });
}

/** Cancela el acceso: invalida el código y la contraseña, y cierra sus sesiones abiertas. */
export async function cancelarInvitacion(id: string): Promise<ResultadoAcceso> {
  const yo = await requireAdmin();
  if (id === yo.id) return { error: "No puedes cancelar tu propio acceso." };
  return guardar(id, {
    [EQUIPO.codigo]: null,
    [EQUIPO.estadoInvitacion]: EQUIPO.invitacion.cancelada,
    [EQUIPO.clave]: null,
  });
}

/** Administrador (ve todo) o Equipo (solo Tareas y Calendario). */
export async function cambiarRol(id: string, rol: Rol): Promise<ResultadoAcceso> {
  const yo = await requireAdmin();
  if (rol !== "Administrador" && rol !== "Equipo") return { error: "Rol no válido." };
  if (id === yo.id && rol !== EQUIPO.rolAdmin) return { error: "No puedes quitarte el rol de Administrador a ti mismo." };
  return guardar(id, { [EQUIPO.rol]: rol });
}
