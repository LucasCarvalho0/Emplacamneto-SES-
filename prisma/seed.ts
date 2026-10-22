import { PrismaClient } from "@prisma/client";
import { hashPassword, passwordProblem } from "../src/lib/auth/password";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Administrador";
  if (!email || !password) throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env");
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);

  const existing = await db.user.findUnique({ where: { email } });
  const passwordHash = await hashPassword(password);

  if (existing) {
    await db.user.update({
      where: { email },
      data: { passwordHash, name, role: "ADMIN", active: true, mustChangePassword: false },
    });
    console.log(`Administrador atualizado com sucesso: ${email}`);
    return;
  }

  await db.user.create({
    data: { role: "ADMIN", name, email, passwordHash, mustChangePassword: false },
  });
  console.log(`Administrador criado: ${email}`);
}

main().finally(() => db.$disconnect());
