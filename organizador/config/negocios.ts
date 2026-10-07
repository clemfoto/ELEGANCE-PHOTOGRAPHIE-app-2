/** Configuración del organizador: todo lo que se ajusta sin tocar el resto del código. */

export const APP = {
  nombre: "Mi organizador",
  corto: "Organizador",
};

/** Zona horaria en la que se interpretan fechas y horas (Ciudad de México, sin horario de verano). */
export const ZONA = "America/Mexico_City";

/** Las tareas sin hora avisan a esta hora del día. */
export const HORA_SIN_HORARIO = "09:00";

export const MONEDA = { codigo: "MXN", locale: "es-MX" };

export type NegocioId = "elegance" | "signatap" | "tugiro";

export type Negocio = {
  id: NegocioId;
  nombre: string;
  corto: string;
  inicial: string;
  color: string; // color principal (marca en calendario y botones)
  suave: string; // fondo de chips
};

export const NEGOCIOS: Negocio[] = [
  { id: "elegance", nombre: "Elegance Photographie", corto: "Elegance", inicial: "E", color: "#4A565D", suave: "#E4ECED" },
  { id: "signatap", nombre: "Signatap", corto: "Signatap", inicial: "S", color: "#3D5AA8", suave: "#E3E9F7" },
  { id: "tugiro", nombre: "tugirodigital.mx", corto: "Tugiro", inicial: "T", color: "#B8612A", suave: "#F8E9DD" },
];

export const negocio = (id: string): Negocio | undefined => NEGOCIOS.find((n) => n.id === id);

/** Opciones de recordatorio, en minutos antes del inicio. */
export const RECORDATORIOS: { min: number; texto: string }[] = [
  { min: 0, texto: "A la hora" },
  { min: 5, texto: "5 min antes" },
  { min: 15, texto: "15 min antes" },
  { min: 30, texto: "30 min antes" },
  { min: 60, texto: "1 h antes" },
  { min: 120, texto: "2 h antes" },
  { min: 1440, texto: "1 día antes" },
  { min: 2880, texto: "2 días antes" },
  { min: 10080, texto: "1 semana antes" },
];

/** Recordatorio que se propone por defecto al crear una tarea. */
export const RECORDATORIO_POR_DEFECTO = [15];

/** Minutos que se pospone un recordatorio desde Telegram. */
export const POSPONER_MIN = 30;

/** Categorías sugeridas (se puede escribir cualquier otra). */
export const CATEGORIAS = {
  ingreso: ["Servicio", "Anticipo", "Liquidación", "Suscripción", "Venta", "Otro"],
  gasto: ["Software", "Publicidad", "Equipo", "Transporte", "Comida", "Nómina", "Impuestos", "Comisiones", "Otro"],
};
