import Marca from "@/components/Marca";
import Link from "next/link";
import { Icono } from "@/components/Iconos";
import PanelAutomatizaciones from "@/components/PanelAutomatizaciones";
import { getRegistros } from "@/lib/airtable";
import { requireUsuario } from "@/lib/auth";
import { esAdmin, navegacion } from "@/lib/esquema";
import { chatAdmin, codigoVinculo, nombreBot, telegramConfigurado } from "@/lib/telegram";
import { AUTOMATIZACIONES, EQUIPO } from "@/config/galerias";

export const metadata = { title: "Más" };

export default async function Mas() {
  const u = await requireUsuario();
  const { mas, privado } = await navegacion(u);
  const bot = await nombreBot();
  const yo = (await getRegistros(EQUIPO.tabla)).find((r) => r.id === u.id);
  const conectado = Boolean(String(yo?.fields[AUTOMATIZACIONES.campos.telegramChatId] ?? "").trim());

  return (
    <>
      <header className="cabecera">
        <Marca className="marca-mas" />
        <h1 className="titulo">Más</h1>
      </header>
      {mas.length > 0 && (
        <div className="lista-menu">
          {mas.map((i) => (
            <Link key={i.id} href={i.href} className="menu-item">
              <Icono id={i.id} />
              <span>{i.titulo}</span>
              <span className="flecha" aria-hidden>›</span>
            </Link>
          ))}
        </div>
      )}

      {privado.length > 0 && (
        <>
          <h2 className="seccion-titulo menu-grupo">🔒 Privado</h2>
          <p className="muted menu-grupo-ayuda">Solo lo ves tú.</p>
          <div className="lista-menu">
            {privado.map((i) => (
              <Link key={i.id} href={i.href} className="menu-item">
                <Icono id={i.id} />
                <span>{i.titulo}</span>
                <span className="flecha" aria-hidden>›</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <section className="tarjeta bloque">
        <h2 className="seccion-titulo">Telegram</h2>
        {!bot ? (
          <p className="muted">El bot de Telegram aún no está configurado.</p>
        ) : conectado ? (
          <p>✅ Tu Telegram está conectado. Recibirás tus eventos y recordatorios en @{bot}.</p>
        ) : (
          <>
            <p className="muted">Conéctalo para recibir tus eventos, confirmar tu presencia y los recordatorios de entrega.</p>
            <a className="btn btn-primario btn-bloque" href={`https://t.me/${bot}?start=${codigoVinculo(u.id)}`} target="_blank" rel="noopener noreferrer">
              Conectar Telegram
            </a>
            <span className="campo-ayuda">Se abrirá Telegram: pulsa «Iniciar» y listo.</span>
          </>
        )}
      </section>

      {esAdmin(u) && (
        <section className="tarjeta bloque">
          <h2 className="seccion-titulo">Automatizaciones</h2>
          {!telegramConfigurado() ? (
            <p className="muted">Falta la variable TELEGRAM_BOT_TOKEN en Netlify.</p>
          ) : (
            <>
              {!chatAdmin() && <p className="error">Falta TELEGRAM_ADMIN_CHAT_ID: los avisos a administradores no se enviarán.</p>}
              <PanelAutomatizaciones />
            </>
          )}
        </section>
      )}

      <div className="tarjeta perfil">
        <div>
          <strong>{u.nombre}</strong>
          <p className="muted">{u.email} · {u.rol}</p>
        </div>
        <form action="/auth/salir" method="post">
          <button className="btn btn-secundario">Cerrar sesión</button>
        </form>
      </div>
    </>
  );
}
