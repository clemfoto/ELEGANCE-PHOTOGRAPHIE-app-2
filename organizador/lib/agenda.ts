import "server-only";
import { listarTareas } from "./datos";
import { hoyISO, sumarDias } from "./fechas";
import { ocurrencias, ordenar } from "./recurrencia";
import type { Ocurrencia, Tarea } from "./tipos";

/** Tareas sin repetición de días anteriores que siguen sin hacer. */
export function atrasadas(tareas: Tarea[], hoy: string): Ocurrencia[] {
  return ordenar(
    tareas
      .filter((t) => t.repetir.tipo === "nunca" && t.fecha < hoy && !t.hechas.includes(t.fecha) && !t.excepciones.includes(t.fecha))
      .map((t) => ({ tarea: t, fecha: t.fecha, hecha: false })),
  );
}

/** Pendientes primero, hechas al final (cada grupo por hora). */
export const pendientesPrimero = (os: Ocurrencia[]) => [...os.filter((o) => !o.hecha), ...os.filter((o) => o.hecha)];

export async function agenda(dias = 7) {
  const tareas = await listarTareas();
  const hoy = hoyISO();
  const proximas = ocurrencias(tareas, hoy, sumarDias(hoy, dias));
  return { tareas, hoy, proximas, atrasadas: atrasadas(tareas, hoy) };
}
