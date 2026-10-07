import { NextResponse, type NextRequest } from "next/server";
import { revisarRecordatorios } from "@/lib/recordatorios";
import { iguales, secretoCron } from "@/lib/token";

/** La llama la tarea programada de Netlify (netlify/functions/recordatorios.mjs). */
export async function POST(req: NextRequest) {
  if (!iguales(req.headers.get("x-cron-secret") ?? "", secretoCron())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await revisarRecordatorios());
}
