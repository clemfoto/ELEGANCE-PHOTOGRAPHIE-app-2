import "server-only";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { getRegistros, getRegistrosSinCache, type AirRecord } from "@/lib/airtable";
import { EQUIPO, type Rol } from "@/config/galerias";
import { COOKIE_SESION, verificarToken } from "@/lib/token";

export type Usuario = { id: string; nombre: string; email: string; rol: Rol };

/** Una persona puede entrar si está Activa en Equipo y su invitación no está cancelada. */
export function tieneAcceso(r: AirRecord): boolean {
  return r.fields[EQUIPO.activo] === true && String(r.fields[EQUIPO.estadoInvitacion] ?? "") !== EQUIPO.invitacion.cancelada;
}

export function aUsuario(r: AirRecord): Usuario {
  const email = String(r.fields[EQUIPO.email] ?? "").trim().toLowerCase();
  const rol = String(r.fields[EQUIPO.rol] ?? "") === EQUIPO.rolAdmin ? "Administrador" : "Equipo";
  return { id: r.id, nombre: String(r.fields[EQUIPO.nombre] ?? email), email, rol };
}

/**
 * Filas de Equipo con ese email (tengan o no acceso). Normalmente una; si por error dos personas
 * comparten email, el login y el registro eligen la fila por su contraseña o su código.
 * `fresco` lee Airtable sin caché.
 */
export async function filasPorEmail(email: string, fresco = false): Promise<AirRecord[]> {
  const buscado = email.trim().toLowerCase();
  if (!buscado) return [];
  const regs = await (fresco ? getRegistrosSinCache : getRegistros)(EQUIPO.tabla);
  return regs.filter((x) => String(x.fields[EQUIPO.email] ?? "").trim().toLowerCase() === buscado);
}

/**
 * Miembro con acceso a la app por su email. Equipo es la única lista de acceso:
 * desactivar a alguien o cancelar su invitación le cierra la sesión.
 */
export async function miembroPorEmail(email: string, fresco = false): Promise<Usuario | null> {
  const r = (await filasPorEmail(email, fresco)).find(tieneAcceso);
  return r ? aUsuario(r) : null;
}

/** Miembro con acceso por el ID de su fila en Equipo (las sesiones nuevas guardan el ID). */
export async function miembroPorId(id: string): Promise<Usuario | null> {
  const r = (await getRegistros(EQUIPO.tabla)).find((x) => x.id === id);
  return r && tieneAcceso(r) ? aUsuario(r) : null;
}

/**
 * Usuario de la sesión actual. El rol se relee de Equipo en cada petición
 * (con caché corta), así que desactivar a alguien o cambiarle el rol surte efecto enseguida.
 */
export async function getUsuario(): Promise<Usuario | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const p = verificarToken(token, "sesion");
  if (!p) return null;
  // Las sesiones guardan el ID de la fila de Equipo ("rec…"); las antiguas, el email.
  return p.email.startsWith("rec") ? miembroPorId(p.email) : miembroPorEmail(p.email);
}

export async function requireUsuario(): Promise<Usuario> {
  const u = await getUsuario();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<Usuario> {
  const u = await requireUsuario();
  if (u.rol !== EQUIPO.rolAdmin) forbidden();
  return u;
}
