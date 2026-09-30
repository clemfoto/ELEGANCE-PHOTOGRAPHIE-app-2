import type { AirRecord, Field } from "@/lib/airtable";
import { texto } from "@/lib/formato";

export const val = (r: AirRecord, f?: Field) => (f ? r.fields[f.name] : undefined);

/** Búsqueda de texto en todos los campos visibles (incluye nombres de registros enlazados). */
export function buscar(
  regs: AirRecord[],
  campos: Field[],
  q: string,
  nombres: Record<string, Map<string, string>>,
): AirRecord[] {
  const terminos = normalizar(q).split(/\s+/).filter(Boolean);
  if (!terminos.length) return regs;
  return regs.filter((r) => {
    const todo = normalizar(
      campos
        .map((f) => {
          const v = r.fields[f.name];
          const destino = f.options?.linkedTableId;
          if (destino && Array.isArray(v)) return v.map((id) => nombres[destino]?.get(id) ?? "").join(" ");
          return texto(v);
        })
        .join(" "),
    );
    return terminos.every((t) => todo.includes(t));
  });
}

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Filtra por una opción de un campo de selección (simple o múltiple). */
export function filtrarOpcion(regs: AirRecord[], f: Field | undefined, opcion: string | undefined): AirRecord[] {
  if (!f || !opcion) return regs;
  return regs.filter((r) => {
    const v = r.fields[f.name];
    return Array.isArray(v) ? v.map(texto).includes(opcion) : texto(v) === opcion;
  });
}

/** Ordena por un campo; los vacíos van al final. */
export function ordenar(regs: AirRecord[], f: Field | undefined, dir: "asc" | "desc" = "asc"): AirRecord[] {
  if (!f) return regs;
  const signo = dir === "asc" ? 1 : -1;
  return [...regs].sort((a, b) => {
    const x = a.fields[f.name];
    const y = b.fields[f.name];
    const vx = x == null || x === "";
    const vy = y == null || y === "";
    if (vx || vy) return vx === vy ? 0 : vx ? 1 : -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * signo;
    return texto(x).localeCompare(texto(y), "es", { numeric: true }) * signo;
  });
}

/** Suma un campo numérico (los rollups pueden venir como número o lista). */
export function suma(regs: AirRecord[], f: Field | undefined): number {
  if (!f) return 0;
  return regs.reduce((s, r) => s + aNumero(r.fields[f.name]), 0);
}

export function aNumero(v: unknown): number {
  if (Array.isArray(v)) return v.reduce((s: number, x) => s + aNumero(x), 0);
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? 0 : n;
}
