// Tarea programada de Netlify: cada 5 minutos pide a la app que mande los recordatorios que tocan.
import { createHmac } from "node:crypto";

export default async () => {
  const base = process.env.URL || process.env.APP_URL;
  const secreto = createHmac("sha256", process.env.AUTH_SECRET ?? "").update("cron").digest("base64url").slice(0, 40);
  const res = await fetch(`${base}/api/recordatorios`, { method: "POST", headers: { "x-cron-secret": secreto } });
  console.log("recordatorios", res.status, await res.text());
};

export const config = { schedule: "*/5 * * * *" };
