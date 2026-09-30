import { MARCA } from "@/config/galerias";

/** Logo de la marca, o su nombre en texto si todavía no hay logo. `claro` = para fondos oscuros. */
export default function Marca({ className, claro }: { className?: string; claro?: boolean }) {
  if (MARCA.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={className} src={claro ? MARCA.logo.claro : MARCA.logo.oscuro} alt={MARCA.nombre} width={MARCA.logo.ancho} height={MARCA.logo.alto} />
    );
  }
  const [primera, ...resto] = MARCA.nombre.split(" ");
  return (
    <span className={`${className ?? ""} marca-texto ${claro ? "claro" : ""}`} aria-label={MARCA.nombre}>
      <span className="marca-texto-1">{primera}</span>
      {resto.length > 0 && <span className="marca-texto-2">{resto.join(" ")}</span>}
    </span>
  );
}
