import "server-only";
import { sql } from "@/lib/datos";
import { dinero } from "@/lib/formato";
import type { Pagos } from "@/lib/pagos";

/**
 * Mensaje (machote) que acompaña a los documentos que se mandan a los clientes, y el historial
 * de lo que se envió. El mensaje es el mismo para todos (tabla app_ajustes) y se edita en
 * Más → Mensaje para clientes; al enviar se rellenan las variables de cada cliente.
 */

export type Machote = { asunto: string; mensaje: string; actualizadoEn: string | null; actualizadoPor: string | null };

export const VARIABLES: { clave: string; ayuda: string }[] = [
  { clave: "{nombre}", ayuda: "nombre del cliente" },
  { clave: "{fecha}", ayuda: "fecha del evento" },
  { clave: "{documentos}", ayuda: "documentos que se envían" },
  { clave: "{deposito}", ayuda: "depósito a cobrar (con impuestos)" },
  { clave: "{balance}", ayuda: "balance a cobrar (con impuestos)" },
  { clave: "{total}", ayuda: "total a cobrar" },
];

const POR_DEFECTO: Machote = {
  asunto: "Elegance Photographie — {documentos}",
  mensaje: "Hi {nombre},\n\nThank you for choosing Elegance Photographie! Please find your documents below.\n\nWe can't wait to be part of your day.",
  actualizadoEn: null,
  actualizadoPor: null,
};

export async function leerMachote(): Promise<Machote> {
  const filas = await sql<{ clave: string; valor: string; actualizado_en: string; actualizado_por: string | null }>(
    "select clave, valor, to_json(actualizado_en) #>> '{}' as actualizado_en, actualizado_por from public.app_ajustes where clave in ('correo_asunto', 'correo_mensaje')",
  );
  const a = filas.find((f) => f.clave === "correo_asunto");
  const m = filas.find((f) => f.clave === "correo_mensaje");
  return {
    asunto: a?.valor ?? POR_DEFECTO.asunto,
    mensaje: m?.valor ?? POR_DEFECTO.mensaje,
    actualizadoEn: m?.actualizado_en ?? null,
    actualizadoPor: m?.actualizado_por ?? null,
  };
}

export async function guardarMachote(asunto: string, mensaje: string, por: string): Promise<void> {
  asunto = asunto.trim().slice(0, 200);
  mensaje = mensaje.trim().slice(0, 5000);
  if (!asunto || !mensaje) throw new Error("Escribe el asunto y el mensaje.");
  await sql(
    `insert into public.app_ajustes (clave, valor, actualizado_por) values ('correo_asunto', $1, $3), ('correo_mensaje', $2, $3)
     on conflict (clave) do update set valor = excluded.valor, actualizado_en = now(), actualizado_por = excluded.actualizado_por`,
    [asunto, mensaje, por],
  );
}

/** Sustituye las variables del machote con los datos del cliente. */
export function rellenar(texto: string, p: Pagos, documentos: string[]): string {
  const valores: Record<string, string> = {
    "{nombre}": p.nombre.trim(),
    // Los clientes leen el correo en inglés: "June 14, 2027".
    "{fecha}": p.fecha
      ? new Date(`${p.fecha.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
      : "",
    "{documentos}": documentos.join(", "),
    "{deposito}": `${dinero(p.pagoDeposito.total, 2)} USD`,
    "{balance}": `${dinero(p.pagoBalance.total, 2)} USD`,
    "{total}": `${dinero(p.total, 2)} USD`,
  };
  return texto.replace(/\{(nombre|fecha|documentos|deposito|balance|total)\}/g, (v) => valores[v] ?? v);
}

/* ---------- historial ---------- */

export type Envio = {
  id: number;
  clienteId: string;
  cliente: string | null;
  enviadoEn: string;
  enviadoPor: string | null;
  destinatario: string | null;
  contratoNo: string | null;
  documentos: { id: string; titulo: string }[];
  asunto: string | null;
  mensaje: string | null;
  tipo: "enviar" | "firmar";
};

export async function registrarEnvio(e: Omit<Envio, "id" | "enviadoEn" | "cliente">): Promise<void> {
  await sql(
    `insert into public.documentos_enviados (cliente_id, enviado_por, destinatario, contrato_no, documentos, asunto, mensaje, tipo)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [e.clienteId, e.enviadoPor, e.destinatario, e.contratoNo, JSON.stringify(e.documentos), e.asunto, e.mensaje, e.tipo],
  );
}

/** Envíos de un cliente, o de todos (los más recientes primero). */
export async function leerEnvios(clienteId?: string, limite = 200): Promise<Envio[]> {
  return sql<Envio>(
    `select e.id, e.cliente_id as "clienteId", c.nombre as cliente, to_json(e.enviado_en) #>> '{}' as "enviadoEn", e.enviado_por as "enviadoPor",
            e.destinatario, e.contrato_no as "contratoNo", e.documentos, e.asunto, e.mensaje, e.tipo
       from public.documentos_enviados e join public.clientes c on c.id = e.cliente_id
      where $1::text is null or e.cliente_id = $1
      order by e.enviado_en desc
      limit $2`,
    [clienteId ?? null, limite],
  );
}
