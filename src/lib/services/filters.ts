import type { Prisma } from "@prisma/client";

export type RetirarFilter = "ANY" | "SIM" | "NAO";
export type ChavesFilter = "ANY" | "2" | "1" | "NI";

export function retirarFilter(v: string | undefined): RetirarFilter {
  return v === "SIM" || v === "NAO" ? v : "ANY";
}
export function chavesFilter(v: string | undefined): ChavesFilter {
  return v === "2" || v === "1" || v === "NI" ? v : "ANY";
}

export function keyWhere(f: { retirar?: RetirarFilter; chaves?: ChavesFilter }): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};
  if (f.retirar === "SIM") where.retirarChave = true;
  if (f.retirar === "NAO") where.retirarChave = false;
  if (f.chaves === "2") where.duasChaves = true;
  if (f.chaves === "1") where.duasChaves = false;
  if (f.chaves === "NI") where.duasChaves = null;
  return where;
}
