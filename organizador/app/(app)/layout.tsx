import Navegacion from "@/components/Navegacion";
import Recordador from "@/components/Recordador";
import { proximosAvisos } from "@/lib/recordatorios";
import { requireSesion } from "@/lib/sesion";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  await requireSesion();
  const avisos = await proximosAvisos(24);
  return (
    <div className="app">
      <Navegacion />
      <main className="contenido">{children}</main>
      <Recordador avisos={avisos} />
    </div>
  );
}
