"use client";
import { useCallback, useState } from "react";
import VisorPdf from "@/components/VisorPdf";

export type DocLista = { id: string; titulo: string; nota: string };

/** Documentos del contrato: cada uno se abre dentro de la app y se cierra con la X. */
export default function DocumentosContrato({ cliente, docs }: { cliente: string; docs: DocLista[] }) {
  const [abierto, setAbierto] = useState<DocLista | null>(null);
  const cerrar = useCallback(() => setAbierto(null), []);
  return (
    <>
      <ul className="docs-contrato">
        {docs.map((d) => (
          <li key={d.id}>
            <button type="button" className="doc-abrir" onClick={() => setAbierto(d)}>
              📄 {d.titulo}
            </button>
            <span className="nota-chica">{d.nota}</span>
          </li>
        ))}
      </ul>
      {abierto && (
        <VisorPdf url={`/api/contratos/${cliente}?doc=${encodeURIComponent(abierto.id)}`} titulo={abierto.titulo} onCerrar={cerrar} />
      )}
    </>
  );
}
