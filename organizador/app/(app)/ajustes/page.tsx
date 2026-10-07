import type { Metadata } from "next";
import { salir } from "@/app/acciones";
import { leerAjustes } from "@/lib/datos";
import { telegramConfigurado } from "@/lib/telegram";
import PanelTelegram from "@/components/PanelTelegram";
import AvisosDispositivo from "@/components/AvisosDispositivo";

export const metadata: Metadata = { title: "Ajustes" };

export default async function Ajustes() {
  const a = await leerAjustes();
  return (
    <>
      <header className="cabecera">
        <h1 className="titulo">Ajustes</h1>
      </header>

      <section className="tarjeta bloque">
        <h2 className="seccion-titulo">Recordatorios por Telegram</h2>
        <PanelTelegram conectado={Boolean(a.telegramChatId)} nombre={a.telegramNombre} configurado={telegramConfigurado()} />
      </section>

      <section className="tarjeta bloque">
        <h2 className="seccion-titulo">Avisos en el móvil</h2>
        <p className="muted">Notificaciones del propio teléfono mientras la app está abierta. Para avisos con la app cerrada, usa Telegram.</p>
        <AvisosDispositivo />
      </section>

      <section className="tarjeta bloque">
        <h2 className="seccion-titulo">Instalar en el móvil</h2>
        <p className="muted">iPhone: Safari → Compartir → «Añadir a pantalla de inicio». Android: menú de Chrome → «Instalar app».</p>
      </section>

      <form action={salir}>
        <button className="btn btn-peligro btn-bloque">Cerrar sesión</button>
      </form>
    </>
  );
}
