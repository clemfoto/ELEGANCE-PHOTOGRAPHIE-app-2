import "server-only";
import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { MARCA } from "@/config/galerias";

/** Contraseñas (scrypt con sal) y códigos de invitación. Nunca se guarda la contraseña en claro. */

const scrypt = promisify(scryptCb) as (clave: string, sal: Buffer, largo: number) => Promise<Buffer>;
const LARGO = 32;

export async function cifrarClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(clave, sal, LARGO);
  return `scrypt$${sal.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function comprobarClave(clave: string, guardada: unknown): Promise<boolean> {
  const [algo, sal, hash] = String(guardada ?? "").split("$");
  if (algo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64url");
  const calculado = await scrypt(clave, Buffer.from(sal, "base64url"), esperado.length || LARGO);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

/** Sin letras que se confunden (0/O, 1/I/L). */
const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código de invitación personal, p. ej. "EP-7KQ2-M9XA" (prefijo en MARCA). */
export function generarCodigo(): string {
  const bloque = () => Array.from({ length: 4 }, () => LETRAS[randomInt(LETRAS.length)]).join("");
  return `${MARCA.prefijoCodigo}-${bloque()}-${bloque()}`;
}

/** Compara códigos sin distinguir mayúsculas ni espacios/guiones. */
export function mismoCodigo(a: unknown, b: unknown): boolean {
  const n = (x: unknown) => String(x ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const x = Buffer.from(n(a));
  const y = Buffer.from(n(b));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

export const CLAVE_MINIMA = 8;
