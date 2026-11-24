/**
 * Un día del servicio: horario de fotografía (fecha, inicio, fin) y de videografía
 * (videoFecha, videoInicio, videoFin; vacíos si el video va con la fotografía).
 * Sin "server-only": lo usa también el formulario.
 */
export type Jornada = {
  fecha: string;
  inicio: string;
  fin: string;
  videoFecha: string;
  videoInicio: string;
  videoFin: string;
};

/** "15:00–23:00" (o solo la que haya). */
export const horario = (j: { inicio: string; fin: string }) =>
  j.inicio && j.fin ? `${j.inicio}–${j.fin}` : j.inicio ? `desde ${j.inicio}` : j.fin ? `hasta ${j.fin}` : "";

/** Horario de videografía del día ("" si no tiene). */
export const horarioVideo = (j: Jornada) => horario({ inicio: j.videoInicio, fin: j.videoFin });

/** true si el día tiene datos de videografía aparte. */
export const tieneVideo = (j: Jornada) => Boolean(j.videoFecha || j.videoInicio || j.videoFin);
