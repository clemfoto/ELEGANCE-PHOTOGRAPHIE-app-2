import { COLORES_OPCION, COLOR_POR_DEFECTO, MONEDA, ZONA_HORARIA } from "@/config/galerias";
import type { Field } from "@/lib/airtable";

/** "2026-10-12" → Date a mediodía local (evita saltos de día por zona horaria). */
export function parseFecha(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const solo = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const d = new Date(solo ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? null : d;
}

export function fecha(v: unknown, conHora = false): string {
  const d = parseFecha(v);
  if (!d) return "";
  const esSoloFecha = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(conHora && !esSoloFecha ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: esSoloFecha ? undefined : ZONA_HORARIA,
  }).format(d);
}

/** Fecha de hoy "YYYY-MM-DD" en la zona horaria del negocio. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());
}

/** Días entre hoy y una fecha "YYYY-MM-DD" (negativo = ya pasó). */
export function diasHasta(v: unknown): number | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const a = Date.parse(`${hoyISO()}T00:00:00Z`);
  const b = Date.parse(`${v.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function numero(v: unknown, decimales?: number): string {
  const n = typeof v === "number" ? v : Number(v);
  if (v == null || v === "" || isNaN(n)) return "";
  return new Intl.NumberFormat(MONEDA.locale, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales ?? 2,
  }).format(n);
}

export function moneda(v: unknown, f?: Field): string {
  const n = typeof v === "number" ? v : Number(v);
  if (v == null || v === "" || isNaN(n)) return "";
  const opts = f?.options?.result?.options ?? f?.options;
  const simbolo = (opts?.symbol as string | undefined) ?? "$";
  const precision = (opts?.precision as number | undefined) ?? 2;
  return `${n < 0 ? "−" : ""}${simbolo}${numero(Math.abs(n), precision)}`;
}

export function colorOpcion(nombre: string): [string, string] {
  return COLORES_OPCION[nombre.trim().toLowerCase()] ?? COLOR_POR_DEFECTO;
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  return ((partes[0][0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

/** Tipo efectivo de un campo calculado (fórmula/rollup/lookup → tipo del resultado). */
export function tipoEfectivo(f: Field): string {
  return f.options?.result?.type ?? f.type;
}

/** Valor como texto plano (búsqueda, títulos). */
export function texto(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(texto).join(" ");
  if (typeof v === "object") {
    const o = v as { name?: string; filename?: string; label?: string; email?: string };
    return o.name ?? o.filename ?? o.label ?? o.email ?? "";
  }
  return String(v);
}

/** Minutos que la zona horaria del negocio está por delante de UTC en ese instante. */
function desfaseMin(instante: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONA_HORARIA,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  const comoUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((comoUTC - instante.getTime()) / 60000);
}

/** ISO (UTC) → valor para <input type="datetime-local"> en la zona del negocio. */
export function isoALocal(iso: unknown): string {
  const d = typeof iso === "string" ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "";
  return new Date(d.getTime() + desfaseMin(d) * 60000).toISOString().slice(0, 16);
}

/** Valor de <input type="datetime-local"> (zona del negocio) → ISO UTC. */
export function localAIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;
  const comoUTC = new Date(`${local.slice(0, 16)}:00Z`);
  return new Date(comoUTC.getTime() - desfaseMin(comoUTC) * 60000).toISOString();
}

/** Dinero en pesos: $1,200 (con centavos solo si los hay). */
export function dinero(v: unknown, decimales?: number): string {
  const n = typeof v === "number" ? v : Number(v);
  if (v == null || v === "" || isNaN(n)) return "";
  const simbolo = "$";
  const dec = decimales ?? (Number.isInteger(n) ? 0 : 2);
  return `${n < 0 ? "−" : ""}${simbolo}${numero(Math.abs(n), dec)}`;
}

/** "lunes, 28 de septiembre" → "Lunes, 28 de septiembre". */
export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Suma "YYYY-MM-DD" + días. */
export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
