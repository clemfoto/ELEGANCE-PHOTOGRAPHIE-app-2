import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/auth";
import { navegacion } from "@/lib/esquema";

/** Administrador → panel de inicio; Equipo → su primera sección (Tareas). */
export default async function Raiz() {
  const nav = await navegacion(await requireUsuario());
  redirect(nav.principal[0]?.href ?? "/mas");
}
