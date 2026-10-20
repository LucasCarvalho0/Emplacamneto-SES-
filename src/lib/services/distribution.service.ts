import { db } from "../db";
import { audit } from "../audit";
import { DomainError } from "../errors";
import { keyWhere, type ChavesFilter, type RetirarFilter } from "./filters";

export interface DistributeInput {
  osId: string;
  operatorId: string;
  quantity: number;
  retirar: RetirarFilter;
  chaves: ChavesFilter;
  allowWhileBusy: boolean;
  byUserId: string;
}

export async function distributeVehicles(a: DistributeInput) {
  return db.$transaction(async (tx) => {
    const operator = await tx.user.findFirst({
      where: { id: a.operatorId, role: "OPERATOR", active: true },
      select: { id: true, name: true },
    });
    if (!operator) throw new DomainError("Operador inválido ou desativado.");

    if (!a.allowWhileBusy) {
      const busy = await tx.vehicle.count({ where: { assignedToId: operator.id, status: "ASSIGNED" } });
      if (busy > 0) {
        throw new DomainError(
          `${operator.name} ainda tem ${busy} veículo(s) pendente(s) no lote atual. Marque "mesmo com lote em andamento" para somar.`,
        );
      }
    }

    const picks = await tx.vehicle.findMany({
      where: { serviceOrderId: a.osId, status: "PENDING", ...keyWhere(a) },
      orderBy: [{ sheetName: "asc" }, { rowNumber: "asc" }],
      take: a.quantity,
      select: { id: true },
    });
    if (picks.length === 0) throw new DomainError("Nenhum veículo pendente atende a esse filtro.");

    const batch = await tx.batch.create({
      data: { serviceOrderId: a.osId, operatorId: operator.id, createdById: a.byUserId },
    });
    const ids = picks.map((p) => p.id);

    // A condição status = PENDING garante que dois administradores não distribuam o mesmo veículo.
    const updated = await tx.vehicle.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: { status: "ASSIGNED", assignedToId: operator.id, batchId: batch.id },
    });
    if (updated.count !== ids.length) {
      throw new DomainError("Outra pessoa alterou esses veículos ao mesmo tempo. Tente novamente.");
    }

    await tx.assignmentLog.createMany({
      data: ids.map((vehicleId) => ({
        vehicleId,
        toUserId: operator.id,
        byUserId: a.byUserId,
        batchId: batch.id,
        reason: "DISTRIBUICAO",
      })),
    });
    await audit(
      "batch.create",
      { userId: a.byUserId, entity: "Batch", entityId: batch.id, meta: { operator: operator.name, count: ids.length, os: a.osId } },
      tx,
    );
    return { batchId: batch.id, count: ids.length, operatorName: operator.name };
  });
}

/** Passa os veículos pendentes de um operador para outro. O histórico das atribuições é mantido. */
export async function redistributePending(fromId: string, toId: string, byUserId: string) {
  if (fromId === toId) throw new DomainError("Escolha um operador diferente.");
  return db.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: { id: toId, role: "OPERATOR", active: true },
      select: { id: true, name: true },
    });
    if (!target) throw new DomainError("O operador de destino está inativo ou não existe.");

    const vehicles = await tx.vehicle.findMany({
      where: { assignedToId: fromId, status: "ASSIGNED" },
      select: { id: true, serviceOrderId: true, batchId: true },
    });
    if (vehicles.length === 0) throw new DomainError("Esse operador não tem veículos pendentes.");

    const byOs = new Map<string, string[]>();
    for (const v of vehicles) byOs.set(v.serviceOrderId, [...(byOs.get(v.serviceOrderId) ?? []), v.id]);

    for (const [osId, ids] of byOs) {
      const batch = await tx.batch.create({ data: { serviceOrderId: osId, operatorId: target.id, createdById: byUserId } });
      const updated = await tx.vehicle.updateMany({
        where: { id: { in: ids }, status: "ASSIGNED", assignedToId: fromId },
        data: { assignedToId: target.id, batchId: batch.id },
      });
      if (updated.count !== ids.length) throw new DomainError("Os veículos mudaram durante a operação. Tente novamente.");
      await tx.assignmentLog.createMany({
        data: ids.map((vehicleId) => ({
          vehicleId,
          fromUserId: fromId,
          toUserId: target.id,
          byUserId,
          batchId: batch.id,
          reason: "REDISTRIBUICAO",
        })),
      });
    }

    const oldBatchIds = [...new Set(vehicles.map((v) => v.batchId).filter((x): x is string => !!x))];
    await tx.batch.updateMany({
      where: { id: { in: oldBatchIds }, status: "ACTIVE", vehicles: { none: { status: "ASSIGNED" } } },
      data: { status: "CANCELLED", finishedAt: new Date() },
    });
    await audit(
      "batch.redistribute",
      { userId: byUserId, entity: "User", entityId: fromId, meta: { to: target.name, count: vehicles.length } },
      tx,
    );
    return { count: vehicles.length, targetName: target.name };
  });
}

/** Define se o veículo tem 2 chaves (true), 1 chave (false) ou não informado (null). */
export async function setKeyCount(vehicleIds: string[], duasChaves: boolean | null, byUserId: string) {
  if (vehicleIds.length === 0) throw new DomainError("Marque pelo menos um veículo.");
  const res = await db.vehicle.updateMany({
    where: { id: { in: vehicleIds }, status: { not: "COMPLETED" } },
    data: { duasChaves },
  });
  await audit("vehicle.keys", { userId: byUserId, meta: { count: res.count, duasChaves } });
  return res.count;
}
