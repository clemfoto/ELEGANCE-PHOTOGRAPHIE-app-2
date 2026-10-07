import "server-only";
import { randomUUID } from "node:crypto";
import { leer, modificar } from "./almacen";
import type { Ajustes, Movimiento, Tarea } from "./tipos";

export const nuevoId = () => randomUUID().replace(/-/g, "").slice(0, 12);

// ---------- tareas ----------

export const listarTareas = () => leer<Tarea[]>("tareas", []);

export async function obtenerTarea(id: string): Promise<Tarea | undefined> {
  return (await listarTareas()).find((t) => t.id === id);
}

export function guardarTarea(t: Tarea) {
  return modificar<Tarea[]>("tareas", [], (ts) => {
    const i = ts.findIndex((x) => x.id === t.id);
    if (i >= 0) ts[i] = t;
    else ts.push(t);
  });
}

export function cambiarTarea(id: string, cambio: (t: Tarea) => void) {
  return modificar<Tarea[]>("tareas", [], (ts) => {
    const t = ts.find((x) => x.id === id);
    if (t) cambio(t);
  });
}

export function borrarTarea(id: string) {
  return modificar<Tarea[]>("tareas", [], (ts) => ts.filter((t) => t.id !== id));
}

export function marcarHecha(id: string, fecha: string, hecha: boolean) {
  return cambiarTarea(id, (t) => {
    t.hechas = t.hechas.filter((d) => d !== fecha);
    if (hecha) t.hechas.push(fecha);
  });
}

// ---------- contabilidad ----------

export const listarMovimientos = () => leer<Movimiento[]>("movimientos", []);

export async function obtenerMovimiento(id: string) {
  return (await listarMovimientos()).find((m) => m.id === id);
}

export function guardarMovimiento(m: Movimiento) {
  return modificar<Movimiento[]>("movimientos", [], (ms) => {
    const i = ms.findIndex((x) => x.id === m.id);
    if (i >= 0) ms[i] = m;
    else ms.push(m);
  });
}

export function borrarMovimiento(id: string) {
  return modificar<Movimiento[]>("movimientos", [], (ms) => ms.filter((m) => m.id !== id));
}

// ---------- ajustes y estado de los recordatorios ----------

export const leerAjustes = () => leer<Ajustes>("ajustes", {});
export const cambiarAjustes = (cambio: (a: Ajustes) => void) => modificar<Ajustes>("ajustes", {}, cambio);

/** Recordatorios ya enviados (clave → instante) y pospuestos (clave → instante en que avisar). */
export type EstadoAvisos = { enviados: Record<string, number>; pospuestos: Record<string, { tarea: string; fecha: string; cuando: number }> };
export const leerAvisos = () => leer<EstadoAvisos>("avisos", { enviados: {}, pospuestos: {} });
export const cambiarAvisos = (cambio: (e: EstadoAvisos) => void) => modificar<EstadoAvisos>("avisos", { enviados: {}, pospuestos: {} }, cambio);
