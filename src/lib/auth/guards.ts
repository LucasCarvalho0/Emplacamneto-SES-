import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSession, type SessionUser } from "./session";

const homeOf = (role: Role) => (role === "ADMIN" ? "/admin" : "/operador");

export async function requireUser(role?: Role) {
  const session = await getSession();
  if (!session) redirect(role === "OPERATOR" ? "/operador/login" : "/login");
  if (role && session.user.role !== role) redirect(homeOf(session.user.role));
  return session;
}

export async function requireAdmin() {
  const session = await requireUser("ADMIN");
  if (session.user.mustChangePassword) redirect("/trocar-senha");
  return session;
}

export async function requireOperator() {
  const session = await requireUser("OPERATOR");
  if (session.user.mustChangePassword) redirect("/trocar-senha");
  return session;
}

type ApiAuth = { ok: true; user: SessionUser } | { ok: false; response: Response };

const json = (status: number, message: string) =>
  Response.json({ ok: false, message }, { status });

/** Autenticação para Route Handlers: sessão no servidor, perfil exato e checagem de origem. */
export async function apiAuth(req: Request, role: Role): Promise<ApiAuth> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return { ok: false, response: json(403, "Origem da requisição não permitida.") };
    }
  }
  const session = await getSession();
  if (!session) return { ok: false, response: json(401, "Sessão expirada. Entre novamente.") };
  if (session.user.role !== role) return { ok: false, response: json(403, "Sem permissão.") };
  if (session.user.mustChangePassword) {
    return { ok: false, response: json(403, "Troque a senha antes de continuar.") };
  }
  return { ok: true, user: session.user };
}
