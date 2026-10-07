import Link from "next/link";
import type { Metadata } from "next";
import { esFecha, esHora, hoyISO } from "@/lib/fechas";
import FormTarea from "@/components/FormTarea";

export const metadata: Metadata = { title: "Nueva tarea" };

type Props = { searchParams: Promise<{ negocio?: string; fecha?: string; hora?: string; volver?: string }> };

export default async function NuevaTarea({ searchParams }: Props) {
  const p = await searchParams;
  const volver = p.volver?.startsWith("/") ? p.volver : "/";
  return (
    <>
      <header className="cabecera">
        <Link href={volver} className="volver">‹ Volver</Link>
        <h1 className="titulo">Nueva tarea</h1>
      </header>
      <FormTarea negocio={p.negocio} fecha={esFecha(p.fecha) ? p.fecha : hoyISO()} hora={esHora(p.hora) ? p.hora : undefined} volver={volver} />
    </>
  );
}
