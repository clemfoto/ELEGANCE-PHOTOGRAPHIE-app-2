"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarMensaje } from "@/app/(app)/t/pagos";

/** Editar el asunto y el mensaje que acompañan a los documentos que se mandan a los clientes. */
export default function FormMensaje({ asunto: a, mensaje: m }: { asunto: string; mensaje: string }) {
  const router = useRouter();
  const [asunto, setAsunto] = useState(a);
  const [mensaje, setMensaje] = useState(m);
  const [pendiente, empezar] = useTransition();
  const [resultado, setResultado] = useState<{ ok?: string; error?: string }>({});

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setResultado({});
    empezar(async () => {
      const r = await guardarMensaje(asunto, mensaje);
      setResultado(r.error ? { error: r.error } : { ok: "Guardado ✓" });
      router.refresh();
    });
  };

  return (
    <form className="form" onSubmit={guardar}>
      <label className="campo">
        <span className="campo-label">Asunto</span>
        <input className="input" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
      </label>
      <label className="campo">
        <span className="campo-label">Mensaje</span>
        <textarea className="input" rows={10} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
      </label>
      <button type="submit" className="btn btn-primario btn-bloque" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
      {resultado.error && <p className="error">{resultado.error}</p>}
      {resultado.ok && <p className="nota-chica">{resultado.ok}</p>}
    </form>
  );
}
