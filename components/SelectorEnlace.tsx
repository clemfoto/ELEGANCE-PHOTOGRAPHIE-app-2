"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Opcion = { id: string; nombre: string };

const quitarAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Selector para campos de enlace: busca en la tabla enlazada y guarda los IDs en inputs ocultos. */
export default function SelectorEnlace({
  nombre,
  tabla,
  unico,
  inicial,
  titulo,
}: {
  nombre: string;
  tabla: string;
  unico?: boolean;
  inicial: Opcion[];
  titulo: string;
}) {
  const [seleccion, setSeleccion] = useState<Opcion[]>(inicial);
  const [abierto, setAbierto] = useState(false);
  const [opciones, setOpciones] = useState<Opcion[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (abierto) dialogo.current?.showModal();
    else dialogo.current?.close();
    if (abierto && !opciones) {
      fetch(`/api/opciones?tabla=${tabla}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("No se pudo cargar la lista"))))
        .then(setOpciones)
        .catch((e) => setError(e.message));
    }
  }, [abierto, opciones, tabla]);

  const filtradas = useMemo(() => {
    const t = quitarAcentos(q.trim());
    return (opciones ?? []).filter((o) => !t || quitarAcentos(o.nombre).includes(t)).slice(0, 100);
  }, [opciones, q]);

  const elegido = (id: string) => seleccion.some((s) => s.id === id);
  function alternar(o: Opcion) {
    if (elegido(o.id)) setSeleccion(seleccion.filter((s) => s.id !== o.id));
    else if (unico) {
      setSeleccion([o]);
      setAbierto(false);
    } else setSeleccion([...seleccion, o]);
  }

  return (
    <div className="selector">
      {seleccion.map((s) => (
        <input key={s.id} type="hidden" name={nombre} value={s.id} />
      ))}
      <div className="selector-chips">
        {seleccion.map((s) => (
          <span key={s.id} className="enlace-chip">
            {s.nombre}
            <button type="button" className="quitar" aria-label={`Quitar ${s.nombre}`} onClick={() => alternar(s)}>
              ×
            </button>
          </span>
        ))}
        <button type="button" className="btn btn-secundario btn-chico" onClick={() => setAbierto(true)}>
          {seleccion.length && unico ? "Cambiar" : "+ Añadir"}
        </button>
      </div>

      <dialog ref={dialogo} className="hoja" onClose={() => setAbierto(false)}>
        <div className="hoja-cabecera">
          <strong>{titulo}</strong>
          <button type="button" className="btn btn-secundario btn-chico" onClick={() => setAbierto(false)}>
            Listo
          </button>
        </div>
        <input className="input" type="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="hoja-lista">
          {error && <li className="error">{error}</li>}
          {!opciones && !error && <li className="muted">Cargando…</li>}
          {filtradas.map((o) => (
            <li key={o.id}>
              <button type="button" className={`hoja-opcion ${elegido(o.id) ? "elegida" : ""}`} onClick={() => alternar(o)}>
                <span>{o.nombre}</span>
                {elegido(o.id) && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
          {opciones && !filtradas.length && <li className="muted">Sin resultados.</li>}
        </ul>
      </dialog>
    </div>
  );
}
