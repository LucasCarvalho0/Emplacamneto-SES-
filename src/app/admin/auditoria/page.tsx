import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { PageTitle, Panel } from "@/components/ui";
import { td, th } from "@/components/styles";

export const metadata = { title: "Auditoria" };
export const dynamic = "force-dynamic";

const RESULT: Record<string, string> = {
  NOT_FOUND: "VIN fora de qualquer OS",
  NOT_ASSIGNED: "Veículo de outro operador",
  ALREADY_DONE: "Já emplacado",
  BLOCKED: "Veículo bloqueado",
  VIN_MISMATCH: "VIN diferente",
  PLATE_MISMATCH: "Placa não confere",
  CONFLICT: "Conflito",
};

export default async function AuditPage() {
  const [logs, refused] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { user: { select: { name: true } } } }),
    db.scanAttempt.findMany({
      where: { result: { not: "OK" } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { operator: { select: { name: true, matricula: true } } },
    }),
  ]);
  return (
    <>
      <PageTitle title="Auditoria" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Leituras recusadas" className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["Quando", "Operador", "Código lido", "Motivo"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {refused.map((s) => (
                <tr key={s.id} className="border-t border-concreto-200">
                  <td className={td}>{formatDateTime(s.createdAt)}</td>
                  <td className={td}>{s.operator.name}</td>
                  <td className={`${td} font-mono text-xs`}>{s.scannedValue}</td>
                  <td className={td}>{RESULT[s.result] ?? s.result}</td>
                </tr>
              ))}
              {refused.length === 0 && <tr><td colSpan={4} className={`${td} text-asfalto-500`}>Nenhuma leitura recusada.</td></tr>}
            </tbody>
          </table>
        </Panel>
        <Panel title="Eventos do sistema" className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["Quando", "Quem", "Ação"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-concreto-200">
                  <td className={td}>{formatDateTime(l.createdAt)}</td>
                  <td className={td}>{l.user?.name ?? "—"}</td>
                  <td className={`${td} font-mono text-xs`}>{l.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
