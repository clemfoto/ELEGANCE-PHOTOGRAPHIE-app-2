import "server-only";
import type { AirRecord } from "@/lib/airtable";
import type { Contexto } from "@/lib/contexto";
import { campoPrincipal, esSoloLectura } from "@/lib/esquema";
import { isoALocal, texto } from "@/lib/formato";

/** Descripción serializable de un campo para el formulario (se pasa a un componente cliente). */
export type CampoForm = {
  id: string;
  nombre: string;
  tipo: string;
  descripcion?: string;
  opciones?: string[];
  tablaEnlazada?: string;
  unico?: boolean;
  simbolo?: string;
  valor: string | string[] | boolean;
  seleccion?: { id: string; nombre: string }[];
};

/** Campos editables de la tabla con su valor actual (o el precargado en la URL). */
export function camposFormulario(ctx: Contexto, r: AirRecord | null, pre: Record<string, string> = {}): CampoForm[] {
  const principal = campoPrincipal(ctx.t);
  const editables = ctx.campos.filter((f) => !esSoloLectura(f) && f.type !== "multipleAttachments" && f.type !== "barcode");
  editables.sort((a, b) => (a.id === principal.id ? -1 : b.id === principal.id ? 1 : 0));

  return editables.map((f) => {
    const v: unknown = r ? r.fields[f.name] : pre[f.id];
    const c: CampoForm = {
      id: f.id,
      nombre: f.name,
      tipo: f.type,
      descripcion: f.description,
      valor: "",
    };
    switch (f.type) {
      case "singleSelect":
      case "multipleSelects": {
        c.opciones = (f.options?.choices ?? []).map((x) => x.name);
        const actuales = (Array.isArray(v) ? v : v ? [v] : []).map(texto);
        for (const a of actuales) if (!c.opciones.includes(a)) c.opciones.push(a);
        c.valor = f.type === "singleSelect" ? actuales[0] ?? "" : actuales;
        break;
      }
      case "multipleRecordLinks": {
        const ids = (Array.isArray(v) ? v : typeof v === "string" && v ? v.split(",") : []) as string[];
        c.tablaEnlazada = f.options?.linkedTableId;
        c.unico = Boolean(f.options?.prefersSingleRecordLink);
        const nombres = c.tablaEnlazada ? ctx.enlaces.nombres[c.tablaEnlazada] : undefined;
        c.seleccion = ids.map((id) => ({ id, nombre: nombres?.get(id) ?? "Registro" }));
        c.valor = ids;
        break;
      }
      case "checkbox":
        c.valor = v === true || v === "1" || v === "true";
        break;
      case "percent":
        c.valor = v == null || v === "" ? "" : String(Number(v) * 100);
        break;
      case "dateTime":
        c.valor = isoALocal(v);
        break;
      case "currency":
        c.simbolo = (f.options?.symbol as string) ?? "$";
        c.valor = v == null ? "" : String(v);
        break;
      default:
        c.valor = v == null ? "" : String(v);
    }
    return c;
  });
}
