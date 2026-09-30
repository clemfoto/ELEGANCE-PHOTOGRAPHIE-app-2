"use client";
import { useState } from "react";

/** Comparte un texto (WhatsApp, Telegram…) con el menú del teléfono, o lo copia si no hay menú. */
export default function CompartirTexto({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [aviso, setAviso] = useState("");
  return (
    <>
      <button
        type="button"
        className="btn btn-primario"
        onClick={async () => {
          try {
            if (navigator.share) await navigator.share({ text: texto });
            else {
              await navigator.clipboard.writeText(texto);
              setAviso("Mensaje copiado. Pégalo en WhatsApp.");
            }
          } catch {
            /* se cerró el menú de compartir */
          }
        }}
      >
        {etiqueta}
      </button>
      {aviso && <p className="campo-ayuda">{aviso}</p>}
    </>
  );
}
