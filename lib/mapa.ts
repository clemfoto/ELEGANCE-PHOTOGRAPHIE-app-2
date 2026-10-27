/**
 * Dónde vive cada campo del esquema en Supabase. Las claves son los IDs de tabla y de campo
 * del esquema (los de Airtable, que se conservaron al migrar), así el resto de la app no cambia.
 *
 * - columnas: campo guardado en una columna de la tabla.
 * - enlaces: campo de enlace guardado en una tabla puente (los dos lados de cada enlace leen
 *   y escriben la misma tabla puente; `filtro` separa enlaces que comparten puente).
 * - adjuntos: campo de archivos (tabla `adjuntos` + bucket privado "adjuntos").
 * - calculados: solo lectura (fechas automáticas, autor, saldos de Contabilidad).
 *
 * Campo nuevo: añadir la columna en una migración, el campo en `app_esquema` y su línea aquí.
 */

export type TipoColumna = "texto" | "fecha" | "numero" | "casilla" | "lista" | "json";
export type Columna = { col: string; tipo: TipoColumna };
export type Enlace = { puente: string; propia: string; otra: string; filtro?: Record<string, string | number> };
export type Calculado = { col: string; tipo: "fechaHora" | "json" } | { vista: string; col: string };
export type MapaTabla = {
  tabla: string;
  columnas: Record<string, Columna>;
  enlaces?: Record<string, Enlace>;
  adjuntos?: Record<string, string>;
  calculados?: Record<string, Calculado>;
};

const c = (col: string, tipo: TipoColumna = "texto"): Columna => ({ col, tipo });

