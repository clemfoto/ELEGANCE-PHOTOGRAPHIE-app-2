import Link from "next/link";
import type { Field } from "@/lib/airtable";
import type { Enlaces } from "@/lib/contexto";
import { EQUIPO } from "@/config/galerias";
import { colorOpcion, fecha, iniciales, moneda, numero, texto, tipoEfectivo } from "@/lib/formato";

export function Chip({ nombre }: { nombre: string }) {
  const [bg, fg] = colorOpcion(nombre);
  return (
    <span className="chip" style={{ background: bg, color: fg }}>
      {nombre}
    </span>
  );
}

export function Avatar({ nombre, titulo, confirmado }: { nombre: string; titulo?: boolean; confirmado?: boolean }) {
  return (
    <span
      className={`avatar ${confirmado ? "confirmado" : ""}`}
      title={confirmado ? `${nombre} · confirmado` : nombre}
      aria-label={titulo ? undefined : nombre}
    >
      {iniciales(nombre)}
    </span>
  );
}

export function Avatares({
  ids,
  enlaces,
  conNombres,
  confirmados,
}: {
  ids: unknown;
  enlaces: Enlaces;
  conNombres?: boolean;
  /** IDs de quienes confirmaron su presencia (se marcan con un anillo verde). */
  confirmados?: unknown;
}) {
  const lista = Array.isArray(ids) ? (ids as string[]) : [];
  if (!lista.length) return null;
  const nombres = enlaces.nombres[EQUIPO.tabla];
  const personas = lista.map((id) => nombres?.get(id) ?? "?");
  const ok = new Set(Array.isArray(confirmados) ? (confirmados as string[]) : []);
  return (
    <span className="avatares">
      <span className="avatares-pila">
        {personas.map((n, i) => (
          <Avatar key={i} nombre={n} confirmado={ok.has(lista[i])} />
        ))}
      </span>
      {conNombres && <span className="avatares-nombres">{personas.join(", ")}</span>}
    </span>
  );
}

/** Muestra cualquier valor de Airtable según el tipo de campo. */
/** `sinEnlaces`: dentro de una tarjeta que ya es un enlace (no se puede anidar <a>). */
export function Valor({ f, v, enlaces, sinEnlaces }: { f: Field; v: unknown; enlaces: Enlaces; sinEnlaces?: boolean }) {
  if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return <span className="vacio">—</span>;
  const tipo = tipoEfectivo(f);
  // Dentro de una tarjeta-enlace, correos, teléfonos y URLs van como texto.
  if (sinEnlaces && (tipo === "email" || tipo === "phoneNumber" || tipo === "url")) return <span>{String(v)}</span>;

  switch (f.type === "multipleRecordLinks" ? f.type : tipo) {
    case "multipleRecordLinks": {
      const destino = f.options?.linkedTableId ?? "";
      if (destino === EQUIPO.tabla) return <Avatares ids={v} enlaces={enlaces} conNombres />;
      const nombres = enlaces.nombres[destino];
      const ruta = sinEnlaces ? undefined : enlaces.rutas[destino];
      return (
        <span className="enlaces">
          {(v as string[]).map((id) =>
            ruta ? (
              <Link key={id} href={`${ruta}/${id}`} className="enlace-chip">
                {nombres?.get(id) ?? "Registro"}
              </Link>
            ) : (
              <span key={id} className="enlace-chip">
                {nombres?.get(id) ?? "Registro"}
              </span>
            ),
          )}
        </span>
      );
    }
    case "singleSelect":
      return <Chip nombre={texto(v)} />;
    case "multipleSelects":
      return (
        <span className="chips">
          {(Array.isArray(v) ? v : [v]).map((x, i) => (
            <Chip key={i} nombre={texto(x)} />
          ))}
        </span>
      );
    case "checkbox":
      return <span>{v ? "Sí" : "No"}</span>;
    case "currency":
      return <span>{Array.isArray(v) ? v.map((x) => moneda(x, f)).join(", ") : moneda(v, f)}</span>;
    case "percent":
      return <span>{numero(Number(v) * 100)} %</span>;
    case "number":
    case "count":
    case "autoNumber":
    case "rating":
    case "duration":
      return <span>{Array.isArray(v) ? v.map((x) => numero(x)).join(", ") : numero(v)}</span>;
    case "date":
    case "dateTime":
    case "createdTime":
    case "lastModifiedTime":
      return <span>{Array.isArray(v) ? v.map((x) => fecha(x, true)).join(", ") : fecha(v, true)}</span>;
    case "email":
      return <a href={`mailto:${v}`}>{String(v)}</a>;
    case "phoneNumber":
      return <a href={`tel:${String(v).replace(/[^\d+]/g, "")}`}>{String(v)}</a>;
    case "url":
      return (
        <a href={String(v)} target="_blank" rel="noopener noreferrer" className="url">
          {String(v).replace(/^https?:\/\//, "")}
        </a>
      );
    case "multipleAttachments": {
      const adj = v as { id: string; url: string; filename: string; type?: string; thumbnails?: { large?: { url: string } } }[];
      return (
        <span className="adjuntos">
          {adj.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="adjunto" title={a.filename}>
              {a.thumbnails?.large?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.thumbnails.large.url} alt={a.filename} loading="lazy" />
              ) : (
                <span className="adjunto-doc">{a.filename}</span>
              )}
            </a>
          ))}
        </span>
      );
    }
    case "multilineText":
    case "richText":
      return <span className="multilinea">{String(v)}</span>;
    case "button":
      return (v as { url?: string; label?: string }).url ? (
        <a href={(v as { url: string }).url} target="_blank" rel="noopener noreferrer">
          {(v as { label?: string }).label ?? "Abrir"}
        </a>
      ) : null;
    default:
      return <span>{Array.isArray(v) ? v.map(texto).join(", ") : texto(v)}</span>;
  }
}
