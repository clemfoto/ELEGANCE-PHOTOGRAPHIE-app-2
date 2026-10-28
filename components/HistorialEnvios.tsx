import Link from "next/link";
import type { Envio } from "@/lib/envios";
import { ZONA_HORARIA } from "@/config/galerias";

/** "28 oct 2026, 13:50" en la hora del negocio. */
const cuando = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: ZONA_HORARIA });

/** Historial de documentos enviados: qué, a quién, cuándo, quién lo mandó y con qué mensaje. */
export default function HistorialEnvios({ envios, conCliente = false }: { envios: Envio[]; conCliente?: boolean }) {
  if (!envios.length) return <p className="nota-chica">Todavía no se ha enviado ningún documento.</p>;
  return (
    <ul className="historial">
      {envios.map((e) => (
        <li key={e.id}>
          <details>
            <summary>
              <span className="historial-fecha">{cuando(e.enviadoEn)}</span>
              {conCliente && <strong className="historial-cliente">{e.cliente || "Cliente"}</strong>}
              <span className="historial-docs">
                {e.tipo === "firmar" ? "✍️ " : "📨 "}
                {e.documentos.map((d) => d.titulo).join(", ") || "Documentos"}
              </span>
            </summary>
            <p className="nota-chica">
              {e.tipo === "firmar" ? "Versión final firmada" : "Enviado"} a {e.destinatario || "—"}
              {e.enviadoPor ? ` por ${e.enviadoPor}` : ""}
              {e.contratoNo ? ` · contrato ${e.contratoNo}` : ""}
            </p>
            {e.asunto && (
              <p className="nota-chica">
                <strong>Asunto:</strong> {e.asunto}
              </p>
            )}
            {e.mensaje && <p className="multilinea historial-mensaje">{e.mensaje}</p>}
            {conCliente && (
              <Link href={`/t/clientes/${e.clienteId}`} className="nota-chica">
                Abrir cliente ›
              </Link>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}
