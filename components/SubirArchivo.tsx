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

/** Fotos y documentos que se pueden subir: imágenes (también HEIC del iPhone), PDF, Word, Excel, PowerPoint, texto y zip. */
const TIPOS = [
  "image/*",
  ".heic,.heif,.jpg,.jpeg,.png,.webp,.gif",
  ".pdf,application/pdf",
  ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt,.rtf,.odt,.ods,.pages,.numbers,.key,.zip",
].join(",");

/** Límite por archivo (el servidor también lo comprueba). */
const MAX_MB = 5;

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

  /** Sube los archivos uno por uno; sin registro (p. ej. «Foto del ticket») solo el primero, que crea el registro. */
  async function subir(lista: File[]) {
    setEstado("subiendo");
    const errores: string[] = [];
    let url = "";
    for (const original of registro ? lista : lista.slice(0, 1)) {
      try {
        const archivo = await comprimir(original);
        if (archivo.size > MAX_MB * 1024 * 1024) throw new Error(`pasa de ${MAX_MB} MB`);
        const datos = new FormData();
        datos.set("tabla", tabla);
        datos.set("campo", campo);
        if (registro) datos.set("registro", registro);
        datos.set("archivo", archivo);
        const res = await fetch("/api/adjuntos", { method: "POST", body: datos });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "no se pudo subir");
        url = json.url;
      } catch (e) {
        errores.push(`«${original.name}»: ${(e as Error).message}`);
      }
    }
    if (input.current) input.current.value = "";
    setEstado(errores.join(" · "));
    if (registro) router.refresh();
    else if (url) router.push(`${url}/editar`);
  }

  const subiendo = estado === "subiendo";
  return (
    <div className="subir">
      <input
        ref={input}
        type="file"
        accept={camara ? "image/*,.heic,.heif,.pdf,application/pdf" : TIPOS}
        capture={camara ? "environment" : undefined}
        multiple={Boolean(registro)}
        hidden
        onChange={(e) => e.target.files?.length && subir([...e.target.files])}
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
