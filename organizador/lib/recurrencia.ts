import type { Ocurrencia, Repeticion, Tarea } from "./tipos";
import { diaSemana, diasDelMes, diasEntre, inicioSemana, sumarDias } from "./fechas";

/** ¿La tarea cae en `dia`? (sin mirar si está hecha) */
export function ocurreEl(t: Tarea, dia: string): boolean {
  if (dia < t.fecha) return false;
  const r = t.repetir;
  if (r.hasta && dia > r.hasta) return false;
  if (t.excepciones.includes(dia)) return false;
  const cada = Math.max(1, r.cada || 1);
  switch (r.tipo) {
    case "nunca":
      return dia === t.fecha;
    case "diaria":
      return diasEntre(t.fecha, dia) % cada === 0;
    case "semanal": {
      const dias = r.dias?.length ? r.dias : [diaSemana(t.fecha)];
      if (!dias.includes(diaSemana(dia))) return false;
      const semanas = diasEntre(inicioSemana(t.fecha), inicioSemana(dia)) / 7;
      return semanas % cada === 0;
    }
    case "mensual": {
      const [a0, m0, d0] = t.fecha.split("-").map(Number);
      const [a, m, d] = dia.split("-").map(Number);
      const meses = (a - a0) * 12 + (m - m0);
      if (meses % cada !== 0) return false;
      // Si el mes no tiene ese día (p. ej. 31), se usa el último.
      return d === Math.min(d0, diasDelMes(dia.slice(0, 7)));
    }
    case "anual": {
      const [a0, m0, d0] = t.fecha.split("-").map(Number);
      const [a, m, d] = dia.split("-").map(Number);
      if ((a - a0) % cada !== 0 || m !== m0) return false;
      return d === Math.min(d0, diasDelMes(dia.slice(0, 7)));
    }
  }
}

/** Ocurrencias de varias tareas entre `desde` y `hasta` (incluidos), ordenadas por día y hora. */
export function ocurrencias(tareas: Tarea[], desde: string, hasta: string): Ocurrencia[] {
  const res: Ocurrencia[] = [];
  for (const t of tareas) {
    if (t.repetir.tipo === "nunca") {
      if (t.fecha >= desde && t.fecha <= hasta && ocurreEl(t, t.fecha)) res.push({ tarea: t, fecha: t.fecha, hecha: t.hechas.includes(t.fecha) });
      continue;
    }
    const inicio = t.fecha > desde ? t.fecha : desde;
    const fin = t.repetir.hasta && t.repetir.hasta < hasta ? t.repetir.hasta : hasta;
    for (let d = inicio; d <= fin; d = sumarDias(d, 1)) {
      if (ocurreEl(t, d)) res.push({ tarea: t, fecha: d, hecha: t.hechas.includes(d) });
    }
  }
  return ordenar(res);
}

export const ordenar = (os: Ocurrencia[]) =>
  os.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.tarea.hora ?? "").localeCompare(b.tarea.hora ?? "") || a.tarea.titulo.localeCompare(b.tarea.titulo));

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Texto corto: "Cada día", "Lun, mié y vie", "Cada 2 semanas (lun)", "Cada mes, día 15"… */
export function describirRepeticion(r: Repeticion, fecha: string): string {
  const cada = Math.max(1, r.cada || 1);
  let s = "";
  switch (r.tipo) {
    case "nunca":
      return "";
    case "diaria":
      s = cada === 1 ? "Cada día" : `Cada ${cada} días`;
      break;
    case "semanal": {
      const dias = (r.dias?.length ? r.dias : [diaSemana(fecha)]).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
      const nombres = dias.length === 5 && !dias.includes(0) && !dias.includes(6) ? "lun a vie" : dias.length === 7 ? "todos los días" : dias.map((d) => DIAS_CORTOS[d]).join(", ");
      s = cada === 1 ? `Cada semana (${nombres})` : `Cada ${cada} semanas (${nombres})`;
      break;
    }
    case "mensual":
      s = `${cada === 1 ? "Cada mes" : `Cada ${cada} meses`}, día ${Number(fecha.slice(8))}`;
      break;
    case "anual":
      s = cada === 1 ? "Cada año" : `Cada ${cada} años`;
      break;
  }
  return r.hasta ? `${s} · hasta ${r.hasta.split("-").reverse().join("/")}` : s;
}
