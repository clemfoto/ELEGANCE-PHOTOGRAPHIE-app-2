"use client";
import { useState, useTransition } from "react";
import { conectarTelegram, desconectarTelegram, probarTelegram } from "@/app/acciones";

export default function PanelTelegram({ conectado, nombre, configurado }: { conectado: boolean; nombre?: string; configurado: boolean }) {
  const [mensaje, setMensaje] = useState<{ ok?: string; error?: string }>();
  const [enviando, start] = useTransition();

  if (!configurado) {
    return <p className="muted">Falta la variable <code>TELEGRAM_BOT_TOKEN</code> en Netlify (ver README).</p>;
  }
  return (
    <>
      <p className="muted">
        {conectado ? `Conectado${nombre ? ` con ${nombre}` : ""}. Los recordatorios llegan por Telegram con botones «Hecha» y «Posponer».` : "Conecta tu Telegram para recibir los recordatorios aunque la app esté cerrada."}
      </p>
      <div className="acciones">
        <button className="btn btn-primario" disabled={enviando} onClick={() => start(async () => {
          const r = await conectarTelegram();
          if (r.url) window.location.href = r.url;
          else setMensaje({ error: r.error });
        })}>
          {conectado ? "Volver a conectar" : "Conectar Telegram"}
        </button>
        {conectado && (
          <>
            <button className="btn btn-secundario" disabled={enviando} onClick={() => start(async () => setMensaje(await probarTelegram()))}>Mensaje de prueba</button>
            <button className="btn btn-peligro" disabled={enviando} onClick={() => start(() => desconectarTelegram())}>Desconectar</button>
          </>
        )}
      </div>
      {!conectado && <span className="campo-ayuda">Se abrirá Telegram: pulsa «Iniciar» en el chat del bot y vuelve aquí.</span>}
      {mensaje?.ok && <p className="ok">{mensaje.ok}</p>}
      {mensaje?.error && <p className="error">{mensaje.error}</p>}
    </>
  );
}
