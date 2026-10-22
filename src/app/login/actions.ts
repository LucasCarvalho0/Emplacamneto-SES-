"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate } from "@/lib/auth/login";

export interface LoginState {
  error?: string;
}

const schema = z.object({
  identifier: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ identifier: formData.get("identifier"), password: formData.get("password") });
  if (!parsed.success) return { error: "Preencha todos os campos." };

  const { identifier, password } = parsed.data;

  // E-mail → administrativo; qualquer outra coisa → operador (matrícula)
  const isEmail = identifier.includes("@");
  const role = isEmail ? "ADMIN" : "OPERATOR";

  try {
    const result = await authenticate(role, identifier, password);
    if (!result.ok) return { error: result.message };
    redirect(result.mustChangePassword ? "/trocar-senha" : role === "ADMIN" ? "/admin" : "/operador");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Erro durante login:", err);
    return { error: "Erro de autenticação no servidor. Verifique os dados ou tente novamente." };
  }
}