export const MAPA: Record<string, MapaTabla> = {
  // Equipo
  tbljsGsSe2Ep1Fnjy: {
    tabla: "equipo",
    columnas: {
      fldQtXAphK2wPQZJz: c("nombre"),
      fldKiAiv4fG762RdH: c("rol"),
      fldyy4uRYOHOlvSNa: c("email"),
      fldeUlcxMZ19KoNoP: c("telefono"),
      fldwPw1lKTMkhSOKH: c("usuario_telegram"),
      fldDEVJ20jJWPuO1g: c("activo", "casilla"),
      fldcJjiInQEkfgvTf: c("telegram_chat_id"),
      fldtkqvffx3SLfDPs: c("codigo_invitacion"),
      fldkpZmeKDFS9bnQY: c("estado_invitacion"),
      fldVh7nV0OXl2bDU6: c("clave_cifrada"),
    },
    enlaces: {
      fldEDArafehb66n9j: { puente: "cliente_equipo", propia: "equipo_id", otra: "cliente_id", filtro: { tipo: "asignado" } },
      fldAnpulYuZDhUuj2: { puente: "cliente_equipo", propia: "equipo_id", otra: "cliente_id", filtro: { tipo: "confirmado" } },
      fldxRQzMa7s92IllB: { puente: "cliente_equipo", propia: "equipo_id", otra: "cliente_id", filtro: { tipo: "invitado_telegram" } },
      fldAQkfGPy7VR0zrK: { puente: "tarea_responsables", propia: "equipo_id", otra: "tarea_id" },
      fldzYhbZxzUu0SFlH: { puente: "entrega_responsables", propia: "equipo_id", otra: "entrega_id" },
      fldtdjD1dYrF7J9hZ: { puente: "lead_contactos", propia: "equipo_id", otra: "lead_id", filtro: { numero: 1 } },
      fldg3AGn8UqiYEdrX: { puente: "lead_contactos", propia: "equipo_id", otra: "lead_id", filtro: { numero: 2 } },
      fld3Xic5Sc8ogsj8o: { puente: "lead_contactos", propia: "equipo_id", otra: "lead_id", filtro: { numero: 3 } },
      fldtFCN18yivjxEy1: { puente: "lead_contactos", propia: "equipo_id", otra: "lead_id", filtro: { numero: 4 } },
      fldkeromA8JIVKQyy: { puente: "gasto_equipo", propia: "equipo_id", otra: "gasto_id", filtro: { tipo: "pago" } },
      fldeURO6cHW5TFq7O: { puente: "gasto_equipo", propia: "equipo_id", otra: "gasto_id", filtro: { tipo: "aprobacion" } },
    },
  },

  // SERVICIOS
  tblst8FBjp9HUIU5v: {
    tabla: "servicios",
    columnas: {
      fld3bkLBfAeI9Q5sV: c("nombre"),
      fldbRfcqIdObgAlub: c("descripcion"),
      fldgpOxA9X8JgA6RX: c("notas_internas"),
      fldb4a6ctlCRgHjWP: c("clientes_texto"),
      fldEPservPrecio01: c("precio", "numero"),
      fldEPservOpcion01: c("opciones"),
    },
    enlaces: {
      fldGfTCoU054QIzMZ: { puente: "cliente_servicios", propia: "servicio_id", otra: "cliente_id" },
    },
  },

  // Clientes
  tbl6nQUYzRSY8PWZ4: {
    tabla: "clientes",
    columnas: {
      fldFVYDOxXffeoQzh: c("nombre"),
      fldJbw2DTqm2vPLKR: c("fecha_evento", "fecha"),
      fldsxlbLW4Qpnztr2: c("venue"),
      fldPnRUSZKOqXtkFG: c("solicitud_especial"),
      fld90ICzfbaFGSAlz: c("team_members_antiguo", "lista"),
      fldgsuUk3KfbitzPc: c("estado", "lista"),
      fldqePjDnPFiAs14s: c("notificado", "casilla"),
      fldF8DxVth6rxiM9u: c("aviso_confirmado", "casilla"),
      fldEPclienEmail01: c("email"),
      fldEPclienTelef01: c("telefono"),
      fldEPclienIva0001: c("aplica_iva", "casilla"),
      fldEPclienDepos01: c("deposito", "numero"),
      fldEPclienDepPag1: c("deposito_pagado_en", "fecha"),
    },
    enlaces: {
      fldjlxe5Ut8V7KwPJ: { puente: "cliente_servicios", propia: "cliente_id", otra: "servicio_id" },
      fldMW50I0rtxUe5z6: { puente: "cliente_equipo", propia: "cliente_id", otra: "equipo_id", filtro: { tipo: "asignado" } },
      fldOjNMWIWeFann5j: { puente: "cliente_equipo", propia: "cliente_id", otra: "equipo_id", filtro: { tipo: "confirmado" } },
      fldEKw9t5qU9FeA5h: { puente: "cliente_equipo", propia: "cliente_id", otra: "equipo_id", filtro: { tipo: "invitado_telegram" } },
      fldpcHIbTIZonO7nV: { puente: "tarea_clientes", propia: "cliente_id", otra: "tarea_id" },
      fldWS22tNsHmn90wG: { puente: "entrega_clientes", propia: "cliente_id", otra: "entrega_id" },
      fldrj9yWWMv6Ipqva: { puente: "lead_clientes", propia: "cliente_id", otra: "lead_id" },
      fldNxcbBIQC1dNG70: { puente: "contabilidad_clientes", propia: "cliente_id", otra: "contabilidad_id" },
      flddgHHfUDwD46w8T: { puente: "gasto_clientes", propia: "cliente_id", otra: "gasto_id" },
    },
    adjuntos: { fldnvAtufMtm8ZLuC: "archivos" },
    calculados: {
      // Precios por servicio (cliente_servicios.precio) + IVA: vista clientes_totales
      fldX48Mc1qMb95Kpq: { vista: "clientes_totales", col: "total" },
      fldEPclienSubtot1: { vista: "clientes_totales", col: "subtotal" },
      fldEPclienImpIva1: { vista: "clientes_totales", col: "iva" },
      fldEPclienBalanc1: { vista: "clientes_totales", col: "balance" },
      fld2mbR139wbyYrIe: { col: "creado_por", tipo: "json" },
      fld1UYWOqzIEOycTu: { col: "creado_en", tipo: "fechaHora" },
      fldewEFTeABXa1pM8: { col: "modificado_en", tipo: "fechaHora" },
    },
  },

  // Tareas
  tbl4okeRHTWLcbwC7: {
    tabla: "tareas",
    columnas: {
      fldMgRyoQjClYoktq: c("tarea"),
      fldfhjG3TNUxSV8Va: c("responsable_antiguo"),
      fld7tNekqTt3AiFYy: c("color"),
      fldO7mPFyhIh15JqI: c("cliente_antiguo"),
      fldRl23YLWyxQ5mp8: c("descripcion"),
      fldHaxSGEdMsjDzn8: c("fecha_limite", "fecha"),
      fldWtDREqdCAtkHGv: c("colaboradores", "json"),
      fldXrEYci1YF1yzbK: c("estado"),
    },
    enlaces: {
      fldz39E12VRYirGy7: { puente: "tarea_responsables", propia: "tarea_id", otra: "equipo_id" },
      fldxZHzZRJhUgi0oN: { puente: "tarea_clientes", propia: "tarea_id", otra: "cliente_id" },
    },
  },

  // Calendario (oculta en la app)
  tblSpztRvvebMefcg: {
    tabla: "calendario",
    columnas: {
      fldhhGJ80yTzPF9w3: c("nombre_evento"),
      fld10WLxR8fvgjrfK: c("fecha", "fecha"),
      fldf5rwUCZ0QUJWrI: c("venue"),
      fld5wGE0o8TlsGp5F: c("servicio"),
      fldxLgRnlRElLc3jk: c("color"),
      fldUenuVLX1GFMmvx: c("cliente"),
    },
  },

  // Leads
  tbl7sBK5QD0ZHIDMA: {
    tabla: "leads",
    columnas: {
      fldTF6y8erTWCE2Un: c("nombre"),
      fldGbRmfMO3iCjcgs: c("fecha_evento", "fecha"),
      fld7rSfopfgRyDHeA: c("venue"),
      fldXef8bfEbzZrCNa: c("estado"),
      fldtE1ebomv83o6xt: c("cliente_convertido"),
      fldayTxwl9BQ1F55Z: c("field_6"),
      fldPHmfBcgbBCrfVN: c("recordatorios_enviados", "numero"),
      fld2pzf7euGH0eWkH: c("notas"),
      flduxPykU6QxvhHcW: c("email"),
      fldJvjZ8nB04hctui: c("origen"),
      fldB6IHRSZNCIoaLH: c("ubicacion"),
    },
    enlaces: {
      fldPbCdjwCQgeu9gb: { puente: "lead_contactos", propia: "lead_id", otra: "equipo_id", filtro: { numero: 1 } },
      flderzDaEAsqJkCyz: { puente: "lead_contactos", propia: "lead_id", otra: "equipo_id", filtro: { numero: 2 } },
      fldCQ821wEV7beMpQ: { puente: "lead_contactos", propia: "lead_id", otra: "equipo_id", filtro: { numero: 3 } },
      fldpfRUBMGRHIpRof: { puente: "lead_contactos", propia: "lead_id", otra: "equipo_id", filtro: { numero: 4 } },
      fld8OIKdIsRwpVaxc: { puente: "lead_clientes", propia: "lead_id", otra: "cliente_id" },
    },
  },

  // VIDEOS (Entrega)
  tblltg6JFKtSwnXnm: {
    tabla: "entregas",
    columnas: {
      fldRWgiIUNX2JRH9t: c("nombre_cliente"),
      fldvWjgdqA9NIytES: c("fecha_entrega_original", "fecha"),
      fldXZ77IPInwrnoqv: c("status"),
      fldSL3n5oCa8KwqBQ: c("link_entrega"),
      fldfva4UfN4xPiUAM: c("notas_cambios"),
      fldhgL9vb8kS7Wimm: c("recordatorio_enviado", "casilla"),
      fldEvHZZlXVYafR5t: c("aviso_enviado", "casilla"),
    },
    enlaces: {
      fldbYr7JImLMgmZpk: { puente: "entrega_clientes", propia: "entrega_id", otra: "cliente_id" },
      fldvdyUr2iTDychBo: { puente: "entrega_responsables", propia: "entrega_id", otra: "equipo_id" },
    },
    adjuntos: { fldrKMu34XhPPB2qk: "cambios_deseados" },
    calculados: { fldGxyACWn7YTrWVI: { col: "creado_en", tipo: "fechaHora" } },
  },

  // Contabilidad
  tbl0hZCWeLtmriphU: {
    tabla: "contabilidad",
    columnas: {
      fldApA5y61MY4hNLj: c("concepto"),
      fldorsgeMQXQpXcBj: c("deposito", "numero"),
      fld7TxIJeG1NGIBzU: c("fecha_deposito", "fecha"),
      fld6Vx06kdJjCb05d: c("fecha_balance", "fecha"),
      fld3Sg24nphdeVjga: c("notas"),
    },
    enlaces: {
      fld8N8B6PI9ykQLgB: { puente: "contabilidad_clientes", propia: "contabilidad_id", otra: "cliente_id" },
    },
    calculados: {
      fldwyPoprDfeqLjyg: { vista: "contabilidad_saldos", col: "monto_total" },
      fldd2QB8pVa1QMo8t: { vista: "contabilidad_saldos", col: "monto_pendiente" },
    },
  },

  // Gastos
  tblVtMgHzjUYHX5nv: {
    tabla: "gastos",
    columnas: {
      fldBJPtSLvhJfW6Tn: c("gasto"),
      fld4U1UNCpu27PPte: c("fecha", "fecha"),
      fldqySWoDhiAgLXmB: c("cantidad", "numero"),
      fldmEtvNzBOe4Zwsl: c("forma_pago"),
      flddQuHkJnt4H4qtf: c("categoria"),
      fldC9BMDZ3w1f6cHv: c("aprobacion"),
    },
    enlaces: {
      fldMOiuFh8XpMazzs: { puente: "gasto_clientes", propia: "gasto_id", otra: "cliente_id" },
      fldvgWAF2rIh2UAHZ: { puente: "gasto_equipo", propia: "gasto_id", otra: "equipo_id", filtro: { tipo: "pago" } },
      fldfvNazeMjY6QHmx: { puente: "gasto_equipo", propia: "gasto_id", otra: "equipo_id", filtro: { tipo: "aprobacion" } },
    },
    adjuntos: { fldYQwARUYKWJ9Y2j: "comprobante" },
  },
};
