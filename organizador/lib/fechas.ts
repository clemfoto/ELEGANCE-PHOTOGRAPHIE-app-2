import { ZONA } from "@/config/negocios";

/** Fechas como texto YYYY-MM-DD (sin hora) y horas como HH:MM, siempre en la zona del organizador. */

const pad = (n: number) => String(n).padStart(2, "0");

const partes = (d: Date, zona = ZONA) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zona,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}`, s: Number(p.second) };
};

export const hoyISO = (ahora = new Date()) => partes(ahora).fecha;
export const horaActual = (ahora = new Date()) => partes(ahora).hora;

/** Instante (ms) en que es `fecha` a las `hora` en la zona del organizador. */
export function aEpoch(fecha: string, hora: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const supuesto = Date.UTC(a, m - 1, d, h, mi);
  // Diferencia entre la hora "de pared" que sale en la zona y la que queríamos.
  const p = partes(new Date(supuesto));
  const [va, vm, vd] = p.fecha.split("-").map(Number);
  const [vh, vmi] = p.hora.split(":").map(Number);
  const visto = Date.UTC(va, vm - 1, vd, vh, vmi);
  return supuesto - (visto - supuesto);
}

const utc = (fecha: string) => new Date(`${fecha}T12:00:00Z`);

export function sumarDias(fecha: string, n: number): string {
  const d = utc(fecha);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado. */
export const diaSemana = (fecha: string) => utc(fecha).getUTCDay();

/** Lunes de la semana de `fecha`. */
export const inicioSemana = (fecha: string) => sumarDias(fecha, -((diaSemana(fecha) + 6) % 7));

export const diasEntre = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86400000);

export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export const diasDelMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};

export const esFecha = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(utc(s).getTime());
export const esHora = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const fmt = (opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-MX", { ...opciones, timeZone: "UTC" });
export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const fechaLarga = (f: string) => mayuscula(fmt({ weekday: "long", day: "numeric", month: "long" }).format(utc(f)));
export const fechaCorta = (f: string) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(utc(f)).replace(/\./g, "");
export const fechaNum = (f: string) => fmt({ day: "numeric", month: "short", year: "numeric" }).format(utc(f)).replace(/\./g, "");
export const nombreMes = (mes: string) => mayuscula(fmt({ month: "long", year: "numeric" }).format(utc(`${mes}-01`)));
export const mesCorto = (mes: string) => mayuscula(fmt({ month: "short" }).format(utc(`${mes}-01`)).replace(".", ""));

/** "Hoy", "Mañana", "Ayer" o la fecha corta. */
export function fechaRelativa(f: string, hoy = hoyISO()): string {
  const d = diasEntre(hoy, f);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  return mayuscula(fechaCorta(f));
}

export function horaFin(hora: string, duracion: number): string {
  const [h, m] = hora.split(":").map(Number);
  const t = Math.min(h * 60 + m + duracion, 24 * 60 - 1);
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

export const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};
