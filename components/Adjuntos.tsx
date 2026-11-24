"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Adjunto = { id: string; url: string; filename: string; thumbnails?: { large?: { url: string } } };

/** Archivos de un campo de adjuntos, cada uno con una ✕ para borrarlo (pide confirmación). */
export default function Adjuntos({
  tabla,
  campo,
  registro,
  archivos,
}: {
  tabla: string;
  campo: string;
  registro: string;
  archivos: Adjunto[];
}) {
  const router = useRouter();
  const [borrando, setBorrando] = useState("");
  const [error, setError] = useState("");
  if (!archivos.length) return null;

  async function borrar(a: Adjunto) {
    if (!confirm(`¿Borrar «${a.filename}»? No se puede deshacer.`)) return;
    setBorrando(a.id);
    setError("");
    try {
      const res = await fetch("/api/adjuntos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabla, campo, registro, adjunto: a.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "No se pudo borrar.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBorrando("");
    }
  }

  return (
    <>
      <span className="adjuntos">
        {archivos.map((a) => (
          <span key={a.id} className={`adjunto-caja ${borrando === a.id ? "borrando" : ""}`}>
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="adjunto" title={a.filename}>
              {a.thumbnails?.large?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.thumbnails.large.url} alt={a.filename} loading="lazy" />
              ) : (
                <span className="adjunto-doc">{a.filename}</span>
              )}
            </a>
            <button
              type="button"
              className="adjunto-borrar"
              aria-label={`Borrar ${a.filename}`}
              title="Borrar"
              disabled={Boolean(borrando)}
              onClick={() => borrar(a)}
            >
              ✕
            </button>
          </span>
        ))}
      </span>
      {error && <p className="error">{error}</p>}
    </>
  );
}
