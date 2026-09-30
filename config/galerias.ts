/**
 * Configuración de la app en un solo lugar.
 *
 * Todo lo que no aparece aquí se genera solo a partir del esquema de Airtable:
 * si el dueño crea una tabla o un campo nuevo, sale en la app sin tocar código.
 * Las tablas se identifican por su ID (no cambia aunque se renombre la tabla);
 * los campos, por su nombre tal como aparece en Airtable.
 */

export type Rol = "Administrador" | "Equipo";

/**
 * Marca de la app. Mientras no haya logo (`logo: null`) se muestra el nombre en texto.
 * Con logo: poner los archivos en public/marca/ y rellenar las rutas.
 */
export const MARCA = {
  nombre: "Elegance Photographie",
  corto: "Elegance",
  /** Prefijo de los códigos de invitación, p. ej. "EP-7KQ2-M9XA". */
  prefijoCodigo: "EP",
  logo: null as null | { oscuro: string; claro: string; ancho: number; alto: number },
};

/** Base "Elegance Photographie CRM" (appV0PordtxxqzY5C). */
export const TABLAS = {
  clientes: "tbl6nQUYzRSY8PWZ4",
  tareas: "tbl4okeRHTWLcbwC7",
  /** La tabla VIDEOS hace de "Entrega". */
  entrega: "tblltg6JFKtSwnXnm",
  leads: "tbl7sBK5QD0ZHIDMA",
  contabilidad: "tbl0hZCWeLtmriphU",
  gastos: "tblVtMgHzjUYHX5nv",
  equipo: "tbljsGsSe2Ep1Fnjy",
  servicios: "tblst8FBjp9HUIU5v",
} as const;

/**
 * Tablas de la base que la app no muestra. "Calendario" (tblSpztRvvebMefcg) era el calendario
 * manual de Airtable: la app ya tiene su propio calendario con los eventos de Clientes.
 */
export const TABLAS_OCULTAS: string[] = ["tblSpztRvvebMefcg"];

/** Tabla de personas: da acceso a la app y alimenta los avatares. */
export const EQUIPO = {
  tabla: TABLAS.equipo,
  nombre: "Nombre",
  email: "Email",
  rol: "Rol",
  activo: "Activo",
  rolAdmin: "Administrador" as Rol,
  /** Acceso con contraseña: cada persona tiene su propio código de invitación. */
  codigo: "Código de invitación",
  estadoInvitacion: "Estado invitación",
  clave: "Clave (cifrada)",
  invitacion: { pendiente: "Pendiente", usada: "Usada", cancelada: "Cancelada" },
};

/**
 * Tablas que el rol "Equipo" puede ver (además del Calendario). El Administrador ve todo.
 * El calendario les muestra los eventos y entregas aunque no puedan abrir esas tablas.
 */
export const TABLAS_ROL_EQUIPO: string[] = [TABLAS.tareas];

/** Barra inferior del móvil (el resto de tablas va en "Más"). */
export const NAV_PRINCIPAL: string[] = [TABLAS.clientes, TABLAS.tareas, TABLAS.entrega, TABLAS.leads];

/** Orden de las tablas dentro de "Más"; las tablas nuevas se añaden al final. */
export const NAV_MAS: string[] = [TABLAS.contabilidad, TABLAS.gastos, TABLAS.servicios, TABLAS.equipo];

/** Campos de uso interno de las automatizaciones: existen en Airtable pero la app no los muestra. */
export const CAMPOS_OCULTOS: string[] = [
  "Notificado",
  "Invitados Telegram",
  "Invitaciones Telegram",
  "Recordatorio enviado",
  "Recordatorios enviados",
  "Código de invitación",
  "Estado invitación",
  "Clave (cifrada)",
  "Aviso confirmado",
  "Aviso enviado",
];

/** Campos que la app muestra pero no deja editar en el formulario (se cambian con botones). */
export const CAMPOS_SOLO_BOTONES: string[] = ["Aprobación", "Aprobado por"];

/** Segundos que se reutilizan las lecturas de Airtable antes de volver a pedirlas. */
export const CACHE_SEGUNDOS = 30;

/** Formato de números y dinero (el símbolo sale de cada campo de Airtable). */
export const MONEDA = { locale: "es-MX" };

/** Zona horaria del negocio, para saber qué es "hoy" y "esta semana". */
export const ZONA_HORARIA = "America/Mexico_City";

/** Colores de chips por nombre de opción (sin distinguir mayúsculas). [fondo, texto] */
const AZUL: [string, string] = ["#E4ECF5", "#274766"];
const NARANJA: [string, string] = ["#FBEBD9", "#7A3F0C"];
const MORADO: [string, string] = ["#EFE6F3", "#55336A"];
const VERDE: [string, string] = ["#E3EEDF", "#2F5226"];
const ROJO: [string, string] = ["#F6E1DC", "#7A2A1A"];
export const COLOR_POR_DEFECTO: [string, string] = ["#EEEAE2", "#5E584F"];

