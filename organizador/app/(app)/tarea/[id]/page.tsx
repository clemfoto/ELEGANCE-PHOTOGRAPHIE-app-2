import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { negocio } from "@/config/negocios";
import { obtenerTarea } from "@/lib/datos";
import { esFecha, fechaLarga, hoyISO } from "@/lib/fechas";
import { describirRepeticion, ocurreEl } from "@/lib/recurrencia";
import FormTarea from "@/components/FormTarea";
import CheckHecha from "@/components/CheckHecha";
import BorrarTarea from "@/components/BorrarTarea";

export const metadata: Metadata = { title: "Tarea" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ fecha?: string; volver?: string }> };

export default async function EditarTarea({ params, searchParams }: Props) {
  const t = await obtenerTarea((await params).id);
  if (!t) notFound();
  const p = await searchParams;
  const n = negocio(t.negocio)!;
  // Día concreto (para marcar hecha o quitar solo ese día de una serie).
  const fecha = esFecha(p.fecha) && ocurreEl(t, p.fecha) ? p.fecha : t.repetir.tipo === "nunca" ? t.fecha : undefined;
  const volver = p.volver?.startsWith("/") ? p.volver : `/n/${t.negocio}`;
  const repetitiva = t.repetir.tipo !== "nunca";

  return (
    <>
      <header className="cabecera">
        <Link href={volver} className="volver">‹ Volver</Link>
        <div className="cabecera-fila">
          <span className="insignia grande" style={{ background: n.color }}>{n.inicial}</span>
          <h1 className="titulo" style={{ fontSize: 26 }}>{t.titulo}</h1>
        </div>
        {fecha && (
          <div className="tarjeta" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CheckHecha id={t.id} fecha={fecha} hecha={t.hechas.includes(fecha)} color={n.color} />
            <div style={{ flex: 1 }}>
              <strong>{fechaLarga(fecha)}{fecha === hoyISO() ? " · hoy" : ""}</strong>
              <p className="muted" style={{ fontSize: 14 }}>{t.hechas.includes(fecha) ? "Hecha" : "Toca el círculo para marcarla como hecha"}</p>
            </div>
          </div>
        )}
        {repetitiva && <p className="muted">🔁 {describirRepeticion(t.repetir, t.fecha)}. Los cambios se aplican a toda la serie.</p>}
      </header>

      <FormTarea tarea={t} fecha={t.fecha} volver={volver} />
      <BorrarTarea id={t.id} fecha={fecha} repetitiva={repetitiva} volver={volver} />
    </>
  );
}
