import Link from "next/link";
import { db } from "@/lib/db";
import { requireOperator } from "@/lib/auth/guards";
import { formatDateTime, startOfTodayBR } from "@/lib/time";
import { one, type SP } from "@/lib/params";
import { chavesLabel, retirarChaveLabel } from "@/lib/domain/keys";
import { BayBadge, Flash, Panel, PlateTag } from "@/components/ui";
import { btnPrimary, btnQuiet } from "@/components/styles";
import { finishBatchAction } from "./actions";

export const metadata = { title: "Meus serviços" };
export const dynamic = "force-dynamic";

export default async function OperatorHome({ searchParams }: { searchParams: SP }) {
  const { user } = await requireOperator();
  const sp = await searchParams;

  const [batches, open, today] = await Promise.all([
    db.batch.findMany({
      where: { operatorId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: { serviceOrder: { select: { code: true } } },
    }),
    // Só os veículos atribuídos a quem está logado: o filtro usa a sessão, nunca um parâmetro da URL.
    db.vehicle.findMany({
      where: { assignedToId: user.id, status: "ASSIGNED" },
      orderBy: [{ retirarChave: "desc" }, { duasChaves: "desc" }, { sheetName: "asc" }, { rowNumber: "asc" }],
    }),
    db.plating.findMany({
      where: { operatorId: user.id, completedAt: { gte: startOfTodayBR() } },
      orderBy: { completedAt: "desc" },
      take: 60,
    }),
  ]);
  const stats = await db.vehicle.groupBy({
    by: ["batchId", "status"],
    where: { batchId: { in: batches.map((b) => b.id) } },
    _count: { _all: true },
  });
  const nOf = (batchId: string, status?: string) =>
    stats.filter((s) => s.batchId === batchId && (!status || s.status === status)).reduce((n, s) => n + s._count._all, 0);

  // Agrupa por retirada de chave para o operador separar o que vai com cada chave.
  const groups = new Map<string, typeof open>();
  for (const v of open) {
    const k = retirarChaveLabel(v.retirarChave);
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }

  return (
    <div className="space-y-5">
      <Flash ok={one(sp.ok)} err={one(sp.err)} />

      <Link href="/operador/ler" className={`${btnPrimary} w-full py-4 text-lg`}>Ler código de barras</Link>

      {batches.length === 0 && (
        <Panel title="Sem lote no momento">
          <p className="text-sm text-asfalto-700">Você não tem veículos pendentes. Peça ao administrativo para distribuir um novo lote.</p>
        </Panel>
      )}

      {batches.map((b) => {
        const total = nOf(b.id);
        const done = nOf(b.id, "COMPLETED");
        const left = nOf(b.id, "ASSIGNED");
        return (
          <Panel key={b.id}>
            <p className="text-sm text-asfalto-500">{b.serviceOrder.code}</p>
            <p className="text-2xl font-semibold tabular-nums">{done} de {total} emplacados</p>
            <div className="mt-2 h-3 rounded-sm bg-concreto-100" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Progresso do lote">
              <div className="h-3 rounded-sm bg-ok" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
            {left === 0 && (
              <form action={finishBatchAction} className="mt-4">
                <input type="hidden" name="batchId" value={b.id} />
                <button className={`${btnQuiet} w-full`}>Finalizar lote</button>
              </form>
            )}
          </Panel>
        );
      })}

      {[...groups.entries()].map(([label, list]) => (
        <section key={label}>
          <h2 className="mb-2 text-base font-semibold">{label} <span className="font-normal text-asfalto-500">({list.length})</span></h2>
          <ul className="space-y-3">
            {list.map((v) => (
              <li key={v.id} className="rounded-lg border border-concreto-200 bg-white p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <PlateTag plate={v.plate} />
                    <p className="font-mono text-xs font-semibold text-asfalto-700 tracking-wider">{v.vin}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <BayBadge bay={v.bay} />
                    <span className="rounded bg-asfalto px-2 py-0.5 text-xs font-medium text-white">{chavesLabel(v.duasChaves)}</span>
                  </div>
                </div>
                <div className="border-t border-concreto-100 pt-2 flex items-center justify-between text-xs text-asfalto-600">
                  <span className="truncate">{[v.model, v.color].filter(Boolean).join(" • ") || "Modelo não informado"}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {today.length > 0 && (
        <Panel title={`Feitos hoje (${today.length})`}>
          <ul className="space-y-1 text-sm">
            {today.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span className="font-placa text-base font-semibold tracking-wider">{p.plate}</span>
                <span className="text-asfalto-500">{formatDateTime(p.completedAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
