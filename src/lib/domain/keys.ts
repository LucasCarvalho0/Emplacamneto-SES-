import { normalizeText } from "./text.ts";

/** true = sim, false = não, null = não informado. */
export type YesNo = boolean | null;

export function parseYesNo(value: unknown): YesNo {
  const t = normalizeText(value);
  if (["SIM", "S", "YES", "Y", "TRUE", "1"].includes(t)) return true;
  if (["NAO", "N", "NO", "FALSE", "0"].includes(t)) return false;
  return null;
}

/** "RETIRA A CHAVE" -> true, "NÃO RETIRA A CHAVE (2)" -> false, outro nome -> null. */
export function retirarChaveFromSheetName(name: string): YesNo {
  const t = normalizeText(name);
  if (/\bNAO RETIRA\b/.test(t)) return false;
  if (/\bRETIRA\b/.test(t)) return true;
  return null;
}

/** Combina a coluna RETIRAR CHAVE com o nome da aba. Se discordarem, o veículo é bloqueado. */
export function resolveRetirarChave(column: YesNo, sheet: YesNo): { value: YesNo; conflict: boolean } {
  if (column !== null && sheet !== null) return { value: column, conflict: column !== sheet };
  return { value: column ?? sheet, conflict: false };
}

export function retirarChaveLabel(v: YesNo): string {
  if (v === true) return "Retira a chave";
  if (v === false) return "Não retira a chave";
  return "Retirada não informada";
}

export function chavesLabel(v: YesNo): string {
  if (v === true) return "2 chaves";
  if (v === false) return "1 chave";
  return "Chaves não informadas";
}
