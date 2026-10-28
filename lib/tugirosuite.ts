import "server-only";

/**
 * Contratos e invoices en TuGiroSuite (tugirosuite.com, cuenta de Elegance Photographie).
 * La app manda los datos del cliente y sus pagos; TuGiroSuite rellena el contrato (con o sin dron)
 * y el invoice del depósito como borradores, los manda al cliente y recoge la firma.
 *
 * Variables: TUGIROSUITE_API_KEY (tgs_…, se genera en TuGiroSuite) y TUGIROSUITE_URL.
 */

export type DocumentoTGS = {
  id: string;
  titulo: string;
  parte: string;
  estado: string;
  solo_lectura: boolean;
  firmado_cliente: string | null;
};
export type PagoTGS = {
  base: number;
  iva: number;
  /** Porcentaje adicional (3 = 3 %), 0 si no se usa, y su monto. */
  extra_pct: number;
  extra: number;
  total: number;
};
export type ContratoTGS = { contratoNo: string; estado: string; documentos: DocumentoTGS[] };

export type DatosContrato = {
  cliente: { nombre: string; email: string; tel?: string };
  fecha_evento: string;
  venue?: string;
  servicios: { nombre: string; precio: number | null; descripcion?: string }[];
  /** Resumen del servicio: va en el contrato debajo de los servicios. */
  resumen?: { opciones: string[]; texto?: string };
  /** Total a cobrar: paquetes + IVA y % adicional de cada pago. */
  total: number;
  /** Costo de los paquetes, sin impuestos. */
  subtotal: number;
  /** Depósito sin impuestos. */
  deposito: number;
  /** true si el depósito o el balance llevan IVA (detalle en `pagos`). */
  iva: boolean;
  /**
   * Detalle de cada pago: el IVA (16 %) y el porcentaje adicional se eligen por separado para el
   * depósito y el balance y se calculan sobre cada uno. El invoice del depósito cobra `deposito.total`.
   */
  pagos: { deposito: PagoTGS; balance: PagoTGS };
  dron: boolean;
  /** false: tras la firma del cliente, Elegance revisa y firma desde la app ("Firmar y enviar"). */
  autofirma?: boolean;
  avisoUrl?: string;
};

export const ESTADOS_CONTRATO: Record<string, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  firmado_en_parte: "Firmado en parte",
  falta_tu_firma: "Falta tu firma",
  completo: "Firmado",
};

export const tugirosuiteListo = () => Boolean(process.env.TUGIROSUITE_API_KEY);

async function api(ruta: string, init: RequestInit = {}): Promise<Response> {
  const clave = process.env.TUGIROSUITE_API_KEY;
  if (!clave) throw new Error("Falta TUGIROSUITE_API_KEY en las variables de entorno.");
  const base = (process.env.TUGIROSUITE_URL || "https://tugirosuite.com").replace(/\/$/, "");
  const r = await fetch(`${base}/api/v1/contracts${ruta}`, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => null)) as { error?: string } | null;
    throw new Error(e?.error ?? `TuGiroSuite respondió ${r.status}.`);
  }
  return r;
}

const no = (n: string) => `/${encodeURIComponent(n)}`;

export async function crearContrato(d: DatosContrato): Promise<string> {
  const r = (await (await api("", { method: "POST", body: JSON.stringify(d) })).json()) as { contratoNo: string };
  return r.contratoNo;
}

export async function leerContrato(n: string): Promise<ContratoTGS> {
  return (await api(no(n))).json();
}

/**
 * Manda al cliente los documentos elegidos (`documentos`: IDs de ContratoTGS.documentos) con el
 * asunto y el mensaje del machote: p. ej. solo el invoice, o el contrato para firmar y el invoice.
 */
export async function enviarContrato(n: string, d: { subject: string; message: string; documentos: string[] }): Promise<void> {
  await api(`${no(n)}/send`, { method: "POST", body: JSON.stringify(d) });
}

/** Pone la firma de Elegance y manda la versión final firmada al cliente y a Elegance. */
export async function firmarContrato(n: string): Promise<void> {
  await api(`${no(n)}/countersign`, { method: "POST" });
}

export async function descartarContrato(n: string): Promise<void> {
  await api(no(n), { method: "DELETE" });
}

/** PDF de un documento tal como está ahora (con las firmas que ya tenga). */
export async function pdfContrato(n: string, doc: string): Promise<Response> {
  return api(`${no(n)}/pdf?doc=${encodeURIComponent(doc)}`);
}
