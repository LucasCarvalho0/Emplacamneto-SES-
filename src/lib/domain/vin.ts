const INVISIBLE = /[\s\u200B-\u200D\uFEFF]/g;

/** Normaliza o que veio do Excel, do leitor ou da digitação: sem espaços e em maiúsculas. */
export function normalizeCode(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).normalize("NFKC").replace(INVISIBLE, "").toUpperCase();
}

/** VIN/chassi: 17 caracteres; I, O e Q não existem, justamente para evitar confusão com 1 e 0. */
export const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

export function isValidVin(value: string): boolean {
  return VIN_REGEX.test(value);
}

export function vinProblem(value: string): string | null {
  if (value.length !== 17) return `VIN com ${value.length} caracteres (o correto são 17)`;
  if (/[IOQ]/.test(value)) return "VIN contém I, O ou Q, que não são permitidos";
  if (!VIN_REGEX.test(value)) return "VIN contém caracteres inválidos";
  return null;
}
