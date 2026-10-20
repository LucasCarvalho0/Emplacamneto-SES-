import type { Prisma } from "@prisma/client";
import { parseDateInput } from "../time";
import { normalizeCode } from "../domain/vin";

export function historyWhere(sp: { from?: string; to?: string; op?: string; q?: string }): Prisma.PlatingWhereInput {
  const from = parseDateInput(sp.from);
  const to = parseDateInput(sp.to);
  const code = normalizeCode(sp.q ?? "");
  return {
    ...(sp.op ? { operatorId: sp.op } : {}),
    ...(from || to
      ? {
          completedAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00-03:00`) } : {}),
            ...(to ? { lt: new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 86_400_000) } : {}),
          },
        }
      : {}),
    ...(code ? { OR: [{ plate: { contains: code } }, { vin: { contains: code } }] } : {}),
  };
}
