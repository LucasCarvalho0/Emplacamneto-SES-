"use server";
import { redirect } from "next/navigation";
import { completePasswordReset } from "@/lib/auth/reset";
import { DomainError } from "@/lib/errors";

export interface ResetState {
  error?: string;
}

export async function resetAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { error: "A confirmação não é igual à nova senha." };
  try {
    await completePasswordReset(token, next);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  redirect("/login?senha=redefinida");
}
