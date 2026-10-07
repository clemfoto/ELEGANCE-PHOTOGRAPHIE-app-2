"use client";
import { useEffect, useState } from "react";
import { CLAVE_ACTIVO } from "./Recordador";

/** Activa los avisos del propio navegador/móvil (funcionan con la app abierta o en segundo plano reciente). */
export default function AvisosDispositivo() {
  const [estado, setEstado] = useState<"cargando" | "no" | "denegado" | "on" | "off">("cargando");

  useEffect(() => {
    if (!("Notification" in window)) return setEstado("no");
    if (Notification.permission === "denied") return setEstado("denegado");
    let activo = false;
    try {
      activo = localStorage.getItem(CLAVE_ACTIVO) === "1";
    } catch {}
    setEstado(activo && Notification.permission === "granted" ? "on" : "off");
  }, []);

  const cambiar = async () => {
    if (estado === "on") {
      try { localStorage.removeItem(CLAVE_ACTIVO); } catch {}
      return setEstado("off");
    }
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return setEstado(permiso === "denied" ? "denegado" : "off");
    try { localStorage.setItem(CLAVE_ACTIVO, "1"); } catch {}
    setEstado("on");
    const reg = await navigator.serviceWorker?.getRegistration();
    const opciones = { body: "Así se verán los recordatorios.", icon: "/icons/icon-192-v1.png" };
    if (reg) reg.showNotification("Avisos activados", opciones);
    else new Notification("Avisos activados", opciones);
  };

  if (estado === "cargando") return null;
  if (estado === "no") return <p className="muted">Este navegador no admite avisos. En iPhone, instala primero la app en la pantalla de inicio (Compartir → Añadir a inicio) y ábrela desde el icono.</p>;
  if (estado === "denegado") return <p className="muted">Los avisos están bloqueados para esta app. Actívalos en los ajustes del navegador o del teléfono.</p>;
  return (
    <label className="campo" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
      <span>Avisos en este dispositivo</span>
      <button type="button" className={`btn btn-chico ${estado === "on" ? "btn-primario" : "btn-secundario"}`} onClick={cambiar} aria-pressed={estado === "on"}>
        {estado === "on" ? "Activados" : "Activar"}
      </button>
    </label>
  );
}
