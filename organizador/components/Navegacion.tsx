"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP, NEGOCIOS } from "@/config/negocios";
import { salir } from "@/app/acciones";
import { Icono } from "./Iconos";

const GENERALES = [
  { id: "hoy", titulo: "Hoy", href: "/" },
  { id: "calendario", titulo: "Calendario", href: "/calendario" },
  { id: "dinero", titulo: "Dinero", href: "/dinero" },
];

export default function Navegacion() {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(href + "/"));

  return (
    <>
      <aside className="lateral">
        <div className="lateral-marca">{APP.nombre}</div>
        <nav>
          {GENERALES.map((i) => (
            <Link key={i.id} href={i.href} className={`lateral-item ${activo(i.href) ? "activo" : ""}`}>
              <Icono id={i.id} tam={20} />
              {i.titulo}
            </Link>
          ))}
          <div className="lateral-sep" />
          {NEGOCIOS.map((n) => (
            <Link key={n.id} href={`/n/${n.id}`} className={`lateral-item ${activo(`/n/${n.id}`) ? "activo" : ""}`}>
              <span className="insignia" style={{ background: n.color }}>{n.inicial}</span>
              {n.nombre}
            </Link>
          ))}
          <div className="lateral-sep" />
          <Link href="/ajustes" className={`lateral-item ${activo("/ajustes") ? "activo" : ""}`}>
            <Icono id="ajustes" tam={20} />
            Ajustes
          </Link>
        </nav>
        <form action={salir} className="lateral-pie">
          <button className="lateral-salir">Salir</button>
        </form>
      </aside>

      <nav className="inferior" aria-label="Navegación principal">
        <Link href="/" className={`inferior-item ${activo("/") ? "activo" : ""}`}>
          <Icono id="hoy" />
          <span>Hoy</span>
        </Link>
        {NEGOCIOS.map((n) => (
          <Link key={n.id} href={`/n/${n.id}`} className={`inferior-item ${activo(`/n/${n.id}`) ? "activo" : ""}`} style={activo(`/n/${n.id}`) ? { color: n.color } : undefined}>
            <span className="insignia" style={{ background: n.color }}>{n.inicial}</span>
            <span>{n.corto}</span>
          </Link>
        ))}
        <Link href="/calendario" className={`inferior-item ${activo("/calendario") ? "activo" : ""}`}>
          <Icono id="calendario" />
          <span>Calendario</span>
        </Link>
        <Link href="/dinero" className={`inferior-item ${activo("/dinero") ? "activo" : ""}`}>
          <Icono id="dinero" />
          <span>Dinero</span>
        </Link>
      </nav>
    </>
  );
}
