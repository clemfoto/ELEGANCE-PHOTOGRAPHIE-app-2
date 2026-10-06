import Navegacion from "@/components/Navegacion";
import { requireUsuario } from "@/lib/auth";
import { navegacion } from "@/lib/esquema";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUsuario();
  const nav = await navegacion(u);
  return (
    <div className="app">
      <Navegacion principal={nav.principal} mas={nav.mas} privado={nav.privado} usuario={{ nombre: u.nombre, rol: u.rol }} />
      <main className="contenido">{children}</main>
    </div>
  );
}
