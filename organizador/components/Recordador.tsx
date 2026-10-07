"use client";
import { useEffect } from "react";

export type AvisoLocal = { clave: string; tareaId: string; fecha: string; cuando: number; titulo: string; cuerpo: string };

export const CLAVE_ACTIVO = "avisos-locales";
const CLAVE_MOSTRADOS = "avisos-mostrados";

const leer = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/** Mientras la app está abierta, muestra en este dispositivo los recordatorios de las próximas horas. */
export default function Recordador({ avisos }: { avisos: AvisoLocal[] }) {
  useEffect(() => {
    if (leer(CLAVE_ACTIVO) !== "1" || !("Notification" in window) || Notification.permission !== "granted") return;
    let mostrados: Record<string, number> = {};
    try {
      mostrados = JSON.parse(leer(CLAVE_MOSTRADOS) ?? "{}");
    } catch {}

    const mostrar = async (a: AvisoLocal) => {
      if (mostrados[a.clave]) return;
      mostrados[a.clave] = Date.now();
      // Se olvidan los de hace más de 3 días.
      for (const [k, v] of Object.entries(mostrados)) if (v < Date.now() - 3 * 86400000) delete mostrados[k];
      try {
        localStorage.setItem(CLAVE_MOSTRADOS, JSON.stringify(mostrados));
      } catch {}
      const opciones = { body: a.cuerpo, tag: a.clave, icon: "/icons/icon-192-v1.png", data: { url: `/tarea/${a.tareaId}?fecha=${a.fecha}` } };
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) reg.showNotification(a.titulo, opciones);
      else new Notification(a.titulo, opciones);
    };

    const timers = avisos
      .filter((a) => a.cuando > Date.now() - 5 * 60000)
      .map((a) => setTimeout(() => mostrar(a), Math.max(0, a.cuando - Date.now())));
    return () => timers.forEach(clearTimeout);
  }, [avisos]);
  return null;
}
