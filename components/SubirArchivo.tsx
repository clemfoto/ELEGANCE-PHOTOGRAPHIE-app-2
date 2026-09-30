"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Reduce una foto a ≤1600 px en JPEG para subirla rápido y por debajo de los límites. */
async function comprimir(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/gif") return archivo;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= archivo.size) return archivo;
    const nombre = archivo.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${nombre}.jpg`, { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}

export default function SubirArchivo({
  tabla,
  campo,
  registro,
  etiqueta,
  destacado,
  camara,
}: {
  tabla: string;
  campo: string;
  /** Sin registro, se crea uno nuevo y se abre su formulario. */
  registro?: string;
  etiqueta: string;
  destacado?: boolean;
  camara?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [estado, setEstado] = useState<"" | "subiendo" | string>("");

  async function subir(archivo: File) {
    setEstado("subiendo");
    const datos = new FormData();
    datos.set("tabla", tabla);
    datos.set("campo", campo);
    if (registro) datos.set("registro", registro);
    datos.set("archivo", await comprimir(archivo));
    try {
      const res = await fetch("/api/adjuntos", { method: "POST", body: datos });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al subir");
      setEstado("");
      if (registro) router.refresh();
      else router.push(`${json.url}/editar`);
    } catch (e) {
      setEstado((e as Error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const subiendo = estado === "subiendo";
  return (
    <div className="subir">
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        capture={camara ? "environment" : undefined}
        hidden
        onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])}
      />
      <button
        type="button"
        className={`btn btn-bloque ${destacado ? "btn-primario btn-grande" : "btn-secundario"}`}
        disabled={subiendo}
        onClick={() => input.current?.click()}
      >
        {destacado && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
        {subiendo ? "Subiendo…" : etiqueta}
      </button>
      {estado && !subiendo && <p className="error">{estado}</p>}
    </div>
  );
}
