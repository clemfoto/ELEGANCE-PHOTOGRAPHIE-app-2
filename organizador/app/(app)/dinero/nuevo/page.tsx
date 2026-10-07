import Link from "next/link";
import type { Metadata } from "next";
import { listarMovimientos } from "@/lib/datos";
import { hoyISO } from "@/lib/fechas";
import FormMovimiento from "@/components/FormMovimiento";

export const metadata: Metadata = { title: "Nuevo movimiento" };

type Props = { searchParams: Promise<{ negocio?: string; tipo?: string; volver?: string }> };

export default async function NuevoMovimiento({ searchParams }: Props) {
  const p = await searchParams;
  const volver = p.volver?.startsWith("/") ? p.volver : "/dinero";
  const usadas = [...new Set((await listarMovimientos()).map((m) => m.categoria).filter((c): c is string => Boolean(c)))];
  return (
    <>
      <header className="cabecera">
        <Link href={volver} className="volver">‹ Volver</Link>
        <h1 className="titulo">{p.tipo === "ingreso" ? "Nuevo ingreso" : p.tipo === "gasto" ? "Nuevo gasto" : "Nuevo movimiento"}</h1>
      </header>
      <FormMovimiento negocio={p.negocio} tipo={p.tipo} fecha={hoyISO()} volver={volver} categoriasUsadas={usadas} />
    </>
  );
}
