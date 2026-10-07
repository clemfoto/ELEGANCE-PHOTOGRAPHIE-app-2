import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, tokenValido } from "@/lib/token";

/** Sin sesión válida, cualquier página lleva a /login. */
export function proxy(req: NextRequest) {
  if (tokenValido(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!login|_next/|icons/|api/recordatorios|api/telegram|manifest.webmanifest|sw.js|favicon.ico|apple-icon|icon).*)"],
};
