import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { historyWhere } from "@/lib/services/history";
import { one, type SP } from "@/lib/params";
import { PageTitle, Panel, PlateTag } from "@/components/ui";
import { btnPrimary, btnQuiet, field, labelCls, td, th } from "@/components/styles";

export const metadata = { title: "Histórico" };
export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const f = { from: one(sp.from), to: one(sp.to), op: one(sp.op), q: one(sp.q)?.slice(0, 40) };
  const [rows, operators, total] = await Promise.all([
    db.plating.findMany({
      where: historyWhere(f),
      orderBy: { completedAt: "desc" },
      take: 300,
      include: {
        operator: { select: { name: true, matricula: true } },
        vehicle: { select: { model: true, serviceOrder: { select: { code: true } } } },
      },
    }),
    db.user.findMany({ where: { role: "OPERATOR" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.plating.count({ where: historyWhere(f) }),
  ]);
  const exportQs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <PageTitle title="Histórico de emplacamentos">
        <a href={`/api/admin/historico/export?${exportQs}`} className={btnQuiet}>Exportar CSV</a>
      </PageTitle>
      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-concreto-200 bg-white p-4">
        <div><label className={labelCls} htmlFor="from">De</label><input id="from" name="from" type="date" defaultValue={f.from ?? ""} className={field} /></div>
        <div><label className={labelCls} htmlFor="to">Até</label><input id="to" name="to" type="date" defaultValue={f.to ?? ""} className={field} /></div>
        <div>
          <label className={labelCls} htmlFor="op">Operador</label>
          <select id="op" name="op" defaultValue={f.op ?? ""} className={field}>
            <option value="">Todos</option>
            {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div><label className={labelCls} htmlFor="q">Placa ou chassi</label><input id="q" name="q" defaultValue={f.q ?? ""} className={field} /></div>
        <button className={btnPrimary}>Filtrar</button>
      </form>
      <Panel className="overflow-x-auto p-0">
        <table className="w-full">
          <thead>
            <tr>{["Quando", "Placa", "Chassi (VIN)", "Modelo", "OS", "Operador", "Leitura"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-concreto-200">
                <td className={td}>{formatDateTime(r.completedAt)}</td>
                <td className={td}><PlateTag plate={r.plate} /></td>
                <td className={`${td} font-mono text-xs`}>{r.vin}</td>
                <td className={td}>{r.vehicle.model ?? "—"}</td>
                <td className={td}>{r.vehicle.serviceOrder.code}</td>
                <td className={td}>{r.operator.name}<div className="text-xs text-asfalto-500">{r.operator.matricula}</div></td>
                <td className={td}>{r.method === "SCAN" ? "Código de barras" : "Digitado"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className={`${td} text-asfalto-500`}>Nenhum emplacamento nesse filtro.</td></tr>}
          </tbody>
        </table>
      </Panel>
      {total > rows.length && <p className="mt-3 text-sm text-asfalto-500">Mostrando {rows.length} de {total}. Exporte o CSV para ver tudo.</p>}
    </>
  );
}
