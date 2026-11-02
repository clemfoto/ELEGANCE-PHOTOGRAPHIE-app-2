import { NextResponse, type NextRequest } from "next/server";
import { getRegistros } from "@/lib/datos";
import { getUsuario } from "@/lib/auth";
import { campoPrincipal, puedeVerTabla, tablaPorId, textoPrincipal } from "@/lib/esquema";
import { EQUIPO, GALERIAS } from "@/config/galerias";
import { ordenar } from "@/lib/lista";

/** Registros de una tabla (id + nombre) para el selector de campos de enlace. */
export async function GET(req: NextRequest) {
  const u = await getUsuario();
  if (!u) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const t = await tablaPorId(req.nextUrl.searchParams.get("tabla") ?? "");
  if (!t) return NextResponse.json({ error: "Tabla no encontrada" }, { status: 404 });
  // Las personas de Equipo se pueden elegir aunque el rol no vea la tabla Equipo.
  if (t.id !== EQUIPO.tabla && !puedeVerTabla(u, t.id)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const principal = campoPrincipal(t);
  let regs = await getRegistros(t.id);
  if (t.id === EQUIPO.tabla) regs = regs.filter((r) => r.fields[EQUIPO.activo] === true);
  // Los archivados (p. ej. paquetes viejos) ya no se ofrecen; los enlaces que ya existen se conservan.
  const g = GALERIAS[t.id] ?? {};
  if (g.archivado) regs = regs.filter((r) => r.fields[String(g.archivado)] !== true);
  // Con un orden configurado (p. ej. Paquetes en el orden del PDF) se respeta; si no, alfabético.
  const fOrden = g.orden ? t.fields.find((x) => x.name === g.orden!.campo) : undefined;
  const lista = regs.map((r) => ({ id: r.id, nombre: textoPrincipal(r.fields[principal.name]) || "Sin nombre" }));
  const opciones = fOrden
    ? ordenar(regs, fOrden, g.orden!.dir).map((r) => lista.find((x) => x.id === r.id)!)
    : lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return NextResponse.json(opciones, { headers: { "Cache-Control": "private, max-age=30" } });
}
