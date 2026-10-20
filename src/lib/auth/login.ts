import { headers } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "../db";
import { audit } from "../audit";
import { verifyPassword } from "./password";
import { createSession } from "./session";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILS_PER_ACCOUNT = 5;
const MAX_FAILS_PER_IP = 30;

type Result = { ok: true; mustChangePassword: boolean } | { ok: false; message: string };

const GENERIC = "Credenciais inválidas.";

export async function authenticate(role: Role, rawIdentifier: string, password: string): Promise<Result> {
  const identifier = role === "ADMIN" ? rawIdentifier.trim().toLowerCase() : rawIdentifier.trim().toUpperCase();
  const key = `${role}:${identifier}`;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const since = new Date(Date.now() - WINDOW_MS);

  const [accountFails, ipFails] = await Promise.all([
    db.loginAttempt.count({ where: { identifier: key, success: false, createdAt: { gte: since } } }),
    ip ? db.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }) : Promise.resolve(0),
  ]);
  if (accountFails >= MAX_FAILS_PER_ACCOUNT || ipFails >= MAX_FAILS_PER_IP) {
    await audit("auth.blocked", { meta: { role, identifier } });
    return { ok: false, message: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };
  }

  const user = await db.user.findFirst({
    where: role === "ADMIN" ? { email: identifier, role } : { matricula: identifier, role },
  });
  const passwordOk = await verifyPassword(user?.passwordHash ?? null, password);

  if (!user || !user.active || !passwordOk) {
    await db.loginAttempt.create({ data: { identifier: key, ip, success: false } });
    await audit("auth.failed", { userId: user?.id, meta: { role, identifier } });
    return { ok: false, message: GENERIC }; // mesma mensagem para conta inexistente, inativa ou senha errada
  }

  await db.loginAttempt.deleteMany({ where: { identifier: key, success: false } });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user, h.get("user-agent"));
  await audit("auth.login", { userId: user.id });
  return { ok: true, mustChangePassword: user.mustChangePassword };
}
