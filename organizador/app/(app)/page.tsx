import Link from "next/link";
import { NEGOCIOS } from "@/config/negocios";
import { agenda, pendientesPrimero } from "@/lib/agenda";
import { fechaLarga, sumarDias } from "@/lib/fechas";
import FilaTarea from "@/components/FilaTarea";
import BotonMover from "@/components/BotonMover";
import { Icono } from "@/components/Iconos";

export default async function Hoy() {
  const { hoy, proximas, atrasadas } = await agenda(7);
  const manana = sumarDias(hoy, 1);
  const deHoy = pendientesPrimero(proximas.filter((o) => o.fecha === hoy));
  const deManana = proximas.filter((o) => o.fecha === manana);
  const despues = proximas.filter((o) => o.fecha > manana && !o.hecha);
  const pendientesHoy = deHoy.filter((o) => !o.hecha).length;

  return (
    <>
      <header className="cabecera">
        <div className="cabecera-fila">
          <div style={{ flex: 1 }}>
            <p className="subtitulo">{fechaLarga(hoy)}</p>
            <h1 className="titulo">Hoy</h1>
          </div>
          <Link href="/ajustes" className="icono-btn" aria-label="Ajustes"><Icono id="ajustes" /></Link>
          <Link href="/tarea/nueva" className="btn btn-primario btn-nuevo-escritorio">Nueva tarea</Link>
        </div>
        <p className="muted">
          {pendientesHoy ? `${pendientesHoy} ${pendientesHoy === 1 ? "tarea pendiente" : "tareas pendientes"} hoy` : deHoy.length ? "Todo hecho por hoy 🎉" : "Nada programado para hoy"}
          {atrasadas.length ? ` · ${atrasadas.length} atrasada${atrasadas.length === 1 ? "" : "s"}` : ""}
        </p>
      </header>

      <div className="negocios">
        {NEGOCIOS.map((n) => {
          const pend = deHoy.filter((o) => !o.hecha && o.tarea.negocio === n.id).length;
          const atr = atrasadas.filter((o) => o.tarea.negocio === n.id).length;
          return (
            <Link key={n.id} href={`/n/${n.id}`} className="negocio-tarjeta" style={{ borderTop: `4px solid ${n.color}` }}>
              <strong>{n.corto}</strong>
              <span className="cifra">{pend}</span>
              <small>{atr ? <span className="atrasada">{atr} atrasada{atr === 1 ? "" : "s"}</span> : "hoy"}</small>
            </Link>
          );
        })}
      </div>

      {atrasadas.length > 0 && (
        <section className="seccion">
          <h2 className="seccion-titulo alerta">Atrasadas <span className="contador">{atrasadas.length}</span></h2>
          <div className="filas">
            {atrasadas.map((o) => (
              <div key={o.tarea.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <FilaTarea o={o} hoy={hoy} />
                <div className="acciones" style={{ justifyContent: "flex-end" }}>
                  <BotonMover id={o.tarea.id} fecha={hoy} texto="Pasar a hoy" />
                  <BotonMover id={o.tarea.id} fecha={manana} texto="A mañana" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="seccion">
        <h2 className="seccion-titulo">Hoy <span className="contador">{deHoy.length}</span></h2>
        {deHoy.length ? (
          <div className="filas">{deHoy.map((o) => <FilaTarea key={`${o.tarea.id}-${o.fecha}`} o={o} hoy={hoy} />)}</div>
        ) : (
          <p className="vacio-lista tarjeta">Sin tareas. Toca + para añadir una.</p>
        )}
      </section>

      {deManana.length > 0 && (
        <section className="seccion">
          <h2 className="seccion-titulo">Mañana <span className="contador">{deManana.length}</span></h2>
          <div className="filas">{deManana.map((o) => <FilaTarea key={`${o.tarea.id}-${o.fecha}`} o={o} hoy={hoy} />)}</div>
        </section>
      )}

      {despues.length > 0 && (
        <details className="seccion">
          <summary className="seccion-titulo">Próximos días <span className="contador">{despues.length}</span></summary>
          <div className="filas">
            {despues.map((o) => <FilaTarea key={`${o.tarea.id}-${o.fecha}`} o={o} hoy={hoy} conFecha />)}
          </div>
        </details>
      )}

      <p className="muted" style={{ textAlign: "center" }}>
        <Link href={`/calendario?vista=semana&fecha=${hoy}`} className="volver" style={{ alignSelf: "center" }}>Ver la semana en el calendario ›</Link>
      </p>

      <Link href="/tarea/nueva" className="fab" aria-label="Nueva tarea"><Icono id="mas" tam={28} /></Link>
    </>
  );
}
