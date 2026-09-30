import Link from "next/link";
import { contextoTabla } from "@/lib/contexto";
import { rutaTabla, titulo } from "@/lib/esquema";
import { camposFormulario } from "@/lib/formulario";
import Formulario from "@/components/Formulario";

export const metadata = { title: "Nuevo" };

export default async function Nuevo({
  params,
  searchParams,
}: {
  params: Promise<{ tabla: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const [{ tabla }, sp] = await Promise.all([params, searchParams]);
  const ctx = await contextoTabla(tabla);
  // ?pre_<idCampo>=valor precarga un campo (p. ej. el cliente al crear una tarea desde su ficha).
  const pre = Object.fromEntries(
    Object.entries(sp)
      .filter(([k]) => k.startsWith("pre_"))
      .map(([k, v]) => [k.slice(4), v]),
  );
  const base = rutaTabla(ctx.t);
  return (
    <>
      <header className="cabecera cabecera-ficha">
        <Link href={base} className="volver">
          ‹ {titulo(ctx.t)}
        </Link>
        <h1 className="titulo">Nuevo</h1>
      </header>
      <section className="tarjeta bloque">
        <Formulario tabla={ctx.t.id} registro={null} campos={camposFormulario(ctx, null, pre)} volver={base} />
      </section>
    </>
  );
}
