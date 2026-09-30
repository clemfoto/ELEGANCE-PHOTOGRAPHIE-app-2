"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="tarjeta bloque">
      <h1 className="tarjeta-titulo">Algo ha fallado</h1>
      <p className="muted">
        No se pudo hablar con Airtable. Revisa la conexión y vuelve a intentarlo.
        {error.digest && <><br /><small>Código: {error.digest}</small></>}
      </p>
      <button className="btn btn-primario" onClick={reset}>Reintentar</button>
    </div>
  );
}
