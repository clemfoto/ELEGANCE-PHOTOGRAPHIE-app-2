import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistro } from "@/lib/airtable";
import { contextoTabla } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { camposFormulario } from "@/lib/formulario";
import Formulario from "@/components/Formulario";
import SubirArchivo from "@/components/SubirArchivo";
import { Valor } from "@/components/Valor";

export const metadata = { title: "Editar" };

export default async function Editar({ params }: { params: Promise<{ tabla: string; id: string }> }) {
  const { tabla, id } = await params;
  const ctx = await contextoTabla(tabla);
  const r = await getRegistro(ctx.t.id, id);
  if (!r) notFound();
  const ficha = `${rutaTabla(ctx.t)}/${r.id}`;
  const adjuntos = ctx.campos.filter((f) => f.type === "multipleAttachments");
  return (
    <>
      <header className="cabecera cabecera-ficha">
        <Link href={ficha} className="volver">
          ‹ {textoPrincipal(r.fields[campoPrincipal(ctx.t).name]) || "Volver"}
        </Link>
        <h1 className="titulo">Editar</h1>
      </header>
      {adjuntos.map((f) => (
        <section key={f.id} className="tarjeta bloque">
          <span className="campo-label">{f.name}</span>
          <Valor f={f} v={r.fields[f.name]} enlaces={ctx.enlaces} />
          <SubirArchivo tabla={ctx.t.id} campo={f.id} registro={r.id} etiqueta="Añadir foto o archivo" />
        </section>
      ))}
      <section className="tarjeta bloque">
        <Formulario tabla={ctx.t.id} registro={r.id} campos={camposFormulario(ctx, r)} volver={ficha} />
      </section>
    </>
  );
}
