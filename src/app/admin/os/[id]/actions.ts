"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { DomainError } from "@/lib/errors";
import { distributeVehicles, setKeyCount } from "@/lib/services/distribution.service";
import { chavesFilter, retirarFilter } from "@/lib/services/filters";

const back = (osId: string, q: Record<string, string>) => `/admin/os/${osId}?${new URLSearchParams(q)}`;

const distributeSchema = z.object({
  osId: z.string().min(1),
  operatorId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1000),
});

export async function distributeAction(formData: FormData) {
  const { user } = await requireAdmin();
  const osId = String(formData.get("osId") ?? "");
  const parsed = distributeSchema.safeParse({
    osId,
    operatorId: formData.get("operatorId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) redirect(back(osId, { err: "Escolha o operador e uma quantidade entre 1 e 1000." }));

  let message = "";
  try {
    const r = await distributeVehicles({
      ...parsed.data,
      retirar: retirarFilter(String(formData.get("retirar") ?? "")),
      chaves: chavesFilter(String(formData.get("chaves") ?? "")),
      allowWhileBusy: formData.get("busy") === "on",
      byUserId: user.id,
    });
    message = `${r.count} veículo(s) enviados para ${r.operatorName}.`;
  } catch (error) {
    if (error instanceof DomainError) redirect(back(osId, { err: error.message }));
    throw error;
  }
  redirect(back(osId, { ok: message }));
}

export async function setKeysAction(formData: FormData) {
  const { user } = await requireAdmin();
  const osId = String(formData.get("osId") ?? "");
  const ids = formData.getAll("vehicleId").map(String);
  const mode = String(formData.get("mode"));
  const value = mode === "2" ? true : mode === "1" ? false : null;

  let message = "";
  try {
    const count = await setKeyCount(ids, value, user.id);
    message = `${count} veículo(s) atualizados.`;
  } catch (error) {
    if (error instanceof DomainError) redirect(back(osId, { err: error.message }));
    throw error;
  }
  redirect(back(osId, { ok: message }));
}
