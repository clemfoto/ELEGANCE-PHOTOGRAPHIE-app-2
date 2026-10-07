import type { NegocioId } from "@/config/negocios";

export type TipoRepeticion = "nunca" | "diaria" | "semanal" | "mensual" | "anual";

export type Repeticion = {
  tipo: TipoRepeticion;
  /** Cada cuántos días/semanas/meses/años. */
  cada: number;
  /** Solo semanal: días de la semana (0 = domingo … 6 = sábado). */
  dias?: number[];
  /** Último día (incluido) en que se repite. */
  hasta?: string;
};

export type Tarea = {
  id: string;
  negocio: NegocioId;
  titulo: string;
  notas?: string;
  /** Primer día (YYYY-MM-DD). */
  fecha: string;
  /** HH:MM; sin hora = todo el día. */
  hora?: string;
  /** Duración en minutos (solo con hora). */
  duracion?: number;
  repetir: Repeticion;
  /** Minutos antes del inicio. */
  recordatorios: number[];
  /** Días (YYYY-MM-DD) marcados como hechos; en las repetitivas, cada día por separado. */
  hechas: string[];
  /** Días quitados de una serie repetitiva. */
  excepciones: string[];
  creada: string;
};

/** Una tarea en un día concreto (las repetitivas aparecen una vez por día). */
export type Ocurrencia = {
  tarea: Tarea;
  fecha: string;
  hecha: boolean;
};

export type Movimiento = {
  id: string;
  negocio: NegocioId;
  tipo: "ingreso" | "gasto";
  fecha: string;
  concepto: string;
  monto: number;
  categoria?: string;
  notas?: string;
  creado: string;
};

export type Ajustes = {
  telegramChatId?: string;
  telegramNombre?: string;
};
