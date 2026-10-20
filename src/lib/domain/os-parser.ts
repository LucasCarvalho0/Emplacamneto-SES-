import { cleanText, isMissing, normalizeText } from "./text.ts";
import { normalizeCode, vinProblem } from "./vin.ts";
import { isValidPlate, normalizePlate } from "./plate.ts";
import {
  parseYesNo,
  resolveRetirarChave,
  retirarChaveFromSheetName,
  type YesNo,
} from "./keys.ts";

export type Cell = string | number | boolean | null | undefined;

export interface SheetInput {
  name: string;
  hidden: boolean;
  rows: Cell[][]; // rows[0] é a linha 1 da planilha
}

export interface ParsedRow {
  sheetName: string;
  rowNumber: number;
  vin: string;
  plate: string | null;
  bay: string | null;
  model: string | null;
  color: string | null;
  client: string | null;
  retirarChave: YesNo;
  duasChaves: YesNo;
  document: string | null;
  sheetStatus: string | null;
  /** Qualquer item aqui bloqueia o veículo (ele é importado, mas não pode ser emplacado). */
  issues: string[];
}

export interface RejectedRow {
  sheetName: string;
  rowNumber: number;
  value: string;
  reason: string;
}

export interface ParsedSheet {
  name: string;
  hidden: boolean;
  headerFound: boolean;
  headerDate: string | null; // yyyy-mm-dd
  rows: ParsedRow[];
  rejected: RejectedRow[];
}

const COLUMNS: Record<string, string> = {
  VIN: "vin",
  PLACA: "plate",
  VAGA: "bay",
  MODELO: "model",
  COR: "color",
  CLIENTE: "client",
  "RETIRAR CHAVE": "retirarChave",
  DOCUMENTO: "document",
  STATUS: "status",
  "2 CHAVES NO VEICULO": "duasChaves",
};

function findDate(text: string): string | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  const valid =
    d.getUTCFullYear() === Number(yyyy) && d.getUTCMonth() === Number(mm) - 1 && d.getUTCDate() === Number(dd);
  return valid ? `${yyyy}-${mm}-${dd}` : null;
}

export function parseSheet(sheet: SheetInput): ParsedSheet {
  const result: ParsedSheet = {
    name: sheet.name,
    hidden: sheet.hidden,
    headerFound: false,
    headerDate: null,
    rows: [],
    rejected: [],
  };

  // O cabeçalho é localizado pelos nomes das colunas, nunca por posição fixa.
  let headerIdx = -1;
  let col: Record<string, number> = {};
  const scanLimit = Math.min(sheet.rows.length, 30);
  for (let i = 0; i < scanLimit; i++) {
    const map: Record<string, number> = {};
    (sheet.rows[i] ?? []).forEach((cell, c) => {
      const key = COLUMNS[normalizeText(cell)];
      if (key && !(key in map)) map[key] = c;
    });
    if ("vin" in map && "plate" in map) {
      headerIdx = i;
      col = map;
      break;
    }
  }
  if (headerIdx < 0) return result;
  result.headerFound = true;

  for (let i = 0; i < headerIdx && !result.headerDate; i++) {
    for (const cell of sheet.rows[i] ?? []) {
      if (typeof cell === "string") {
        const d = findDate(cell);
        if (d) {
          result.headerDate = d;
          break;
        }
      }
    }
  }

  const sheetRetira = retirarChaveFromSheetName(sheet.name);
  const get = (row: Cell[], key: string): Cell => (key in col ? row[col[key] as number] : undefined);

  for (let i = headerIdx + 1; i < sheet.rows.length; i++) {
    const row = sheet.rows[i] ?? [];
    const rowNumber = i + 1;
    const vinRaw = get(row, "vin");
    const plateRaw = get(row, "plate");

    if (isMissing(vinRaw)) {
      if (!isMissing(plateRaw)) {
        result.rejected.push({
          sheetName: sheet.name,
          rowNumber,
          value: String(plateRaw),
          reason: "Linha com placa, mas sem VIN",
        });
      }
      continue; // linha vazia ou só com #N/A
    }

    const vin = normalizeCode(vinRaw);
    const vinIssue = vinProblem(vin);
    if (vinIssue) {
      result.rejected.push({ sheetName: sheet.name, rowNumber, value: vin, reason: vinIssue });
      continue;
    }

    const issues: string[] = [];
    let plate: string | null = null;
    if (isMissing(plateRaw)) {
      issues.push("Placa ausente");
    } else {
      plate = normalizePlate(plateRaw);
      if (!isValidPlate(plate)) issues.push(`Placa inválida (${plate})`);
    }

    const retira = resolveRetirarChave(parseYesNo(get(row, "retirarChave")), sheetRetira);
    if (retira.conflict) {
      issues.push("A coluna RETIRAR CHAVE contradiz o nome da aba");
    }

    result.rows.push({
      sheetName: sheet.name,
      rowNumber,
      vin,
      plate,
      bay: cleanText(get(row, "bay")),
      model: cleanText(get(row, "model")),
      color: cleanText(get(row, "color")),
      client: cleanText(get(row, "client")),
      retirarChave: retira.value,
      duasChaves: parseYesNo(get(row, "duasChaves")),
      document: cleanText(get(row, "document")),
      sheetStatus: cleanText(get(row, "status")),
      issues,
    });
  }
  return result;
}

/** Junta as abas escolhidas. VIN ou placa repetidos na importação são rejeitados (vale o primeiro). */
export function mergeSheets(sheets: ParsedSheet[]): { rows: ParsedRow[]; rejected: RejectedRow[] } {
  const rows: ParsedRow[] = [];
  const rejected: RejectedRow[] = sheets.flatMap((s) => s.rejected);
  const seenVin = new Map<string, string>();
  const seenPlate = new Map<string, string>();

  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      const where = `aba "${row.sheetName}", linha ${row.rowNumber}`;
      const vinAt = seenVin.get(row.vin);
      if (vinAt) {
        rejected.push({
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,
          value: row.vin,
          reason: `VIN duplicado (já aparece em ${vinAt})`,
        });
        continue;
      }
      const plateAt = row.plate ? seenPlate.get(row.plate) : undefined;
      if (plateAt) {
        rejected.push({
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,
          value: row.plate ?? "",
          reason: `Placa duplicada (já aparece em ${plateAt})`,
        });
        continue;
      }
      seenVin.set(row.vin, where);
      if (row.plate) seenPlate.set(row.plate, where);
      rows.push(row);
    }
  }
  return { rows, rejected };
}
