"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guards";
import { generateTempPassword, hashPassword, passwordProblem } from "@/lib/auth/password"; // generateTempPassword mantido para resetPasswordAction
import { destroyUserSessions } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { redistributePending } from "@/lib/services/distribution.service";

export interface OperatorFormState {
  error?: string;
  message?: string;
  tempPassword?: string;
}

const createSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(100),
  matricula: z.string().trim().regex(/^[A-Za-z0-9]{3,20}$/, "A matrícula deve ter de 3 a 20 letras ou números."),
  password: z.string().min(1, "Informe a senha do operador."),
});

export async function createOperatorAction(_prev: OperatorFormState, formData: FormData): Promise<OperatorFormState> {
  const { user } = await requireAdmin();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    matricula: formData.get("matricula"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const matricula = parsed.data.matricula.toUpperCase();

  // Valida a força da senha (mín. 10 caracteres)
  const problem = passwordProblem(parsed.data.password, matricula);
  if (problem) return { error: problem };

  try {
    const created = await db.user.create({
      data: {
        role: "OPERATOR",
        name: parsed.data.name,
        matricula,
        passwordHash: await hashPassword(parsed.data.password),
        mustChangePassword: false,
      },
    });
    await audit("operator.create", { userId: user.id, entity: "User", entityId: created.id, meta: { matricula } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Já existe um operador com essa matrícula." };
    }
    throw error;
  }
  revalidatePath("/admin/operadores");
  return { message: `${parsed.data.name} cadastrado com sucesso. Matrícula: ${matricula}.` };
}

export async function resetPasswordAction(_prev: OperatorFormState, formData: FormData): Promise<OperatorFormState> {
  const { user } = await requireAdmin();
  const id = String(formData.get("userId") ?? "");
  const customPassword = String(formData.get("password") ?? "").trim();
  const target = await db.user.findFirst({ where: { id, role: "OPERATOR" } });
  if (!target) return { error: "Operador não encontrado." };

  if (customPassword) {
    const problem = passwordProblem(customPassword, target.matricula);
    if (problem) return { error: problem };
    await db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(customPassword), mustChangePassword: false },
    });
    await destroyUserSessions(id);
    await audit("operator.reset_password", { userId: user.id, entity: "User", entityId: id, meta: { custom: true } });
    revalidatePath("/admin/operadores");
    return { message: `Senha alterada com sucesso para ${target.name}.` };
  }

  const tempPassword = generateTempPassword();
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true } });
  await destroyUserSessions(id);
  await audit("operator.reset_password", { userId: user.id, entity: "User", entityId: id });
  revalidatePath("/admin/operadores");
  return { message: `Nova senha temporária para ${target.name}.`, tempPassword };
}

export async function toggleActiveAction(formData: FormData) {
  const { user } = await requireAdmin();
  const id = String(formData.get("userId") ?? "");
  const target = await db.user.findFirst({ where: { id, role: "OPERATOR" } });
  if (!target) redirect("/admin/operadores?err=Operador+não+encontrado.");

  const active = !target.active;
  await db.user.update({ where: { id }, data: { active } });
  if (!active) await destroyUserSessions(id); // o histórico é mantido; só o acesso é encerrado
  await audit(active ? "operator.activate" : "operator.deactivate", { userId: user.id, entity: "User", entityId: id });
  revalidatePath("/admin/operadores");
  redirect(`/admin/operadores?${new URLSearchParams({ ok: `${target.name} ${active ? "reativado" : "desativado"}.` })}`);
}

export async function redistributeAction(formData: FormData) {
  const { user } = await requireAdmin();
  let message = "";
  try {
    const r = await redistributePending(String(formData.get("fromId") ?? ""), String(formData.get("toId") ?? ""), user.id);
    message = `${r.count} veículo(s) passados para ${r.targetName}.`;
  } catch (error) {
    if (error instanceof DomainError) redirect(`/admin/operadores?${new URLSearchParams({ err: error.message })}`);
    throw error;
  }
  revalidatePath("/admin/operadores");
  redirect(`/admin/operadores?${new URLSearchParams({ ok: message })}`);
}
