import { Prisma, type PlatingMethod, type ScanResult } from "@prisma/client";
import { db } from "../db";
import { audit } from "../audit";
import { DomainError } from "../errors";
import { normalizeCode, vinProblem } from "../domain/vin";
import { normalizePlate, plateDiff } from "../domain/plate";

export interface VehicleView {
  id: string;
  vin: string;
  plate: string | null;
  model: string | null;
  color: string | null;
  client: string | null;
  bay: string | null;
  retirarChave: boolean | null;
  duasChaves: boolean | null;
}

export type ValidateOutcome =
  | { ok: true; vehicle: VehicleView }
  | { ok: false; code: ScanResult; message: string };

export type ConfirmOutcome =
  | { ok: true; plate: string; vin: string }
  | { ok: false; code: ScanResult; message: string };

async function logScan(operatorId: string, value: string, result: ScanResult, method: PlatingMethod, vehicleId?: string) {
  try {
    await db.scanAttempt.create({
      data: { operatorId, scannedValue: value.slice(0, 80), result, method, vehicleId: vehicleId ?? null },
    });
  } catch (e) {
    console.error("Falha ao registrar leitura", e);
  }
}

/** Etapa 1: o operador leu (ou digitou) o VIN. O servidor diz se aquele veículo é dele. */
export async function validateScan(a: { operatorId: string; code: string; method: PlatingMethod }): Promise<ValidateOutcome> {
  const vin = normalizeCode(a.code);
  const problem = vinProblem(vin);
  if (problem) {
    await logScan(a.operatorId, vin, "NOT_FOUND", a.method);
    return { ok: false, code: "NOT_FOUND", message: `Código lido não é um VIN válido: ${problem}.` };
  }

  const found = await db.vehicle.findMany({ where: { vin } });
  const mine = found.find((v) => v.assignedToId === a.operatorId && v.status === "ASSIGNED");
  if (mine) {
    await logScan(a.operatorId, vin, "OK", a.method, mine.id);
    return {
      ok: true,
      vehicle: {
        id: mine.id,
        vin: mine.vin,
        plate: mine.plate,
        model: mine.model,
        color: mine.color,
        client: mine.client,
        bay: mine.bay,
        retirarChave: mine.retirarChave,
        duasChaves: mine.duasChaves,
      },
    };
  }

  const fail = async (code: ScanResult, message: string, vehicleId?: string): Promise<ValidateOutcome> => {
    await logScan(a.operatorId, vin, code, a.method, vehicleId);
    return { ok: false, code, message };
  };

  if (found.length === 0) return fail("NOT_FOUND", "Este VIN não consta em nenhuma OS importada. NÃO emplacar.");
  const done = found.find((v) => v.status === "COMPLETED");
  if (done) return fail("ALREADY_DONE", "Este veículo já foi emplacado. NÃO emplacar de novo.", done.id);
  const blocked = found.find((v) => v.status === "BLOCKED");
  if (blocked) return fail("BLOCKED", `Veículo bloqueado: ${blocked.blockReason ?? "sem motivo registrado"}. NÃO emplacar.`, blocked.id);
  return fail("NOT_ASSIGNED", "Este veículo não está atribuído a você. NÃO emplacar.", found[0]?.id);
}

/**
 * Etapa 2: confirmação definitiva. Tudo é conferido de novo no servidor: o que a tela mostrou não vale.
 * A conclusão é atômica: a atualização condicional e a restrição única em Plating impedem
 * que dois operadores concluam o mesmo veículo ao mesmo tempo.
 */
export async function confirmPlating(a: {
  operatorId: string;
  vehicleId: string;
  scannedVin: string;
  plate: string;
  method: PlatingMethod;
}): Promise<ConfirmOutcome> {
  const scanned = normalizeCode(a.scannedVin);
  const typedPlate = normalizePlate(a.plate);

  const fail = async (code: ScanResult, message: string, vehicleId?: string): Promise<ConfirmOutcome> => {
    await logScan(a.operatorId, scanned, code, a.method, vehicleId ?? a.vehicleId);
    return { ok: false, code, message };
  };

  try {
    return await db.$transaction(async (tx) => {
      const v = await tx.vehicle.findUnique({ where: { id: a.vehicleId }, include: { plating: true } });
      if (!v) return fail("NOT_FOUND", "Veículo não encontrado.");
      if (v.plating || v.status === "COMPLETED") return fail("ALREADY_DONE", "Este veículo já foi emplacado.");
      if (v.status === "BLOCKED") return fail("BLOCKED", `Veículo bloqueado: ${v.blockReason ?? "motivo não registrado"}.`);
      if (v.status !== "ASSIGNED" || v.assignedToId !== a.operatorId) {
        return fail("NOT_ASSIGNED", "Este veículo não está atribuído a você.");
      }
      if (scanned !== v.vin) return fail("VIN_MISMATCH", "O VIN lido não é o do veículo autorizado.");
      if (!v.plate) return fail("BLOCKED", "Veículo sem placa cadastrada.");
      if (typedPlate !== v.plate) {
        const diff = plateDiff(v.plate, typedPlate);
        const where = diff.length ? ` (diferença na posição ${diff.join(", ")})` : "";
        return fail("PLATE_MISMATCH", `A placa informada não confere com a autorizada${where}.`);
      }

      const updated = await tx.vehicle.updateMany({
        where: { id: v.id, status: "ASSIGNED", assignedToId: a.operatorId },
        data: { status: "COMPLETED" },
      });
      if (updated.count !== 1) return fail("CONFLICT", "O veículo mudou de situação. Releia o código de barras.");

      await tx.plating.create({
        data: {
          vehicleId: v.id,
          vin: v.vin,
          plate: v.plate,
          operatorId: a.operatorId,
          batchId: v.batchId,
          scannedVin: scanned,
          method: a.method,
        },
      });
      await tx.scanAttempt.create({
        data: { operatorId: a.operatorId, vehicleId: v.id, scannedValue: scanned, result: "OK", method: a.method },
      });
      await audit("plating.confirm", { userId: a.operatorId, entity: "Vehicle", entityId: v.id, meta: { vin: v.vin, plate: v.plate } }, tx);
      return { ok: true as const, plate: v.plate, vin: v.vin };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Outro operador concluiu o mesmo veículo no mesmo instante: a restrição única barrou.
      return fail("ALREADY_DONE", "Este veículo acabou de ser emplacado por outra pessoa.");
    }
    throw error;
  }
}

export async function finishBatch(operatorId: string, batchId: string) {
  return db.$transaction(async (tx) => {
    const batch = await tx.batch.findFirst({ where: { id: batchId, operatorId, status: "ACTIVE" } });
    if (!batch) throw new DomainError("Lote não encontrado ou já finalizado.");
    const open = await tx.vehicle.count({ where: { batchId, status: "ASSIGNED" } });
    if (open > 0) throw new DomainError(`Ainda faltam ${open} veículo(s) neste lote.`);
    await tx.batch.update({ where: { id: batchId }, data: { status: "FINISHED", finishedAt: new Date() } });
    await audit("batch.finish", { userId: operatorId, entity: "Batch", entityId: batchId }, tx);
  });
}
