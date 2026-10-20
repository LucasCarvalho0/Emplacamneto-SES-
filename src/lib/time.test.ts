import test from "node:test";
import assert from "node:assert/strict";
import { hourOf, shiftOf, startOfTodayBR } from "./time.ts";

test("Turnos: limites de manhã, tarde e noite", () => {
  assert.equal(shiftOf(5), "NOITE");
  assert.equal(shiftOf(6), "MANHA");
  assert.equal(shiftOf(13), "MANHA");
  assert.equal(shiftOf(14), "TARDE");
  assert.equal(shiftOf(21), "TARDE");
  assert.equal(shiftOf(22), "NOITE");
  assert.equal(shiftOf(0), "NOITE");
});

test("Hora no fuso de Brasília (UTC-3)", () => {
  assert.equal(hourOf(new Date("2026-05-29T18:30:00Z")), 15);
  assert.equal(hourOf(new Date("2026-05-29T02:59:00Z")), 23);
});

test("Início do dia em Brasília", () => {
  assert.equal(startOfTodayBR(new Date("2026-05-29T01:00:00Z")).toISOString(), "2026-05-28T03:00:00.000Z");
});
