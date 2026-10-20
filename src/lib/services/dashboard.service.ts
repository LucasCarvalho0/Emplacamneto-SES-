import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { SHIFTS, hourOf, shiftOf, startOfTodayBR } from "../time";

export interface DashFilters {
  from: string | null; // yyyy-mm-dd (data da operação da OS)
  to: string | null;
  osId: string | null;
  operatorId: string | null;
  shift: "MANHA" | "TARDE" | "NOITE" | null; // filtra os gráficos de produção
  bay: string | null; // texto contido na vaga
}

export interface Bar {
  label: string;
  value: number;
}

export async function getDashboard(f: DashFilters) {
  const osWhere: Prisma.ServiceOrderWhereInput = {
    ...(f.osId ? { id: f.osId } : {}),
    ...(f.from || f.to
      ? {
          operationDate: {
            ...(f.from ? { gte: new Date(`${f.from}T00:00:00.000Z`) } : {}),
            ...(f.to ? { lte: new Date(`${f.to}T00:00:00.000Z`) } : {}),
          },
        }
      : {}),
  };
  const vWhere: Prisma.VehicleWhereInput = {
    serviceOrder: osWhere,
    ...(f.operatorId ? { assignedToId: f.operatorId } : {}),
    ...(f.bay ? { bay: { contains: f.bay, mode: "insensitive" } } : {}),
  };

  const [byStatus, openByKeys, platings, activeOperators, workingGroups, finishedToday] = await Promise.all([
    db.vehicle.groupBy({ by: ["status"], where: vWhere, _count: { _all: true } }),
    db.vehicle.groupBy({
      by: ["retirarChave", "duasChaves"],
      where: { ...vWhere, status: { in: ["PENDING", "ASSIGNED"] } },
      _count: { _all: true },
    }),
    db.plating.findMany({
      where: { vehicle: vWhere },
      select: { completedAt: true, operator: { select: { name: true } } },
    }),
    db.user.count({ where: { role: "OPERATOR", active: true } }),
    db.vehicle.groupBy({ by: ["assignedToId"], where: { status: "ASSIGNED", assignedToId: { not: null } } }),
    db.batch.findMany({
      where: { status: "FINISHED", finishedAt: { gte: startOfTodayBR() } },
      distinct: ["operatorId"],
      select: { operatorId: true },
    }),
  ]);

  const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
  const pending = count("PENDING");
  const assigned = count("ASSIGNED");
  const completed = count("COMPLETED");
  const blocked = count("BLOCKED");
  const total = pending + assigned + completed + blocked;
  const authorized = total - blocked;

  const workingIds = new Set(workingGroups.map((g) => g.assignedToId));
  const working = workingIds.size;
  const finished = finishedToday.filter((b) => !workingIds.has(b.operatorId)).length;

  // Gráficos: agrupados no fuso de Brasília.
  const perHour = new Map<number, number>();
  const perShift = new Map<string, number>();
  const perOperator = new Map<string, number>();
  for (const p of platings) {
    const h = hourOf(p.completedAt);
    if (f.shift && shiftOf(h) !== f.shift) continue;
    perHour.set(h, (perHour.get(h) ?? 0) + 1);
    const s = shiftOf(h);
    perShift.set(s, (perShift.get(s) ?? 0) + 1);
    perOperator.set(p.operator.name, (perOperator.get(p.operator.name) ?? 0) + 1);
  }
  const hours = [...perHour.keys()].sort((a, b) => a - b);
  const hourBars: Bar[] = hours.map((h) => ({ label: `${String(h).padStart(2, "0")}h`, value: perHour.get(h) ?? 0 }));
  let acc = 0;
  const evolution: Bar[] = hours.map((h) => {
    acc += perHour.get(h) ?? 0;
    return { label: `${String(h).padStart(2, "0")}h`, value: acc };
  });

  return {
    kpi: { total, authorized, distributed: assigned + completed, pending: pending + assigned, unassigned: pending, inProgress: assigned, completed, blocked },
    progress: authorized > 0 ? Math.round((completed / authorized) * 100) : 0,
    operators: { active: activeOperators, working, available: Math.max(activeOperators - working, 0), finished },
    openByKeys: openByKeys.map((g) => ({ retirarChave: g.retirarChave, duasChaves: g.duasChaves, count: g._count._all })),
    charts: {
      perHour: hourBars,
      evolution,
      perShift: SHIFTS.map((s) => ({ label: s.label, value: perShift.get(s.id) ?? 0 })),
      perOperator: [...perOperator.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      pendingVsDone: [
        { label: "Pendentes", value: pending + assigned },
        { label: "Emplacados", value: completed },
        { label: "Bloqueados", value: blocked },
      ] satisfies Bar[],
    },
  };
}
