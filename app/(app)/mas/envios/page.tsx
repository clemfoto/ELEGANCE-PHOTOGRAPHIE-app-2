import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { leerEnvios } from "@/lib/envios";
import HistorialEnvios from "@/components/HistorialEnvios";

export const metadata = { title: "Documentos enviados" };

/** Historial de todos los documentos enviados a clientes (los más recientes primero). */
export default async function Envios() {
  await requireAdmin();
  const envios = await leerEnvios(undefined, 500);
  return (
    <>
      <header className="cabecera cabecera-ficha">
        <Link href="/mas" className="volver">‹ Más</Link>
        <h1 className="titulo">Documentos enviados</h1>
      </header>
      <section className="tarjeta bloque">
        <HistorialEnvios envios={envios} conCliente />
      </section>
    </>
  );
}
