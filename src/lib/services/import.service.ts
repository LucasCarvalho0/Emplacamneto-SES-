import { createHash } from "node:crypto";
import { db } from "../db";
import { audit } from "../audit";
import { DomainError } from "../errors";
import { mergeSheets, parseSheet, type ParsedSheet } from "../domain/os-parser";
import { readWorkbook } from "./excel";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export interface SheetPreview {
  name: string;
  hidden: boolean;
  headerFound: boolean;
  headerDate: string | null;
  validRows: number;
  blockedRows: number;
  rejectedCount: number;
  blockedSample: { rowNumber: number; vin: string; issues: string[] }[];
  rejectedSample: { rowNumber: number; value: string; reason: string }[];
  suggested: boolean;
}

export interface ImportPreview {
  fileHash: string;
  alreadyImportedAs: string | null;
  sheets: SheetPreview[];
}

function assertXlsx(buf: Buffer) {
  if (buf.length === 0) throw new DomainError("O arquivo está vazio.");
  if (buf.length > MAX_FILE_BYTES) throw new DomainError("O arquivo passa de 8 MB.");
  // .xlsx é um ZIP: começa com "PK". Confere o formato real, não só a extensão.
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new DomainError("O arquivo não é um .xlsx válido.");
}

const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

async function parseAll(buf: Buffer): Promise<ParsedSheet[]> {
  assertXlsx(buf);
  let sheets;
  try {
    sheets = await readWorkbook(buf);
  } catch (error) {
    console.error("Erro ao ler workbook:", error);
    const msg = error instanceof Error ? error.message : "formato incompatível ou corrompido";
    throw new DomainError(`Não foi possível abrir a planilha (${msg}). O arquivo pode estar corrompido.`);
  }
  if (sheets.length === 0) throw new DomainError("A planilha não tem abas.");
  return sheets.map(parseSheet);
}

export async function previewImport(buf: Buffer): Promise<ImportPreview> {
  const parsed = await parseAll(buf);
  const fileHash = sha256(buf);
  const existing = await db.serviceOrder.findFirst({ where: { fileHash }, select: { code: true } });

  return {
    fileHash,
    alreadyImportedAs: existing?.code ?? null,
    sheets: parsed.map((p) => {
      const ok = p.rows.filter((r) => r.issues.length === 0).length;
      const blocked = p.rows.filter((r) => r.issues.length > 0);
      return {
        name: p.name,
        hidden: p.hidden,
        headerFound: p.headerFound,
        headerDate: p.headerDate,
        validRows: ok,
        blockedRows: blocked.length,
        rejectedCount: p.rejected.length,
        blockedSample: blocked.slice(0, 15).map((r) => ({ rowNumber: r.rowNumber, vin: r.vin, issues: r.issues })),
        rejectedSample: p.rejected.slice(0, 15),
        // Abas ocultas costumam ser rascunhos de OS antigas: nunca vêm marcadas por padrão.
        suggested: !p.hidden && p.headerFound && p.rows.length > 0,
      };
    }),
  };
}

export interface CommitInput {
  buf: Buffer;
  fileName: string;
  selectedSheets: string[];
  operationDate: string; // yyyy-mm-dd
  externalCode?: string | null;
  userId: string;
}

export async function commitImport(input: CommitInput) {
  const { buf, userId } = input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate)) throw new DomainError("Informe a data da operação.");
  if (input.selectedSheets.length === 0) throw new DomainError("Escolha pelo menos uma aba.");

  const parsed = await parseAll(buf);
  const chosen = input.selectedSheets.map((name) => {
    const sheet = parsed.find((p) => p.name === name);
    if (!sheet) throw new DomainError(`A aba "${name}" não existe no arquivo.`);
    if (!sheet.headerFound) throw new DomainError(`A aba "${name}" não tem cabeçalho com VIN e PLACA.`);
    return sheet;
  });

  const fileHash = sha256(buf);
  const duplicate = await db.serviceOrder.findFirst({ where: { fileHash }, select: { code: true } });
  if (duplicate) throw new DomainError(`Este arquivo já foi importado como ${duplicate.code}.`);

  const { rows, rejected } = mergeSheets(chosen);
  if (rows.length === 0) throw new DomainError("Nenhum veículo válido nas abas escolhidas.");

  const vins = rows.map((r) => r.vin);
  const [alreadyPlated, pendingElsewhere] = await Promise.all([
    db.plating.findMany({ where: { vin: { in: vins } }, select: { vin: true } }),
    db.vehicle.findMany({
      where: { vin: { in: vins }, status: { in: ["PENDING", "ASSIGNED"] } },
      select: { vin: true, serviceOrder: { select: { code: true } } },
    }),
  ]);
  const platedSet = new Set(alreadyPlated.map((p) => p.vin));
  const pendingMap = new Map(pendingElsewhere.map((v) => [v.vin, v.serviceOrder.code]));

  const day = new Date(`${input.operationDate}T00:00:00.000Z`);

  const result = await db.$transaction(
    async (tx) => {
      const sameDay = await tx.serviceOrder.count({ where: { operationDate: day } });
      const code = `OS-${input.operationDate.replaceAll("-", "")}-${String(sameDay + 1).padStart(2, "0")}`;

      const os = await tx.serviceOrder.create({
        data: {
          code,
          externalCode: input.externalCode?.trim().slice(0, 60) || null,
          operationDate: day,
          sourceFileName: input.fileName.slice(0, 200),
          fileHash,
          sheets: input.selectedSheets,
          importedById: userId,
        },
      });

      let blocked = 0;
      const data = rows.map((r) => {
        const reasons = [...r.issues];
        if (platedSet.has(r.vin)) reasons.push("VIN já foi emplacado anteriormente");
        const other = pendingMap.get(r.vin);
        if (other) reasons.push(`VIN já está pendente na ${other}`);
        if (reasons.length) blocked++;
        return {
          serviceOrderId: os.id,
          vin: r.vin,
          plate: r.plate,
          sheetName: r.sheetName,
          rowNumber: r.rowNumber,
          bay: r.bay,
          model: r.model,
          color: r.color,
          client: r.client,
          retirarChave: r.retirarChave,
          duasChaves: r.duasChaves,
          document: r.document,
          sheetStatus: r.sheetStatus,
          status: reasons.length ? ("BLOCKED" as const) : ("PENDING" as const),
          blockReason: reasons.length ? reasons.join("; ") : null,
        };
      });
      await tx.vehicle.createMany({ data });

      if (rejected.length) {
        await tx.importIssue.createMany({
          data: rejected.map((x) => ({
            serviceOrderId: os.id,
            sheetName: x.sheetName,
            rowNumber: x.rowNumber,
            value: x.value.slice(0, 100),
            message: x.reason,
          })),
        });
      }

      await audit(
        "os.import",
        {
          userId,
          entity: "ServiceOrder",
          entityId: os.id,
          meta: { code, file: input.fileName, sheets: input.selectedSheets, imported: rows.length, blocked, rejected: rejected.length },
        },
        tx,
      );
      return { id: os.id, code, imported: rows.length, blocked, rejected: rejected.length };
    },
    { timeout: 60_000 },
  );
  return result;
}
