"use server";
import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export async function logoutAction() {
  const session = await getSession();
  await destroySession();
  if (session) await audit("auth.logout", { userId: session.user.id });
  redirect(session?.user.role === "OPERATOR" ? "/operador/login" : "/login");
}
