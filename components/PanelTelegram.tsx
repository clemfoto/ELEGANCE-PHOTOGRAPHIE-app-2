import type { AirRecord } from "@/lib/airtable";
import { codigoVinculo, nombreBot } from "@/lib/telegram";
import { AUTOMATIZACIONES } from "@/config/galerias";
import CompartirTexto from "@/components/CompartirTexto";

/**
 * Ficha de Equipo (solo administrador): estado de Telegram de la persona y su enlace personal
 * para conectarlo. Así el team recibe invitaciones y recordatorios sin necesitar acceso a la app.
 */
export default async function PanelTelegram({ r }: { r: AirRecord }) {
  const bot = await nombreBot();
  if (!bot) return null;
  const conectado = Boolean(String(r.fields[AUTOMATIZACIONES.campos.telegramChatId] ?? "").trim());
  const nombre = String(r.fields["Nombre"] ?? "").split(" ")[0];
  const enlace = `https://t.me/${bot}?start=${codigoVinculo(r.id)}`;
  const mensaje = `Hola ${nombre} 👋 Conecta tu Telegram para recibir tus eventos y confirmar tu presencia con un toque:\n\n${enlace}\n\nSe abre Telegram: pulsa «Iniciar» y listo.`;
  return (
    <section className="tarjeta bloque">
      <h2 className="seccion-titulo">Telegram</h2>
      {conectado ? (
        <p>✅ Conectado. Recibe sus invitaciones a eventos y los recordatorios en @{bot}.</p>
      ) : (
        <>
          <p className="muted">
            Sin conectar: no recibirá invitaciones ni recordatorios. Mándale su enlace personal; no necesita acceso a la app.
          </p>
          <div className="acciones-acceso">
            <CompartirTexto texto={mensaje} etiqueta="Enviar enlace de Telegram" />
          </div>
        </>
      )}
    </section>
  );
}
