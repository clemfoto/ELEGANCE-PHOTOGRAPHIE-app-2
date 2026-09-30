import Link from "next/link";
import { getRegistros, type AirRecord } from "@/lib/airtable";
import { Avatar } from "@/components/Valor";
import { AUTOMATIZACIONES, EQUIPO, GALERIAS, TABLAS } from "@/config/galerias";

const ids = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

/**
 * Ficha de cliente (solo administrador): quién del team confirmó su presencia por Telegram,
 * a quién ya se le mandó la invitación y quién no la puede recibir por no tener Telegram conectado.
 */
export default async function PanelConfirmacion({ r }: { r: AirRecord }) {
  const g = GALERIAS[TABLAS.clientes];
  const C = AUTOMATIZACIONES.campos;
  const team = ids(r.fields[String(g.team)]);
  if (!team.length) return null;
  const confirmados = new Set(ids(r.fields[C.clienteConfirmados]));
  const invitados = new Set(ids(r.fields[C.clienteInvitados]));
  const personas = new Map((await getRegistros(EQUIPO.tabla)).map((p) => [p.id, p]));

  const filas = team.map((id) => {
    const p = personas.get(id);
    const nombre = String(p?.fields[EQUIPO.nombre] ?? "Sin nombre");
    const conTelegram = Boolean(String(p?.fields[C.telegramChatId] ?? "").trim());
    const estado = confirmados.has(id)
      ? { texto: "Confirmó", clase: "ok" }
      : invitados.has(id)
        ? { texto: "Invitado, sin respuesta", clase: "espera" }
        : conTelegram
          ? { texto: "Pendiente de invitar", clase: "espera" }
          : { texto: "Sin Telegram conectado", clase: "sin" };
    return { id, nombre, estado, conTelegram };
  });
  const total = filas.filter((f) => confirmados.has(f.id)).length;

  return (
    <section className="tarjeta bloque">
      <h2 className="seccion-titulo">
        Confirmación del team{" "}
        <span className="contador">
          {total}/{team.length}
        </span>
      </h2>
      <ul className="confirmacion">
        {filas.map((f) => (
          <li key={f.id}>
            <Avatar nombre={f.nombre} confirmado={f.estado.clase === "ok"} />
            <Link href={`/t/equipo/${f.id}`} className="confirmacion-nombre">
              {f.nombre}
            </Link>
            <span className={`confirmacion-estado ${f.estado.clase}`}>
              {f.estado.clase === "ok" ? "✅ " : ""}
              {f.estado.texto}
            </span>
          </li>
        ))}
      </ul>
      {filas.some((f) => !f.conTelegram && f.estado.clase !== "ok") && (
        <p className="nota-chica">
          Quien no tiene Telegram conectado puede confirmar con el botón del grupo si su @usuario está en su ficha de
          Equipo, o conectarlo desde su ficha → «Enviar enlace de Telegram».
        </p>
      )}
    </section>
  );
}
