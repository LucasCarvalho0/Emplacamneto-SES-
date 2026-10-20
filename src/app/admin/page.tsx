import { db } from "@/lib/db";
import { getDashboard } from "@/lib/services/dashboard.service";
import { parseDateInput, formatDateOnly, SHIFTS } from "@/lib/time";
import { one, type SP } from "@/lib/params";
import { chavesLabel, retirarChaveLabel } from "@/lib/domain/keys";
import { BarList, PageTitle, Panel } from "@/components/ui";
import { btnPrimary, field, labelCls, td, th } from "@/components/styles";

export const metadata = { title: "Operação" };
export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = {
    from: parseDateInput(one(sp.from)),
    to: parseDateInput(one(sp.to)),
    osId: one(sp.os) || null,
    operatorId: one(sp.op) || null,
    shift: (SHIFTS.find((x) => x.id === one(sp.shift))?.id ?? null) as "MANHA" | "TARDE" | "NOITE" | null,
    bay: (one(sp.bay) ?? "").trim().slice(0, 20) || null,
  };
  const [data, orders, operators] = await Promise.all([
    getDashboard(filters),
    db.serviceOrder.findMany({ orderBy: { operationDate: "desc" }, take: 100, select: { id: true, code: true, operationDate: true } }),
    db.user.findMany({ where: { role: "OPERATOR" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const { kpi, operators: ops } = data;

  const stats: [string, number][] = [
    ["Importados", kpi.total],
    ["Autorizados", kpi.authorized],
    ["Distribuídos", kpi.distributed],
    ["Sem operador", kpi.unassigned],
    ["Pendentes de emplacar", kpi.pending],
    ["Bloqueados", kpi.blocked],
  ];
  const opStats: [string, number][] = [
    ["Operadores ativos", ops.active],
    ["Trabalhando", ops.working],
    ["Disponíveis", ops.available],
    ["Lote finalizado hoje", ops.finished],
  ];

  return (
    <>
      <PageTitle title="Operação" />

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-concreto-200 bg-white p-4">
        <div>
          <label className={labelCls} htmlFor="from">Data inicial</label>
          <input id="from" name="from" type="date" defaultValue={filters.from ?? ""} className={field} />
        </div>
        <div>
          <label className={labelCls} htmlFor="to">Data final</label>
          <input id="to" name="to" type="date" defaultValue={filters.to ?? ""} className={field} />
        </div>
        <div>
          <label className={labelCls} htmlFor="os">Ordem de serviço</label>
          <select id="os" name="os" defaultValue={filters.osId ?? ""} className={field}>
            <option value="">Todas</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.code} ({formatDateOnly(o.operationDate)})</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="op">Operador</label>
          <select id="op" name="op" defaultValue={filters.operatorId ?? ""} className={field}>
            <option value="">Todos</option>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="shift">Turno (gráficos)</label>
          <select id="shift" name="shift" defaultValue={filters.shift ?? ""} className={field}>
            <option value="">Todos</option>
            {SHIFTS.map((x) => (
              <option key={x.id} value={x.id}>{x.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="bay">Vaga</label>
          <input id="bay" name="bay" defaultValue={filters.bay ?? ""} maxLength={20} className={`${field} w-32`} />
        </div>
        <button className={btnPrimary}>Aplicar filtros</button>
      </form>

      <Panel className="mb-6">
        <p className="text-sm text-asfalto-500">Progresso do período</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {kpi.completed} <span className="text-lg font-normal text-asfalto-500">de {kpi.authorized} emplacados ({data.progress}%)</span>
        </p>
        <div
          className="mt-3 h-4 rounded-sm bg-concreto-100"
          role="progressbar"
          aria-valuenow={data.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso de emplacamento"
        >
          <div className="h-4 rounded-sm bg-ok" style={{ width: `${data.progress}%` }} />
        </div>
      </Panel>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Veículos">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {stats.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-asfalto-500">{k}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Operadores">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {opStats.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-asfalto-500">{k}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel title="Ainda por emplacar, separados por chave" className="mb-6">
        {data.openByKeys.length === 0 ? (
          <p className="text-sm text-asfalto-500">Nenhum veículo pendente.</p>
        ) : (
          <table className="w-full max-w-xl">
            <thead>
              <tr><th className={th}>Retirada</th><th className={th}>Chaves</th><th className={`${th} text-right`}>Veículos</th></tr>
            </thead>
            <tbody>
              {data.openByKeys.map((r) => (
                <tr key={`${r.retirarChave}-${r.duasChaves}`} className="border-t border-concreto-200">
                  <td className={td}>{retirarChaveLabel(r.retirarChave)}</td>
                  <td className={td}>{chavesLabel(r.duasChaves)}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Pendentes e concluídos"><BarList items={data.charts.pendingVsDone} /></Panel>
        <Panel title="Emplacamentos por operador"><BarList items={data.charts.perOperator} /></Panel>
        <Panel title="Emplacamentos por hora"><BarList items={data.charts.perHour} /></Panel>
        <Panel title="Emplacamentos por turno"><BarList items={data.charts.perShift} /></Panel>
        <Panel title="Evolução ao longo do dia (acumulado)" className="lg:col-span-2"><BarList items={data.charts.evolution} /></Panel>
      </div>
    </>
  );
}
