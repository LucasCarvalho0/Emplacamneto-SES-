import ExcelJS from "exceljs";
import type { Cell, SheetInput } from "../domain/os-parser";

// Corrige bug conhecido do ExcelJS: ignora nós XML não suportados em filtros (ex: dateGroupItem em filtros de data)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FilterColumnXform = require("exceljs/lib/xlsx/xform/table/filter-column-xform");
  const origFilterParseOpen = FilterColumnXform.prototype.parseOpen;
  FilterColumnXform.prototype.parseOpen = function (node: unknown) {
    try {
      return origFilterParseOpen.call(this, node);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Unexpected xml node in parseOpen")) {
        return true;
      }
      throw err;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AutoFilterXform = require("exceljs/lib/xlsx/xform/table/auto-filter-xform");
  const origAutoParseOpen = AutoFilterXform.prototype.parseOpen;
  AutoFilterXform.prototype.parseOpen = function (node: unknown) {
    try {
      return origAutoParseOpen.call(this, node);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Unexpected xml node in parseOpen")) {
        return true;
      }
      throw err;
    }
  };
} catch {
  // Ignora se a estrutura interna de xform mudar no futuro
}

function toCell(value: ExcelJS.CellValue): Cell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    try {
      return value.toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    if ("error" in value) return String(value.error); // #N/A, #REF!...
    if ("result" in value) return toCell(value.result as ExcelJS.CellValue); // fórmula: vale o resultado
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("");
    }
    if ("text" in value) return String(value.text); // hiperlink
    return null;
  }
  return value as Cell;
}

/** Lê todas as abas (inclusive ocultas) como grades de valores. A decisão de usar ou não é do importador. */
export async function readWorkbook(buffer: Buffer): Promise<SheetInput[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  return workbook.worksheets.map((ws) => {
    const rows: Cell[][] = [];
    const cols = Math.min(ws.columnCount, 40);
    const total = Math.min(ws.rowCount, 20_000);
    for (let r = 1; r <= total; r++) {
      const row = ws.getRow(r);
      const cells: Cell[] = [];
      for (let c = 1; c <= cols; c++) cells.push(toCell(row.getCell(c).value));
      rows.push(cells);
    }
    return { name: ws.name, hidden: ws.state !== "visible", rows };
  });
}
