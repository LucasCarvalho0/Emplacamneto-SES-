import { apiAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { csvResponse, toCsv } from "@/lib/services/csv";
import { historyWhere } from "@/lib/services/history";

export async function GET(req: Request) {
  const auth = await apiAuth(req, "ADMIN");
  if (!auth.ok) return auth.response;
  const p = new URL(req.url).searchParams;
  const rows = await db.plating.findMany({
    where: historyWhere({ from: p.get("from") ?? undefined, to: p.get("to") ?? undefined, op: p.get("op") ?? undefined, q: p.get("q") ?? undefined }),
    orderBy: { completedAt: "desc" },
    take: 20_000,
    include: { operator: { select: { name: true, matricula: true } }, vehicle: { select: { model: true, color: true, client: true, serviceOrder: { select: { code: true } } } } },
  });
  const csv = toCsv(
    ["Emplacado em", "OS", "VIN", "Placa", "Modelo", "Cor", "Cliente", "Operador", "Matrícula", "Leitura"],
    rows.map((r) => [
      formatDateTime(r.completedAt), r.vehicle.serviceOrder.code, r.vin, r.plate, r.vehicle.model, r.vehicle.color, r.vehicle.client,
      r.operator.name, r.operator.matricula, r.method === "SCAN" ? "Código de barras" : "Digitado",
    ]),
  );
  return csvResponse("emplacamentos.csv", csv);
}
