"use client";
import Marca from "@/components/Marca";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono } from "./Iconos";

type Item = { id: string; titulo: string; href: string };

export default function Navegacion({
  principal,
  mas,
  privado,
  usuario,
}: {
  principal: Item[];
  mas: Item[];
  /** Apartado privado del dueño (vacío para los demás). */
  privado: Item[];
  usuario: { nombre: string; rol: string };
}) {
  const ruta = usePathname();
  const activo = (href: string) => ruta === href || ruta.startsWith(href + "/");
  const enMas = ruta === "/mas" || [...mas, ...privado].some((i) => activo(i.href));

  return (
    <>
      <aside className="lateral">
        <Marca className="lateral-marca" claro />
        <nav>
          {[...principal, ...mas].map((i) => (
            <Link key={i.id} href={i.href} className={`lateral-item ${activo(i.href) ? "activo" : ""}`}>
              <Icono id={i.id} tam={20} />
              {i.titulo}
            </Link>
          ))}
          {privado.length > 0 && <span className="lateral-grupo">Privado</span>}
          {privado.map((i) => (
            <Link key={i.id} href={i.href} className={`lateral-item ${activo(i.href) ? "activo" : ""}`}>
              <Icono id={i.id} tam={20} />
              {i.titulo}
            </Link>
          ))}
        </nav>
        <div className="lateral-pie">
          <div className="lateral-usuario">
            {usuario.nombre}
            <small>{usuario.rol}</small>
          </div>
          <form action="/auth/salir" method="post">
            <button className="lateral-salir">Salir</button>
          </form>
        </div>
      </aside>

      <nav className="inferior" aria-label="Navegación principal">
        {principal.map((i) => (
          <Link key={i.id} href={i.href} className={`inferior-item ${activo(i.href) ? "activo" : ""}`}>
            <Icono id={i.id} />
            <span>{i.titulo}</span>
          </Link>
        ))}
        <Link href="/mas" className={`inferior-item ${enMas ? "activo" : ""}`}>
          <Icono id="mas" />
          <span>Más</span>
        </Link>
      </nav>
    </>
  );
}
