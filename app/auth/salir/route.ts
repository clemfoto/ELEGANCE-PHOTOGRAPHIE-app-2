import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/token";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete(COOKIE_SESION);
  return res;
}
