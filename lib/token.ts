import { createHmac, timingSafeEqual } from "node:crypto";

/** Tokens firmados con AUTH_SECRET (sin base de datos): sesión y enlace del calendario. */

export const COOKIE_SESION = "ep_sesion";
export const DURACION_SESION_S = 60 * 60 * 24 * 30; // 30 días

type Payload = { uso: "sesion"; email: string; exp: number };

function secreto(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET no está configurado (mínimo 16 caracteres).");
  return s;
}

const firma = (datos: string) => createHmac("sha256", secreto()).update(datos).digest("base64url");

export function firmarToken(uso: Payload["uso"], email: string, duracionS: number): string {
  const payload: Payload = { uso, email: email.startsWith("rec") ? email : email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + duracionS };
  const datos = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${datos}.${firma(datos)}`;
}

export function verificarToken(token: string | undefined, uso: Payload["uso"]): Payload | null {
  if (!token) return null;
  const [datos, sig] = token.split(".");
  if (!datos || !sig) return null;
  const esperada = Buffer.from(firma(datos));
  const recibida = Buffer.from(sig);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  try {
    const p = JSON.parse(Buffer.from(datos, "base64url").toString()) as Payload;
    if (p.uso !== uso || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

/** Firma corta y sin caducidad para URLs que no pueden llevar cookie (suscripción al calendario). */
export function firmaCorta(uso: string, dato: string): string {
  return firma(`${uso}:${dato}`).slice(0, 24);
}

export function comprobarFirmaCorta(uso: string, dato: string, recibida: string): boolean {
  const a = Buffer.from(firmaCorta(uso, dato));
  const b = Buffer.from(recibida);
  return a.length === b.length && timingSafeEqual(a, b);
}
