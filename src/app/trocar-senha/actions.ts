"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { destroyUserSessions, getSession } from "@/lib/auth/session";

export interface PasswordState {
  error?: string;
}

const schema = z.object({
  current: z.string().min(1).max(200),
  next: z.string().max(200),
  confirm: z.string().max(200),
});

export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: "Preencha todos os campos." };
  const { current, next, confirm } = parsed.data;
  if (next !== confirm) return { error: "A confirmação não é igual à nova senha." };
  const problem = passwordProblem(next, session.user.matricula);
  if (problem) return { error: problem };
  if (next === current) return { error: "A nova senha precisa ser diferente da atual." };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !(await verifyPassword(user.passwordHash, current))) return { error: "A senha atual está incorreta." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  await destroyUserSessions(user.id, session.sessionId); // encerra as outras sessões
  await audit("auth.password_changed", { userId: user.id });
  redirect(user.role === "ADMIN" ? "/admin" : "/operador");
}
