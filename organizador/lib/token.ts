import { createHmac, timingSafeEqual } from "node:crypto";

/** Una sola persona: la sesión es una cookie firmada con AUTH_SECRET tras escribir CLAVE_ACCESO. */

export const COOKIE = "org_sesion";
export const DURACION_S = 60 * 60 * 24 * 180; // 6 meses

function secreto(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET no está configurado (mínimo 16 caracteres).");
  return s;
}

export const firmar = (dato: string) => createHmac("sha256", secreto()).update(dato).digest("base64url");

export const iguales = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function crearToken(): string {
  const exp = String(Math.floor(Date.now() / 1000) + DURACION_S);
  return `${exp}.${firmar(`sesion:${exp}`)}`;
}

export function tokenValido(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return iguales(sig, firmar(`sesion:${exp}`));
}

export function claveCorrecta(clave: string): boolean {
  const buena = process.env.CLAVE_ACCESO;
  if (!buena) throw new Error("CLAVE_ACCESO no está configurada.");
  return iguales(firmar(clave), firmar(buena));
}

/** Secreto que comparten las tareas programadas de Netlify y Telegram con la app. */
export const secretoCron = () => firmar("cron").slice(0, 40);
export const secretoTelegram = () => firmar("telegram").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
