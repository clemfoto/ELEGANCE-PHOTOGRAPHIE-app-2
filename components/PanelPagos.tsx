import { leerPagos } from "@/lib/pagos";
import { leerEnvios, leerMachote, rellenar } from "@/lib/envios";
import { ESTADOS_CONTRATO, leerContrato, tugirosuiteListo, type ContratoTGS } from "@/lib/tugirosuite";
import { fecha } from "@/lib/formato";
import FormPagos from "@/components/FormPagos";
import AccionesContrato from "@/components/AccionesContrato";
import DocumentosContrato from "@/components/DocumentosContrato";
import EnviarDocumentos from "@/components/EnviarDocumentos";
import HistorialEnvios from "@/components/HistorialEnvios";

/**
 * Ficha de cliente (solo administrador): precio de cada paquete, depósito y balance con sus
 * impuestos, el contrato e invoice de TuGiroSuite (preparar, revisar, elegir qué enviar) y el
 * historial de documentos enviados.
 */
export default async function PanelPagos({ id }: { id: string }) {
  const [p, envios, machote] = await Promise.all([leerPagos(id), leerEnvios(id), leerMachote()]);
  if (!p) return null;

  let contrato: ContratoTGS | null = null;
  let errorContrato = "";
  if (p.contrato) {
    try {
      contrato = await leerContrato(p.contrato);
    } catch (e) {
      errorContrato = (e as Error).message;
    }
  }
  const estado = contrato?.estado ?? "";

  return (
    <>
      <section className="tarjeta bloque">
        <h2 className="seccion-titulo">Costo y pagos</h2>
        <FormPagos p={p} bloqueado={Boolean(p.contrato && estado !== "borrador")} />
      </section>

      <section className="tarjeta bloque">
        <h2 className="seccion-titulo">
          Contrato e invoice
          {contrato && <span className={`chip-contrato ${estado}`}>{ESTADOS_CONTRATO[estado] ?? estado}</span>}
        </h2>
        {!tugirosuiteListo() ? (
          <p className="nota-chica">Falta configurar TUGIROSUITE_API_KEY en Netlify.</p>
        ) : !p.contrato ? (
          <>
            <p className="nota-chica">
              TuGiroSuite rellena el contrato y el invoice del depósito con los paquetes y pagos de arriba. Los revisas aquí
              y eliges qué mandar al cliente. El invoice solo se manda cuando ya se recibió el depósito.
            </p>
            <AccionesContrato id={id} modo="preparar" />
          </>
        ) : (
          <>
            {errorContrato && <p className="error">No se pudo leer el contrato {p.contrato}: {errorContrato}</p>}
            <p className="nota-chica">Contrato {p.contrato}</p>
            {contrato && (
              <DocumentosContrato
                cliente={id}
                docs={contrato.documentos.map((d) => ({
                  id: d.id,
                  titulo: d.titulo,
                  nota: d.solo_lectura
                    ? d.estado === "borrador" ? "se manda adjunto" : "enviado"
                    : d.firmado_cliente ? `firmado por el cliente el ${fecha(d.firmado_cliente.slice(0, 10))}` : ESTADOS_CONTRATO[d.estado] ?? d.estado,
                }))}
              />
            )}
            {estado === "borrador" && (
              <p className="nota-chica">
                El cliente recibe por email los documentos que marques abajo, con el mensaje para clientes. Si va el invoice del depósito, el
                depósito queda marcado como pagado{p.depositoPagadoEn ? "" : " con fecha de hoy"}.
              </p>
            )}
            {estado === "falta_tu_firma" && (
              <p className="nota-chica">
                El cliente ya firmó. Revisa los documentos y toca «Firmar y enviar»: se pone tu firma y la versión final firmada
                llega al cliente y a Elegance por email.
              </p>
            )}
            {estado === "completo" && (
              <p className="nota-chica">Firmado por el cliente y por Elegance. La versión final ya se mandó al cliente y a Elegance.</p>
            )}
            <AccionesContrato
              id={id}
              modo={
                estado === "borrador" || errorContrato ? "revisar"
                : estado === "falta_tu_firma" ? "firmar"
                : estado === "completo" ? "reenviar"
                : "enviado"
              }
            />
            {contrato && contrato.documentos.length > 0 && (
              <EnviarDocumentos
                id={id}
                docs={contrato.documentos.map((d) => ({ id: d.id, titulo: d.titulo, invoice: d.solo_lectura && d.parte === "Invoice" }))}
                inicial={estado === "borrador" ? contrato.documentos.map((d) => d.id) : []}
                asunto={rellenar(machote.asunto, p, ["{documentos}"])}
                mensaje={rellenar(machote.mensaje, p, ["{documentos}"])}
                email={p.email}
              />
            )}
          </>
        )}
      </section>

      <section className="tarjeta bloque">
        <h2 className="seccion-titulo">Documentos enviados</h2>
        <HistorialEnvios envios={envios} />
      </section>
    </>
  );
}