export const COLORES_OPCION: Record<string, [string, string]> = {
  // Del prototipo
  reservado: AZUL,
  "anticipo pagado": NARANJA,
  "en edición": MORADO,
  entregado: VERDE,
  // Clientes
  confirmado: AZUL,
  activa: AZUL,
  "pendiente de pago": NARANJA,
  "en proceso": MORADO,
  finalizado: VERDE,
  cancelado: ROJO,
  // Tareas
  "en progreso": MORADO,
  "en revisión": NARANJA,
  completa: VERDE,
  completada: VERDE,
  // Entrega
  enviado: AZUL,
  "revisando cambios": NARANJA,
  // Leads
  contactado: AZUL,
  "en seguimiento": AZUL,
  "en negociación": NARANJA,
  ganado: VERDE,
  perdido: ROJO,
  // Aprobaciones e invitaciones
  aprobada: VERDE,
  aprobado: VERDE,
  rechazado: ROJO,
  pendiente: NARANJA,
  usada: VERDE,
  cancelada: ROJO,
  // Elegance: clientes
  tentativo: NARANJA,
  // Elegance: videos
  "en espera": COLOR_POR_DEFECTO,
  "iniciando cambios": NARANJA,
  "cambios en proceso": MORADO,
  "subido a la nube": AZUL,
  // Elegance: leads
  cerrado: VERDE,
  // Prioridad
  alta: ROJO,
  media: NARANJA,
  baja: AZUL,
};

/* ------------------------------------------------------------------ */
/* Galerías a medida                                                    */
/* ------------------------------------------------------------------ */

export type Galeria = {
  /** Diseño especial de la lista; si no hay, se usa el genérico. */
  vista?: "clientes" | "tareas" | "entrega" | "leads" | "contabilidad" | "gastos" | "equipo";
  /** Campo de selección que se ofrece como filtro en chips. */
  filtro?: string;
  /** Orden de la lista. */
  orden?: { campo: string; dir: "asc" | "desc" };
  /** Campos que se muestran en la tarjeta genérica (si no, los primeros del esquema). */
  tarjeta?: string[];
  /** Accesos a registros enlazados que se destacan en la ficha. */
  relacionados?: { campo: string; titulo: string }[];
  [clave: string]: unknown;
};

