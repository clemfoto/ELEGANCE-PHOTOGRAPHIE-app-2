import type { NextRequest } from "next/server";
import { getRegistros } from "@/lib/airtable";
import { aUsuario, tieneAcceso } from "@/lib/auth";
import { aIcs, eventosCalendario } from "@/lib/calendario";
import { comprobarFirmaCorta } from "@/lib/token";
import { EQUIPO, MARCA } from "@/config/galerias";

/**
 * Calendario para suscribirse desde el iPhone, la Mac o Google Calendar.
 * La URL lleva una firma personal; deja de funcionar si la persona pierde el acceso.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const [id, firma] = (await params).token.replace(/\.ics$/i, "").split(".");
  if (!id || !firma || !comprobarFirmaCorta("calendario", id, firma)) return new Response("No encontrado", { status: 404 });
  const fila = (await getRegistros(EQUIPO.tabla)).find((r) => r.id === id);
  if (!fila || !tieneAcceso(fila)) return new Response("Acceso cancelado", { status: 403 });

  const u = aUsuario(fila);
  const base = `${req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}`;
  const ics = aIcs(await eventosCalendario(u), base, MARCA.nombre);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="calendario.ics"',
      "Cache-Control": "private, max-age=900",
    },
  });
}
