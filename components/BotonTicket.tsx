import SubirArchivo from "./SubirArchivo";

/** "Foto del ticket": crea el gasto con la foto, hoy y quién paga; luego abre el formulario. */
export default function BotonTicket({ tabla, campo }: { tabla: string; campo: string }) {
  return <SubirArchivo tabla={tabla} campo={campo} etiqueta="Foto del ticket" destacado camara />;
}
