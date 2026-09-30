import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import type { Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { Valor } from "@/components/Valor";

const LARGOS = new Set(["multilineText", "richText", "multipleAttachments"]);

/** Tarjeta genérica: nombre + los primeros campos con valor. Sirve para cualquier tabla nueva. */
export default function Generica({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const principal = campoPrincipal(ctx.t);
  const elegidos = Array.isArray(ctx.g.tarjeta)
    ? ctx.campos.filter((f) => (ctx.g.tarjeta as string[]).includes(f.name))
    : ctx.campos.filter((f) => f.id !== principal.id && !LARGOS.has(f.type));
  const foto = ctx.campos.find((f) => f.type === "multipleAttachments");

  return (
    <div className="rejilla">
      {regs.map((r) => {
        const conValor = elegidos.filter((f) => {
          const v = r.fields[f.name];
          return v != null && v !== "" && !(Array.isArray(v) && !v.length);
        });
        const adj = foto && (r.fields[foto.name] as { thumbnails?: { large?: { url: string } } }[] | undefined);
        const miniatura = adj?.[0]?.thumbnails?.large?.url;
        return (
          <Link key={r.id} href={`${rutaTabla(ctx.t)}/${r.id}`} className="tarjeta tarjeta-link">
            {miniatura && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="tarjeta-foto" src={miniatura} alt="" loading="lazy" />
            )}
            <h2 className="tarjeta-titulo">{textoPrincipal(r.fields[principal.name]) || "Sin nombre"}</h2>
            <dl className="mini-campos">
              {conValor.slice(0, 4).map((f) => (
                <div key={f.id}>
                  <dt>{f.name}</dt>
                  <dd>
                    <Valor f={f} v={r.fields[f.name]} enlaces={ctx.enlaces} sinEnlaces />
                  </dd>
                </div>
              ))}
            </dl>
          </Link>
        );
      })}
    </div>
  );
}
