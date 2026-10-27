import { NextResponse, type NextRequest } from "next/server";
import { getUsuario } from "@/lib/auth";
import { esAdmin } from "@/lib/esquema";
import { leerPagos } from "@/lib/pagos";
import { pdfContrato } from "@/lib/tugirosuite";

/** PDF del contrato o del invoice de un cliente, para revisarlo antes de enviarlo (solo administradores). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUsuario();
  if (!u) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!esAdmin(u)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const p = await leerPagos((await params).id);
  if (!p?.contrato) return NextResponse.json({ error: "Este cliente no tiene contrato" }, { status: 404 });
  try {
    const r = await pdfContrato(p.contrato, req.nextUrl.searchParams.get("doc") ?? "");
    return new Response(r.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": r.headers.get("content-disposition") ?? "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
