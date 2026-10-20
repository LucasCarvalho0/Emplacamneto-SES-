import { apiAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { chavesLabel, retirarChaveLabel } from "@/lib/domain/keys";
import { csvResponse, toCsv } from "@/lib/services/csv";

const STATUS: Record<string, string> = { PENDING: "Pendente", ASSIGNED: "Distribuído", COMPLETED: "Emplacado", BLOCKED: "Bloqueado" };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(req, "ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const os = await db.serviceOrder.findUnique({ where: { id }, select: { code: true } });
  if (!os) return Response.json({ ok: false, message: "OS não encontrada." }, { status: 404 });

  const vehicles = await db.vehicle.findMany({
    where: { serviceOrderId: id },
    orderBy: [{ sheetName: "asc" }, { rowNumber: "asc" }],
    include: { assignedTo: { select: { name: true } }, plating: { select: { completedAt: true, operator: { select: { name: true, matricula: true } } } } },
  });
  const csv = toCsv(
    ["Aba", "Linha", "VIN", "Placa", "Vaga", "Modelo", "Cor", "Cliente", "Retirada", "Chaves", "Situação", "Motivo do bloqueio", "Operador atribuído", "Emplacado por", "Matrícula", "Emplacado em"],
    vehicles.map((v) => [
      v.sheetName, v.rowNumber, v.vin, v.plate, v.bay, v.model, v.color, v.client,
      retirarChaveLabel(v.retirarChave), chavesLabel(v.duasChaves), STATUS[v.status], v.blockReason,
      v.assignedTo?.name, v.plating?.operator.name, v.plating?.operator.matricula,
      v.plating ? formatDateTime(v.plating.completedAt) : "",
    ]),
  );
  return csvResponse(`${os.code}.csv`, csv);
}
