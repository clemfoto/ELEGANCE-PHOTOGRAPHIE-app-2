"use client";

export default function ErrorApp({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bloque tarjeta">
      <h1 className="titulo">Algo falló</h1>
      <p className="muted">{error.message || "Error inesperado."}</p>
      <button className="btn btn-primario" onClick={reset}>Reintentar</button>
    </div>
  );
}
