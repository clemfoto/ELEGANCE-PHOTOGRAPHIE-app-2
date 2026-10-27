"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Abre un PDF dentro de la app, a pantalla completa, con una X para cerrarlo y volver a la ficha.
 * Las páginas se dibujan con pdf.js: así se ven todas también en el iPhone instalado como app,
 * donde un enlace normal abre el PDF sin forma de regresar.
 */
export default function VisorPdf({ url, titulo, onCerrar }: { url: string; titulo: string; onCerrar: () => void }) {
  const hojas = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");

  useEffect(() => {
    let cancelado = false;
    const contenedor = hojas.current!;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const doc = await pdfjs.getDocument({ url }).promise;
        const ancho = contenedor.clientWidth;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages && !cancelado; n++) {
          const pagina = await doc.getPage(n);
          const base = pagina.getViewport({ scale: 1 });
          const vista = pagina.getViewport({ scale: (ancho / base.width) * ratio });
          const lienzo = document.createElement("canvas");
          lienzo.width = vista.width;
          lienzo.height = vista.height;
          lienzo.className = "visor-pagina";
          contenedor.appendChild(lienzo);
          await pagina.render({ canvas: lienzo, viewport: vista }).promise;
          if (n === 1 && !cancelado) setEstado("listo");
        }
      } catch (e) {
        console.error("[visor]", e);
        if (!cancelado) setEstado("error");
      }
    })();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      cancelado = true;
      contenedor.replaceChildren();
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
  }, [url, onCerrar]);

  return (
    <div className="visor" role="dialog" aria-modal="true" aria-label={titulo}>
      <header className="visor-barra">
        <span className="visor-titulo">{titulo}</span>
        <a className="visor-descargar" href={url} download>
          Descargar
        </a>
        <button type="button" className="visor-cerrar" aria-label="Cerrar" onClick={onCerrar}>
          ✕
        </button>
      </header>
      <div className="visor-cuerpo">
        {estado === "cargando" && <p className="visor-aviso">Cargando…</p>}
        {estado === "error" && (
          <p className="visor-aviso">
            No se pudo mostrar el documento. <a href={url} download>Descargarlo</a>
          </p>
        )}
        <div ref={hojas} className="visor-hojas" />
      </div>
    </div>
  );
}
