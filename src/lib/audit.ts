import type { Prisma } from "@prisma/client";
import { db, type DbClient } from "./db";

interface AuditOptions {
  userId?: string | null;
  entity?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
}

/** Fora de transação, uma falha de auditoria não derruba a operação; dentro dela, propaga. */
export async function audit(action: string, opts: AuditOptions = {}, client: DbClient = db): Promise<void> {
  const data = {
    action,
    userId: opts.userId ?? null,
    entity: opts.entity,
    entityId: opts.entityId,
    meta: opts.meta,
  };
  if (client !== db) {
    await client.auditLog.create({ data });
    return;
  }
  try {
    await db.auditLog.create({ data });
  } catch (error) {
    console.error("Falha ao gravar auditoria", error);
  }
}
