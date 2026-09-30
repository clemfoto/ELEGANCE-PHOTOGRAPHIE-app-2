"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { guardarRegistro, type EstadoForm } from "@/app/(app)/t/acciones";
import type { CampoForm } from "@/lib/formulario";
import SelectorEnlace from "./SelectorEnlace";

export default function Formulario({
  tabla,
  registro,
  campos,
  volver,
}: {
  tabla: string;
  registro: string | null;
  campos: CampoForm[];
  volver: string;
}) {
  const [estado, accion, guardando] = useActionState<EstadoForm, FormData>(
    guardarRegistro.bind(null, tabla, registro),
    {},
  );
  return (
    <form action={accion} className="form">
      {campos.map((c) => (
        <Campo key={c.id} c={c} />
      ))}
      {estado.error && <p className="error">{estado.error}</p>}
      <div className="form-acciones">
        <Link href={volver} className="btn btn-secundario">
          Cancelar
        </Link>
        <button className="btn btn-primario" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function Campo({ c }: { c: CampoForm }) {
  const nombre = `f:${c.id}`;
  const presencia = <input type="hidden" name={`p:${c.id}`} value="1" />;
  const ayuda = c.descripcion ? <span className="campo-ayuda">{c.descripcion}</span> : null;

  if (c.tipo === "checkbox") {
    return (
      <label className="campo campo-check">
        {presencia}
        <span className="campo-label">{c.nombre}</span>
        <input type="checkbox" name={nombre} defaultChecked={c.valor === true} className="interruptor" />
        {ayuda}
      </label>
    );
  }

  if (c.tipo === "multipleSelects") {
    return (
      <fieldset className="campo">
        {presencia}
        <legend className="campo-label">{c.nombre}</legend>
        <div className="opciones">
          {c.opciones!.map((o) => (
            <label key={o} className="opcion">
              <input type="checkbox" name={nombre} value={o} defaultChecked={(c.valor as string[]).includes(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
        {ayuda}
      </fieldset>
    );
  }

  if (c.tipo === "multipleRecordLinks") {
    return (
      <div className="campo">
        {presencia}
        <span className="campo-label">{c.nombre}</span>
        <SelectorEnlace nombre={nombre} tabla={c.tablaEnlazada!} unico={c.unico} inicial={c.seleccion ?? []} titulo={c.nombre} />
        {ayuda}
      </div>
    );
  }

  let control: React.ReactNode;
  const valor = String(c.valor ?? "");
  switch (c.tipo) {
    case "multilineText":
    case "richText":
      control = <TextoLargo nombre={nombre} valor={valor} />;
      break;
    case "singleSelect":
      control = (
        <select name={nombre} defaultValue={valor} className="input">
          <option value="">—</option>
          {c.opciones!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;
    case "number":
    case "currency":
    case "percent":
    case "rating":
    case "duration":
      control = (
        <div className="input-grupo">
          {c.simbolo && <span className="input-prefijo">{c.simbolo}</span>}
          <input className="input" type="number" step="any" inputMode="decimal" name={nombre} defaultValue={valor} />
          {c.tipo === "percent" && <span className="input-sufijo">%</span>}
        </div>
      );
      break;
    case "date":
      control = <input className="input" type="date" name={nombre} defaultValue={valor} />;
      break;
    case "dateTime":
      control = <input className="input" type="datetime-local" name={nombre} defaultValue={valor} />;
      break;
    default: {
      const tipos: Record<string, string> = { email: "email", url: "url", phoneNumber: "tel" };
      control = (
        <input
          className="input"
          type={tipos[c.tipo] ?? "text"}
          inputMode={c.tipo === "phoneNumber" ? "tel" : c.tipo === "email" ? "email" : undefined}
          name={nombre}
          defaultValue={valor}
          autoComplete="off"
        />
      );
    }
  }
  return (
    <label className="campo">
      {presencia}
      <span className="campo-label">{c.nombre}</span>
      {control}
      {ayuda}
    </label>
  );
}

/** Textarea que crece con el contenido. */
function TextoLargo({ nombre, valor }: { nombre: string; valor: string }) {
  const [filas, setFilas] = useState(Math.min(12, Math.max(3, valor.split("\n").length + 1)));
  return (
    <textarea
      className="input"
      name={nombre}
      defaultValue={valor}
      rows={filas}
      onInput={(e) => setFilas(Math.min(12, Math.max(3, e.currentTarget.value.split("\n").length + 1)))}
    />
  );
}
