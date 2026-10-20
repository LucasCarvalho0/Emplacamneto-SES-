"use server";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth/guards";
import { DomainError } from "@/lib/errors";
import { finishBatch } from "@/lib/services/completion.service";

export async function finishBatchAction(formData: FormData) {
  const { user } = await requireOperator();
  try {
    await finishBatch(user.id, String(formData.get("batchId") ?? ""));
  } catch (error) {
    if (error instanceof DomainError) redirect(`/operador?${new URLSearchParams({ err: error.message })}`);
    throw error;
  }
  redirect(`/operador?${new URLSearchParams({ ok: "Lote finalizado. Avise o administrativo para receber mais veículos." })}`);
}
