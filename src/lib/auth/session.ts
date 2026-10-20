import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "../db";

export const SESSION_COOKIE = "ecc_session";
const TTL_MS: Record<Role, number> = { ADMIN: 8 * 3600_000, OPERATOR: 12 * 3600_000 };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface SessionUser {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  matricula: string | null;
  mustChangePassword: boolean;
}

export async function createSession(user: { id: string; role: Role }, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS[user.role]);
  await db.session.create({
    data: { id: hashToken(token), userId: user.id, expiresAt, userAgent: userAgent?.slice(0, 300) },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  // limpeza oportunista de sessões vencidas
  void db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
}

/** Sempre consulta o banco: perfil e situação da conta nunca vêm do navegador. */
export const getSession = cache(async (): Promise<{ sessionId: string; user: SessionUser } | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  const u = session.user;
  return {
    sessionId: session.id,
    user: {
      id: u.id,
      role: u.role,
      name: u.name,
      email: u.email,
      matricula: u.matricula,
      mustChangePassword: u.mustChangePassword,
    },
  };
});

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyUserSessions(userId: string, exceptSessionId?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}