export const GALERIAS: Record<string, Galeria> = {
  [TABLAS.clientes]: {
    vista: "clientes",
    nombre: "nombre del cliente",
    filtro: "ESTADO DEL CLIENTE",
    orden: { campo: "fecha del evento", dir: "asc" },
    estado: "ESTADO DEL CLIENTE",
    fecha: "fecha del evento",
    /** Enlace a SERVICIOS: se muestran los nombres de los servicios. */
    servicio: "Nombre del Servicio (from SERVICIO)",
    venue: "Venue",
    team: "Team Members",
    confirmados: "Confirmados",
    precio: "costo",
    relacionados: [
      { campo: "Tareas", titulo: "Tareas" },
      { campo: "Entrega", titulo: "Entregas" },
      { campo: "Contabilidad", titulo: "Pagos" },
      { campo: "Gastos", titulo: "Gastos" },
      { campo: "Leads", titulo: "Leads" },
    ],
  },
  [TABLAS.tareas]: {
    vista: "tareas",
    orden: { campo: "Fecha Limite", dir: "asc" },
    estado: "Estado de Tarea",
    fecha: "Fecha Limite",
    cliente: "Cliente Asociado",
    responsables: "Responsables",
    prioridad: "Prioridad",
    /** Opciones que cuentan como "hecha". La primera es la que se pone al marcar. */
    estadosHechos: ["Completada"],
    /** Estado al desmarcar. */
    estadoPendiente: "Por Hacer",
    /** Días antes del vencimiento en que la fecha se pone en rojo. */
    diasAviso: 2,
  },
  [TABLAS.entrega]: {
    vista: "entrega",
    cliente: "Cliente",
    filtro: "Status",
    orden: { campo: "FECHA DE ENTREGA ORIGINAL", dir: "asc" },
    status: "Status",
    fecha: "FECHA DE ENTREGA ORIGINAL",
    cambios: "Notas de cambios",
    link: "Link de Entrega",
    responsable: "Responsable Entrega",
  },
  [TABLAS.leads]: {
    vista: "leads",
    filtro: "estado",
    orden: { campo: "fecha de evento", dir: "asc" },
    estado: "estado",
    fecha: "fecha de evento",
    /** Se muestra junto a la fecha en la tarjeta del lead. */
    servicio: "Venue",
    contactos: ["1er Contacto", "2do Contacto", "3er Contacto", "4to Contacto"],
    clienteRelacionado: "Relacionado a Cliente",
    /** Al convertir un lead en cliente. */
    conversion: {
      nombre: ["nombre del lead", "nombre del cliente"],
      fecha: ["fecha de evento", "fecha del evento"],
      venue: ["Venue", "Venue"],
      notas: ["Notas de Lead", "solicitud especial"],
      estadoCliente: ["ESTADO DEL CLIENTE", "TENTATIVO"],
      estadoLeadGanado: "Ganado",
    },
  },
  [TABLAS.contabilidad]: {
    vista: "contabilidad",
    orden: { campo: "Monto Pendiente", dir: "desc" },
    total: "Monto Total",
    deposito: "DEPOSITO",
    pendiente: "Monto Pendiente",
    fechaBalance: "Fecha Balance",
    fechaDeposito: "Fecha Depósito",
  },
  [TABLAS.gastos]: {
    vista: "gastos",
    filtro: "Categoría",
    orden: { campo: "Fecha", dir: "desc" },
    categoria: "Categoría",
    fecha: "Fecha",
    pagador: "Persona que hizo el pago",
    monto: "Cantidad",
    comprobante: "Comprobante",
    aprobacion: "Aprobación",
    aprobadoPor: "Aprobado por",
  },
  [TABLAS.equipo]: {
    vista: "equipo",
    rol: "Rol",
    eventos: "Eventos asignados",
    email: "Email",
    telefono: "Teléfono",
    activo: "Activo",
    /** Campos de la ficha y el formulario de Equipo que no se muestran (enlaces inversos e internos). */
    ocultar: [
      "Clientes ingresados",
      "Eventos asignados",
      "Tareas asignadas",
      "Entregas a cargo",
      "Leads (1er contacto)",
      "Leads (2do contacto)",
      "Leads (3er contacto)",
      "Leads (4to contacto)",
      "Gastos pagados",
      "Telegram Chat ID",
      "Eventos confirmados",
      "Gastos aprobados",
      "Invitaciones Telegram",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Panel de inicio: "Lo que necesita decisión"                          */
/* ------------------------------------------------------------------ */

export const DECISIONES = {
  /** Estado de entrega que espera el visto bueno de un administrador… */
  entregaEnRevision: "SUBIDO A LA NUBE",
  /** …y el que se pone al darlo. */
  entregaAprobada: "ENTREGADO",
  /** Gastos por encima de este monto los tiene que aprobar otro socio (no quien pagó). */
  limiteGasto: 5000,
  aprobacionPendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  /** Horas sin primer contacto para que un lead salga en el panel. */
  horasLeadSinContacto: 24,
  /** Días de retraso (tras la fecha de balance de Contabilidad) para que un pago cuente como vencido. */
  diasPagoVencido: 7,
  /** Días hacia delante en que se buscan eventos sin team o en la misma fecha. */
  diasEventos: 120,
};

/* ------------------------------------------------------------------ */
/* Automatizaciones (Telegram y tareas programadas)                     */
/* ------------------------------------------------------------------ */

export const AUTOMATIZACIONES = {
  /** La entrega se fija este número de semanas después del evento. */
  semanasEntrega: 9,
  /** Días antes de la fecha de entrega en que se avisa al responsable. */
  diasAvisoEntrega: 7,
  /** Días entre cada contacto de un lead (2º, 3º y 4º). */
  diasEntreContactos: 7,
  /** Estados de cliente que no generan avisos ni invitaciones. */
  estadosClienteIgnorados: ["CANCELADO"],
  /** Estados de entrega que cuentan como entregada. */
  estadosEntregaHechos: ["ENTREGADO"],
  /** Estados de lead que ya no necesitan recordatorios. */
  estadosLeadCerrados: ["Ganado", "Perdido", "cerrado", "cancelado"],
  /**
   * Crear una entrega automática a N semanas de cada cliente nuevo. En Elegance, VIDEOS guarda
   * los videos con cambios pedidos (no entregas planeadas), así que está desactivado.
   */
  crearEntregaAuto: false,
  /** Estado de cliente que dispara el aviso "cliente confirmado" al grupo de administradores. */
  estadoConfirmado: "CONFIRMADO",
  /** Estado de video que pone el botón "Marcar como entregado" de Telegram. */
  estadoVideoEntregado: "ENTREGADO",
  /** Estado que se pone a una entrega creada automáticamente. */
  estadoEntregaInicial: "EN ESPERA",
  /** Palabras que valen como confirmación escrita en Telegram. */
  palabrasConfirmar: ["confirmo", "si", "sí", "ok", "confirmado", "✅", "👍"],
  campos: {
    telegramChatId: "Telegram Chat ID",
    clienteSolicitudes: "solicitud especial",
    clienteNotificado: "Notificado",
    clienteInvitados: "Invitados Telegram",
    clienteConfirmados: "Confirmados",
    clienteEntrega: "Entrega",
    entregaRecordatorio: "Recordatorio enviado",
    leadRecordatorios: "Recordatorios enviados",
    clienteAvisoConfirmado: "Aviso confirmado",
    videoAviso: "Aviso enviado",
    contaDeposito: "DEPOSITO",
    contaFechaDeposito: "Fecha Depósito",
    contaTotal: "Monto Total",
    contaPendiente: "Monto Pendiente",
    contaFechaBalance: "Fecha Balance",
  },
};
