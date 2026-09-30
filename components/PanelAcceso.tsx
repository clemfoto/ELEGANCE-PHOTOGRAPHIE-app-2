import { headers } from "next/headers";
import { getRegistros, type AirRecord } from "@/lib/airtable";
import { EQUIPO, MARCA } from "@/config/galerias";
import { Chip } from "@/components/Valor";
import BotonesAcceso from "@/components/BotonesAcceso";

/** Ficha de Equipo (solo administrador): código de invitación personal y cancelación del acceso. */
export default async function PanelAcceso({ r, esYo }: { r: AirRecord; esYo: boolean }) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const estado = String(r.fields[EQUIPO.estadoInvitacion] ?? "");
  const codigo = String(r.fields[EQUIPO.codigo] ?? "");
  const tieneClave = Boolean(r.fields[EQUIPO.clave]);
  const email = String(r.fields[EQUIPO.email] ?? "").trim();
  const nombre = String(r.fields[EQUIPO.nombre] ?? "").split(" ")[0];
  const mismoEmail = email
    ? (await getRegistros(EQUIPO.tabla)).filter(
        (x) => x.id !== r.id && String(x.fields[EQUIPO.email] ?? "").trim().toLowerCase() === email.toLowerCase(),
      )
    : [];
  const enlace = codigo ? `${proto}://${host}/registro?codigo=${encodeURIComponent(codigo)}` : "";
  const mensaje = codigo
    ? `Hola ${nombre}, este es tu acceso a la app de ${MARCA.nombre}.\n\n1. Abre ${enlace}\n2. Email: ${email}\n3. Código: ${codigo}\n4. Crea tu contraseña.\n\nDespués instálala en tu teléfono (Compartir → "Añadir a pantalla de inicio").`
    : "";

  let resumen: string;
  if (estado === EQUIPO.invitacion.cancelada) resumen = "Acceso cancelado. Puede volver a entrar solo si le das un código nuevo.";
  else if (r.fields[EQUIPO.activo] !== true) resumen = "Sin acceso: marca «Activo» para que pueda entrar.";
  else if (estado === EQUIPO.invitacion.pendiente && codigo) resumen = "Invitación enviada: aún no ha creado su contraseña.";
  else if (tieneClave) resumen = "Entra con su email y su contraseña.";
  else resumen = "Todavía no tiene contraseña. Genera su código de invitación y envíaselo.";

  return (
    <section className="tarjeta bloque">
      <div className="cabecera-fila">
        <h2 className="seccion-titulo">Rol y acceso a la app</h2>
        {estado && <Chip nombre={estado} />}
      </div>
      <p className="muted">{resumen}</p>
      {mismoEmail.length > 0 && (
        <p className="error">
          Ojo: {mismoEmail.map((x) => String(x.fields[EQUIPO.nombre] ?? "otra persona")).join(", ")} tiene el mismo email. Cada persona
          necesita su propio email para entrar: cámbialo con «Editar».
        </p>
      )}
      {codigo && (
        <div className="codigo-invitacion">
          <span className="campo-label">Código personal</span>
          <strong>{codigo}</strong>
        </div>
      )}
      <BotonesAcceso
        id={r.id}
        rol={String(r.fields[EQUIPO.rol] ?? "")}
        esYo={esYo}
        mensaje={mensaje}
        hayCodigo={Boolean(codigo)}
        cancelable={!esYo && estado !== EQUIPO.invitacion.cancelada && (Boolean(codigo) || tieneClave || estado !== "")}
        renovable={!(esYo && tieneClave)}
        sinEmail={!email}
      />
    </section>
  );
}
