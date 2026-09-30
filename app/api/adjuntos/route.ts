import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { crearRegistro, subirAdjunto, tagTabla } from "@/lib/airtable";
import { getUsuario } from "@/lib/auth";
import { campo, campoVisible, puedeVerTabla, rutaTabla, tablaPorId } from "@/lib/esquema";
import { hoyISO } from "@/lib/formato";
import { GALERIAS, TABLAS } from "@/config/galerias";

const MAX_BYTES = 5 * 1024 * 1024; // límite de la API de subida de Airtable

/**
 * Sube un archivo a un campo de adjuntos.
 * Sin `registro`, crea antes un registro nuevo (flujo "Foto del ticket" de Gastos).
 */
export async function POST(req: NextRequest) {
  const u = await getUsuario();
  if (!u) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const form = await req.formData();
  const t = await tablaPorId(String(form.get("tabla") ?? ""));
  if (!t || !puedeVerTabla(u, t.id)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const f = t.fields.find((x) => x.id === form.get("campo"));
  if (!f || f.type !== "multipleAttachments" || !campoVisible(u, f, t)) {
    return NextResponse.json({ error: "Campo no válido" }, { status: 400 });
  }
  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo pasa de 5 MB." }, { status: 413 });
  }

  let registro = String(form.get("registro") ?? "");
  try {
    if (!registro) {
      const inicial: Record<string, unknown> = {};
      if (t.id === TABLAS.gastos) {
        const g = GALERIAS[TABLAS.gastos];
        if (campo(t, g.fecha)) inicial[String(g.fecha)] = hoyISO();
        if (campo(t, g.pagador)) inicial[String(g.pagador)] = [u.id];
      }
      registro = (await crearRegistro(t.id, inicial)).id;
    }
    await subirAdjunto(registro, f.id, {
      contentType: archivo.type || "application/octet-stream",
      filename: archivo.name || "archivo",
      base64: Buffer.from(await archivo.arrayBuffer()).toString("base64"),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, registro: registro || undefined }, { status: 502 });
  }

  revalidateTag(tagTabla(t.id), { expire: 0 });
  for (const x of t.fields) if (x.options?.linkedTableId) revalidateTag(tagTabla(x.options.linkedTableId), { expire: 0 });
  return NextResponse.json({ registro, url: `${rutaTabla(t)}/${registro}` });
}
