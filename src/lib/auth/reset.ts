import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";
import { audit } from "../audit";
import { sendMail } from "../mail";
import { DomainError } from "../errors";
import { hashPassword, passwordProblem } from "./password";
import { destroyUserSessions } from "./session";

const TTL_MS = 30 * 60_000;
const MAX_REQUESTS_PER_HOUR = 3;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Só administradores têm e-mail. A resposta ao usuário é sempre a mesma, exista a conta ou não,
 * para não revelar quais e-mails estão cadastrados. Operadores pedem a redefinição ao administrativo.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const user = await db.user.findFirst({ where: { email, role: "ADMIN", active: true } });
  if (!user) return;

  const recent = await db.passwordReset.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= MAX_REQUESTS_PER_HOUR) return;

  const token = randomBytes(32).toString("base64url");
  await db.passwordReset.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_MS) } });
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  await sendMail(
    email,
    "Redefinição de senha — Emplacamento SESÉ",
    `Recebemos um pedido para redefinir sua senha.\n\nUse este link nos próximos 30 minutos:\n${base}/redefinir-senha/${token}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.`,
  );
  await audit("auth.reset_requested", { userId: user.id });
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  const r = await db.passwordReset.findUnique({ where: { tokenHash: hash(token) } });
  return !!r && !r.usedAt && r.expiresAt > new Date();
}

export async function completePasswordReset(token: string, newPassword: string): Promise<void> {
  const problem = passwordProblem(newPassword);
  if (problem) throw new DomainError(problem);
  const record = await db.passwordReset.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.active) {
    throw new DomainError("Este link venceu ou já foi usado. Peça um novo.");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async (tx) => {
    // updateMany condicional: se dois cliques chegarem juntos, só um consome o token.
    const used = await tx.passwordReset.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) throw new DomainError("Este link já foi usado.");
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash, mustChangePassword: false } });
    await tx.loginAttempt.deleteMany({ where: { identifier: `ADMIN:${record.user.email}` } });
  });
  await destroyUserSessions(record.userId);
  await audit("auth.reset_completed", { userId: record.userId });
}
