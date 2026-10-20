import { normalizeCode } from "./vin.ts";

const OLD_PLATE = /^[A-Z]{3}[0-9]{4}$/; // ABC1234
const MERCOSUL_PLATE = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/; // ABC1D23

export function normalizePlate(raw: unknown): string {
  return normalizeCode(raw).replace(/-/g, "");
}

export function isValidPlate(plate: string): boolean {
  return OLD_PLATE.test(plate) || MERCOSUL_PLATE.test(plate);
}

/** Posições (começando em 1) em que duas placas diferem. Lista vazia = idênticas. */
export function plateDiff(expected: string, typed: string): number[] {
  const out: number[] = [];
  const len = Math.max(expected.length, typed.length);
  for (let i = 0; i < len; i++) {
    if (expected[i] !== typed[i]) out.push(i + 1);
  }
  return out;
}
