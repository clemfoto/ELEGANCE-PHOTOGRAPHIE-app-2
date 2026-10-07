import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, tokenValido } from "./token";

/** Para páginas y Server Actions: sin sesión, al login. */
export async function requireSesion(): Promise<void> {
  if (!tokenValido((await cookies()).get(COOKIE)?.value)) redirect("/login");
}
