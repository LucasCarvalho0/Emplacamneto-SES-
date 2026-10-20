// Roda contra um banco de TESTE (nunca o de produção):
//   DATABASE_URL_TEST=... npm run test:integration
// Antes: DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy
import test from "node:test";
import assert from "node:assert/strict";

const url = process.env.DATABASE_URL_TEST;
if (url) process.env.DATABASE_URL = url;

test("dois operadores confirmando o mesmo veículo: só um conclui", { skip: !url }, async () => {
  const { db } = await import("../../src/lib/db");
  const { confirmPlating } = await import("../../src/lib/services/completion.service");
  const { distributeVehicles } = await import("../../src/lib/services/distribution.service");

  const tag = Date.now().toString(36);
  const admin = await db.user.create({ data: { role: "ADMIN", name: "Adm", email: `a${tag}@t.com`, passwordHash: "x" } });
  const opA = await db.user.create({ data: { role: "OPERATOR", name: "A", matricula: `A${tag}`, passwordHash: "x" } });
  const opB = await db.user.create({ data: { role: "OPERATOR", name: "B", matricula: `B${tag}`, passwordHash: "x" } });
  const os = await db.serviceOrder.create({
    data: { code: `T-${tag}`, operationDate: new Date(), sourceFileName: "t.xlsx", fileHash: tag, importedById: admin.id },
  });
  const vin = `94TEST${tag.toUpperCase().padEnd(11, "1").slice(0, 11)}`.replace(/[IOQ]/g, "1");
  const v = await db.vehicle.create({
    data: { serviceOrderId: os.id, vin, plate: "TST1A23", sheetName: "t", rowNumber: 1, status: "PENDING" },
  });
  await distributeVehicles({ osId: os.id, operatorId: opA.id, quantity: 1, retirar: "ANY", chaves: "ANY", allowWhileBusy: true, byUserId: admin.id });

  // B nunca pode concluir um veículo que não é dele
  const intruder = await confirmPlating({ operatorId: opB.id, vehicleId: v.id, scannedVin: vin, plate: "TST1A23", method: "SCAN" });
  assert.equal(intruder.ok, false);

  // A confirma duas vezes ao mesmo tempo
  const attempts = await Promise.all(
    [1, 2].map(() => confirmPlating({ operatorId: opA.id, vehicleId: v.id, scannedVin: vin, plate: "TST1A23", method: "SCAN" })),
  );
  assert.equal(attempts.filter((r) => r.ok).length, 1);
  assert.equal(await db.plating.count({ where: { vehicleId: v.id } }), 1);

  // placa errada nunca conclui
  const wrong = await confirmPlating({ operatorId: opA.id, vehicleId: v.id, scannedVin: vin, plate: "TST1A24", method: "SCAN" });
  assert.equal(wrong.ok, false);
  await db.$disconnect();
});
