"use server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/reset";

export interface ForgotState {
  sent?: boolean;
  error?: string;
}

export async function forgotAction(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = z.string().email().max(120).safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: "Informe um e-mail válido." };
  try {
    await requestPasswordReset(parsed.data);
  } catch (e) {
    console.error("Falha ao pedir redefinição", e); // não revela o erro ao usuário
  }
  return { sent: true }; // mesma resposta para e-mail cadastrado ou não
}
