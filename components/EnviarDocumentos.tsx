"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { enviarContrato } from "@/app/(app)/t/pagos";

/** `invoice`: es el invoice del depósito (al mandarlo, el depósito queda pagado). */
export type DocEnvio = { id: string; titulo: string; invoice: boolean };

/**
 * Elegir qué documentos se mandan al cliente (p. ej. solo el invoice) y ver el mensaje machote
 * con sus datos antes de enviarlo. `asunto` y `mensaje` ya vienen rellenados salvo {documentos}.
 */
export default function EnviarDocumentos({
  id,
  docs,
  inicial,
  asunto,
  mensaje,
  email,
}: {
  id: string;
  docs: DocEnvio[];
  inicial: string[];
  asunto: string;
  mensaje: string;
  email: string | null;
}) {
  const router = useRouter();
  const [elegidos, setElegidos] = useState<string[]>(inicial);
  const [pendiente, empezar] = useTransition();
  const [resultado, setResultado] = useState<{ ok?: string; error?: string }>({});

  const titulos = docs.filter((d) => elegidos.includes(d.id)).map((d) => d.titulo);
  const conDocs = (t: string) => t.replaceAll("{documentos}", titulos.join(", ") || "…");
  const alternar = (d: string) => setElegidos(elegidos.includes(d) ? elegidos.filter((x) => x !== d) : [...elegidos, d]);

  const enviar = () => {
    const lista = titulos.join(", ");
    const pagaDeposito = docs.some((d) => d.invoice && elegidos.includes(d.id));
    if (!confirm(`¿Mandar a ${email} ${titulos.length === 1 ? "este documento" : "estos documentos"}: ${lista}?${pagaDeposito ? "\n\nVa el invoice del depósito: el depósito quedará marcado como pagado." : ""}`)) return;
    setResultado({});
    empezar(async () => {
      const r = await enviarContrato(id, elegidos);
      setResultado(r.error ? { error: r.error } : { ok: `Enviado a ${email} ✓` });
      if (!r.error) setElegidos([]);
      router.refresh();
    });
  };

  return (
    <div className="form enviar-docs">
      <fieldset className="campo">
        <legend className="campo-label">Documentos a enviar</legend>
        {docs.map((d) => (
          <label key={d.id} className="resumen-opcion">
            <input type="checkbox" checked={elegidos.includes(d.id)} onChange={() => alternar(d.id)} />
            <span>{d.titulo}</span>
          </label>
        ))}
        <span className="campo-ayuda">Marca solo los que quieras mandar, p. ej. solo el invoice.</span>
      </fieldset>

      <details className="mensaje-previo">
        <summary>Mensaje que recibe el cliente</summary>
        <p className="nota-chica">
          <strong>Para:</strong> {email || "falta el email"}
          <br />
          <strong>Asunto:</strong> {conDocs(asunto)}
        </p>
        <p className="multilinea">{conDocs(mensaje)}</p>
        <Link href="/mas/mensaje" className="nota-chica">Editar el mensaje (es el mismo para todos los clientes)</Link>
      </details>

      <button type="button" className="btn btn-primario btn-bloque" disabled={pendiente || !elegidos.length || !email} onClick={enviar}>
        {pendiente ? "Enviando…" : elegidos.length ? `Enviar ${elegidos.length === 1 ? "1 documento" : `${elegidos.length} documentos`}` : "Elige qué enviar"}
      </button>
      {resultado.error && <p className="error">{resultado.error}</p>}
      {resultado.ok && <p className="nota-chica">{resultado.ok}</p>}
    </div>
  );
}
