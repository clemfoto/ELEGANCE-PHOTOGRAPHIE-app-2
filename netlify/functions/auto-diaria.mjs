// Tarea programada de Netlify: llama a la app para ejecutar las automatizaciones "diaria".
// Horario en UTC (0 15 * * *). 15:00 UTC = 9:00 en Ciudad de México.
import { createHmac } from "node:crypto";

export default async () => {
  const base = process.env.URL || process.env.APP_URL;
  const secreto = createHmac("sha256", process.env.AUTH_SECRET ?? "").update("cron").digest("base64url").slice(0, 40);
  const res = await fetch(`${base}/api/automatizaciones?tarea=diaria`, {
    method: "POST",
    headers: { "x-cron-secret": secreto },
  });
  console.log("diaria", res.status, await res.text());
};

export const config = { schedule: "0 15 * * *" };
