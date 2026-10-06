import { PRIVADO, TABLAS } from "@/config/galerias";

const P: Record<string, string> = {
  [TABLAS.clientes]: "M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15 5.13a3 3 0 0 1 0 5.74",
  [TABLAS.tareas]: "M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9",
  [TABLAS.entrega]: "M4 7l8-4 8 4v10l-8 4-8-4V7ZM4 7l8 4 8-4M12 11v10",
  [TABLAS.leads]: "M3 12h4l3 7 4-14 3 7h4",
  [TABLAS.contabilidad]: "M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 1.5 2.6 4.5 3.3 4.5 1.7 4.5 3.5-2 3.2-4.5 3.2-4.5-1.4-4.5-3.2",
  [TABLAS.gastos]: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6",
  [TABLAS.equipo]: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  [PRIVADO.calendario.tabla]: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M12 14v3",
  [PRIVADO.gastos.tabla]: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6",
  inicio: "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9Z",
  calendario: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  mas: "M5 12h.01M12 12h.01M19 12h.01",
  tabla: "M4 5h16v14H4zM4 10h16M10 10v9",
};

export function Icono({ id, tam = 24 }: { id: string; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={id === "mas" ? 3.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[id] ?? P.tabla} />
    </svg>
  );
}
