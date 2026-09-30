"use client";
import { useState } from "react";

export default function CopiarEnlace({ texto, etiqueta = "Copiar enlace" }: { texto: string; etiqueta?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secundario btn-bloque"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          prompt("Copia este enlace:", texto);
        }
      }}
    >
      {ok ? "Copiado ✓" : etiqueta}
    </button>
  );
}
