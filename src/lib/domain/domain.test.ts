import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isValidVin, normalizeCode, vinProblem } from "./vin.ts";
import { isValidPlate, normalizePlate, plateDiff } from "./plate.ts";
import { parseYesNo, resolveRetirarChave, retirarChaveFromSheetName } from "./keys.ts";
import { mergeSheets, parseSheet, type SheetInput } from "./os-parser.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./__fixtures__/os-30-05.json", import.meta.url), "utf8"),
) as SheetInput[];
const sheet = (name: string) => fixture.find((s) => s.name === name)!;

test("VIN: aceita 17 caracteres válidos e normaliza espaços e minúsculas", () => {
  assert.equal(normalizeCode(" 94dfaap16tb028813 \n"), "94DFAAP16TB028813");
  assert.ok(isValidVin("94DFAAP16TB028813"));
});

test("VIN: rejeita tamanho errado e as letras I, O e Q", () => {
  assert.match(vinProblem("94DFAAP16TB02881")!, /16 caracteres/);
  assert.match(vinProblem("94DFAAP16TB02881O")!, /I, O ou Q/);
  assert.equal(isValidVin("94DFAAP16TB02881Q"), false);
});

test("Placa: padrão antigo e Mercosul, com ou sem hífen", () => {
  assert.ok(isValidPlate(normalizePlate("abc-1234")));
  assert.ok(isValidPlate(normalizePlate("TZN8E51")));
  assert.equal(isValidPlate("TZN8E5"), false);
  assert.equal(isValidPlate("1ZN8E51"), false);
});

test("Placa: informa as posições que diferem (O x 0, I x 1)", () => {
  assert.deepEqual(plateDiff("TZN8E51", "TZN8E51"), []);
  assert.deepEqual(plateDiff("TZN8E51", "TZN8E5I"), [7]);
  assert.deepEqual(plateDiff("TZN8E51", "TZN8E5"), [7]);
});

test("Chaves: coluna, nome da aba e conflito", () => {
  assert.equal(parseYesNo("SIM"), true);
  assert.equal(parseYesNo("NÃO"), false);
  assert.equal(parseYesNo("#N/A"), null);
  assert.equal(retirarChaveFromSheetName("RETIRA A CHAVE"), true);
  assert.equal(retirarChaveFromSheetName("NÃO RETIRA A CHAVE (2)"), false);
  assert.equal(retirarChaveFromSheetName("recebimento"), null);
  assert.deepEqual(resolveRetirarChave(true, false), { value: true, conflict: true });
  assert.deepEqual(resolveRetirarChave(null, false), { value: false, conflict: false });
});

test("Planilha real: aba RETIRA A CHAVE tem 66 veículos, todos válidos", () => {
  const p = parseSheet(sheet("RETIRA A CHAVE"));
  assert.equal(p.headerFound, true);
  assert.equal(p.headerDate, "2026-05-29");
  assert.equal(p.rows.length, 66);
  assert.equal(p.rejected.length, 0);
  assert.ok(p.rows.every((r) => r.issues.length === 0 && r.retirarChave === true));
  assert.equal(p.rows[0]!.vin, "94DFAAP16TB028813");
  assert.equal(p.rows[0]!.plate, "TZN8E51");
  assert.equal(p.rows[0]!.model, "KICKS 1.0T ADVANCE AT 2026"); // espaços sobrando removidos
});

test("Planilha real: aba NÃO RETIRA A CHAVE (2) tem 51 veículos", () => {
  const p = parseSheet(sheet("NÃO RETIRA A CHAVE (2)"));
  assert.equal(p.rows.length, 51);
  assert.ok(p.rows.every((r) => r.retirarChave === false && r.issues.length === 0));
});

test("Planilha real: a coluna '2 CHAVES NO VEICULO' vem vazia, então fica 'não informado'", () => {
  const p = parseSheet(sheet("RETIRA A CHAVE"));
  assert.ok(p.rows.every((r) => r.duasChaves === null));
});

test("Planilha real: abas ocultas são marcadas e #N/A vira informação ausente", () => {
  const hidden = ["só placa", "recebimento"].map((n) => parseSheet(sheet(n)));
  assert.ok(hidden.every((p) => p.hidden));
  assert.equal(hidden[0]!.headerDate, "2025-12-22");
  const r = hidden[0]!.rows[0]!;
  assert.equal(r.model, null);
  assert.equal(r.client, null);
  assert.equal(r.bay, null);
});

test("Importação das duas abas visíveis: 117 veículos, sem duplicados", () => {
  const merged = mergeSheets([parseSheet(sheet("RETIRA A CHAVE")), parseSheet(sheet("NÃO RETIRA A CHAVE (2)"))]);
  assert.equal(merged.rows.length, 117);
  assert.equal(merged.rejected.length, 0);
});

test("VIN e placa repetidos são rejeitados, vale o primeiro", () => {
  const base = parseSheet(sheet("RETIRA A CHAVE"));
  const merged = mergeSheets([base, base]);
  assert.equal(merged.rows.length, 66);
  assert.equal(merged.rejected.length, 66);
  assert.match(merged.rejected[0]!.reason, /VIN duplicado/);
});

test("Linha com VIN inválido é rejeitada; placa ausente bloqueia o veículo", () => {
  const input: SheetInput = {
    name: "RETIRA A CHAVE",
    hidden: false,
    rows: [
      ["ORDEM DE SERVIÇO", null, "DATA: 01/02/2026"],
      ["QTD.", "VIN", "PLACA", "RETIRAR CHAVE"],
      [1, "94DFAAP16TB02881", "ABC1D23", "SIM"], // 16 caracteres
      [2, "94DFAAP16TB028813", "#N/A", "SIM"], // placa ausente
      [3, "94DFAAP16TB028814", "ABC1D24", "NÃO"], // contradiz a aba
    ],
  };
  const p = parseSheet(input);
  assert.equal(p.headerDate, "2026-02-01");
  assert.equal(p.rejected.length, 1);
  assert.equal(p.rows.length, 2);
  assert.deepEqual(p.rows[0]!.issues, ["Placa ausente"]);
  assert.match(p.rows[1]!.issues[0]!, /contradiz/);
});

test("Aba sem cabeçalho reconhecível não é importada", () => {
  const p = parseSheet({ name: "x", hidden: false, rows: [["a", "b"], [1, 2]] });
  assert.equal(p.headerFound, false);
  assert.equal(p.rows.length, 0);
});

test("Reconhece variações de cabeçalho: CHASSI, PLACAS, BOX / VAGA", () => {
  const input: SheetInput = {
    name: "RETIRA A CHAVE",
    hidden: false,
    rows: [
      ["ORDEM DE SERVIÇO", null, "DATA: 10/05/2026"],
      ["NUMERO DO CHASSI", "PLACA DO VEICULO", "BOX", "MODELO DO VEICULO"],
      ["94DFAAP16TB028813", "ABC1D23", "VAGA-42", "KICKS"],
    ],
  };
  const p = parseSheet(input);
  assert.equal(p.headerFound, true);
  assert.equal(p.rows.length, 1);
  assert.equal(p.rows[0]!.vin, "94DFAAP16TB028813");
  assert.equal(p.rows[0]!.plate, "ABC1D23");
  assert.equal(p.rows[0]!.bay, "VAGA-42");
  assert.equal(p.rows[0]!.model, "KICKS");
});
