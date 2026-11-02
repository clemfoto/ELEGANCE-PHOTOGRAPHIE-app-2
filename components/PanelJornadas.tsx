import { leerJornadas } from "@/lib/jornadas";
import FormJornadas from "@/components/FormJornadas";

/** Ficha de cliente (solo administrador): días del servicio y horario de cada día. */
export default async function PanelJornadas({ id }: { id: string }) {
  const j = await leerJornadas(id);
  if (!j) return null;
  return (
    <section className="tarjeta bloque">
      <h2 className="seccion-titulo">Días y horarios</h2>
      <FormJornadas id={id} inicial={j.jornadas} />
    </section>
  );
}
