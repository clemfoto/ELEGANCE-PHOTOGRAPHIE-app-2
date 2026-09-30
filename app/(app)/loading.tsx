export default function Cargando() {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="Cargando">
      <div className="esq esq-titulo" />
      <div className="esq esq-input" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="esq esq-tarjeta" />
      ))}
    </div>
  );
}
