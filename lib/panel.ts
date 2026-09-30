import "server-only";
import { getEsquema, getRegistros, type AirRecord } from "@/lib/airtable";
import type { Usuario } from "@/lib/auth";
import { esAdmin, opciones } from "@/lib/esquema";
import { diasHasta, hoyISO, texto } from "@/lib/formato";
import { aNumero } from "@/lib/lista";
import { AUTOMATIZACIONES, DECISIONES, GALERIAS, TABLAS } from "@/config/galerias";

/** Cálculo del panel de inicio "Lo que necesita decisión". Solo lectura (con caché). */

const lista = (v: unknown) => (Array.isArray(v) ? (v as unknown[]) : v == null || v === "" ? [] : [v]);
const ids = (v: unknown) => lista(v).map(String);

async function tablaExiste(id: string) {
  return (await getEsquema()).some((t) => t.id === id);
}
async function leer(id: string): Promise<AirRecord[]> {
  return (await tablaExiste(id)) ? getRegistros(id) : [];
}

export type Decisiones = Awaited<ReturnType<typeof decisiones>>;

export async function decisiones(u: Usuario) {
  const admin = esAdmin(u);
  const gC = GALERIAS[TABLAS.clientes];
  const gE = GALERIAS[TABLAS.entrega];
  const gL = GALERIAS[TABLAS.leads];
  const gG = GALERIAS[TABLAS.gastos];
  const gK = GALERIAS[TABLAS.contabilidad];
  const gT = GALERIAS[TABLAS.tareas];

  const [clientes, entregas, leads, gastos, conta, tareas] = await Promise.all([
    leer(TABLAS.clientes),
    leer(TABLAS.entrega),
    leer(TABLAS.leads),
    admin ? leer(TABLAS.gastos) : Promise.resolve([]),
    admin ? leer(TABLAS.contabilidad) : Promise.resolve([]),
    leer(TABLAS.tareas),
  ]);

  const f = (r: AirRecord, clave: string, g: Record<string, unknown>) => r.fields[String(g[clave])];
  const clienteActivo = (r: AirRecord) => !opciones(f(r, "estado", gC)).some((x) => AUTOMATIZACIONES.estadosClienteIgnorados.includes(x));

  // Entregas esperando visto bueno
  const entregasRevision = entregas.filter((r) => lista(f(r, "status", gE)).map(texto).includes(DECISIONES.entregaEnRevision));

  // Gastos por aprobar: los marcados "Pendiente" y los de más del límite sin decisión.
  const gastosPorAprobar = gastos.filter((r) => {
    const estado = texto(f(r, "aprobacion", gG));
    if (estado === DECISIONES.aprobacionPendiente) return true;
    return !estado && aNumero(f(r, "monto", gG)) > DECISIONES.limiteGasto;
  });

  // Leads sin primer contacto en más de 24 h
  const primerContacto = (gL.contactos as string[])[0];
  const limiteLead = Date.now() - DECISIONES.horasLeadSinContacto * 3600_000;
  const leadsSinContacto = leads.filter(
    (r) =>
      !ids(r.fields[primerContacto]).length &&
      !AUTOMATIZACIONES.estadosLeadCerrados.includes(texto(f(r, "estado", gL))) &&
      Date.parse(r.createdTime) < limiteLead,
  );

  // Pagos vencidos: saldo pendiente en Contabilidad y fecha de balance pasada hace más de 7 días
  const pagosVencidos = conta
    .filter((r) => aNumero(f(r, "pendiente", gK)) > 0 && (diasHasta(f(r, "fechaBalance", gK)) ?? 1) <= -DECISIONES.diasPagoVencido)
    .sort((a, b) => String(f(a, "fechaBalance", gK)).localeCompare(String(f(b, "fechaBalance", gK))));

  // Próximos eventos (desde hoy)
  const proximos = clientes
    .filter((r) => clienteActivo(r) && (diasHasta(f(r, "fecha", gC)) ?? -1) >= 0)
    .sort((a, b) => String(f(a, "fecha", gC)).localeCompare(String(f(b, "fecha", gC))));
  const sinTeam = proximos.filter((r) => !ids(f(r, "team", gC)).length);

  // Fechas duplicadas: dos o más eventos el mismo día
  const porFecha = new Map<string, AirRecord[]>();
  for (const r of proximos) {
    const d = String(f(r, "fecha", gC)).slice(0, 10);
    porFecha.set(d, [...(porFecha.get(d) ?? []), r]);
  }
  const duplicadas = [...porFecha.entries()].filter(([, rs]) => rs.length > 1).map(([fecha, rs]) => ({ fecha, clientes: rs }));

  // Lo mío
  const misEventos = proximos.filter((r) => ids(f(r, "team", gC)).includes(u.id) && (diasHasta(f(r, "fecha", gC)) ?? 99) <= 30);
  const hechos = gT.estadosHechos as string[];
  const misTareas = tareas
    .filter((r) => ids(f(r, "responsables", gT)).includes(u.id) && !hechos.includes(texto(f(r, "estado", gT))))
    .filter((r) => (diasHasta(f(r, "fecha", gT)) ?? 0) <= 7)
    .sort((a, b) => String(f(a, "fecha", gT) ?? "9").localeCompare(String(f(b, "fecha", gT) ?? "9")));

  return {
    hoy: hoyISO(),
    entregasRevision,
    gastosPorAprobar,
    leadsSinContacto,
    pagosVencidos,
    sinTeam,
    duplicadas,
    misEventos,
    misTareas,
    total:
      entregasRevision.length +
      gastosPorAprobar.length +
      leadsSinContacto.length +
      pagosVencidos.length +
      sinTeam.length +
      duplicadas.length,
  };
}
