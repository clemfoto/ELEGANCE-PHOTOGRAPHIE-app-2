import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listarMovimientos } from "@/lib/datos";
import FormMovimiento from "@/components/FormMovimiento";
import BorrarMovimiento from "@/components/BorrarMovimiento";

export const metadata: Metadata = { title: "Movimiento" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ volver?: string }> };

export default async function EditarMovimiento({ params, searchParams }: Props) {
  const { id } = await params;
  const todos = await listarMovimientos();
  const m = todos.find((x) => x.id === id);
  if (!m) notFound();
  const p = await searchParams;
  const volver = p.volver?.startsWith("/") ? p.volver : `/dinero?mes=${m.fecha.slice(0, 7)}`;
  const usadas = [...new Set(todos.map((x) => x.categoria).filter((c): c is string => Boolean(c)))];
  return (
    <>
      <header className="cabecera">
        <Link href={volver} className="volver">‹ Volver</Link>
        <h1 className="titulo">{m.tipo === "ingreso" ? "Ingreso" : "Gasto"}</h1>
      </header>
      <FormMovimiento mov={m} fecha={m.fecha} volver={volver} categoriasUsadas={usadas} />
      <BorrarMovimiento id={m.id} volver={volver} />
    </>
  );
}
