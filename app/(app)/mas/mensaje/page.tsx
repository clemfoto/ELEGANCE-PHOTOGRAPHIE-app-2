import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { leerMachote, VARIABLES } from "@/lib/envios";
import { fecha } from "@/lib/formato";
import FormMensaje from "@/components/FormMensaje";

export const metadata = { title: "Mensaje para clientes" };

/** Mensaje (machote) que acompaña a los documentos e invoices: el mismo para todos los clientes. */
export default async function Mensaje() {
  await requireAdmin();
  const m = await leerMachote();
  return (
    <>
      <header className="cabecera cabecera-ficha">
        <Link href="/mas" className="volver">‹ Más</Link>
        <h1 className="titulo">Mensaje para clientes</h1>
      </header>
      <section className="tarjeta bloque">
        <p className="nota-chica">
          Va en el correo de cada envío de documentos (contrato, invoice…). Se escribe una vez y se manda igual a todos; al
          enviar se cambian las variables por los datos de cada cliente.
        </p>
        <FormMensaje asunto={m.asunto} mensaje={m.mensaje} />
        <dl className="variables">
          {VARIABLES.map((v) => (
            <div key={v.clave}>
              <dt><code>{v.clave}</code></dt>
              <dd>{v.ayuda}</dd>
            </div>
          ))}
        </dl>
        {m.actualizadoEn && (
          <p className="nota-chica">
            Última edición: {fecha(m.actualizadoEn.slice(0, 10))}{m.actualizadoPor ? ` por ${m.actualizadoPor}` : ""}
          </p>
        )}
      </section>
    </>
  );
}
