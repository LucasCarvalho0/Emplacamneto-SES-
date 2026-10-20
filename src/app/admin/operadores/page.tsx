import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { one, type SP } from "@/lib/params";
import { CreateOperatorForm, ResetPasswordForm } from "@/components/operator-forms";
import { Flash, PageTitle, Panel } from "@/components/ui";
import { btnDanger, btnQuiet, btnPrimary, field, td, th } from "@/components/styles";
import { redistributeAction, toggleActiveAction } from "./actions";

export const metadata = { title: "Operadores" };
export const dynamic = "force-dynamic";

export default async function OperatorsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [operators, pending, done] = await Promise.all([
    db.user.findMany({ where: { role: "OPERATOR" }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.vehicle.groupBy({ by: ["assignedToId"], where: { status: "ASSIGNED", assignedToId: { not: null } }, _count: { _all: true } }),
    db.plating.groupBy({ by: ["operatorId"], _count: { _all: true } }),
  ]);
  const pendingOf = (id: string) => pending.find((p) => p.assignedToId === id)?._count._all ?? 0;
  const doneOf = (id: string) => done.find((p) => p.operatorId === id)?._count._all ?? 0;
  const activeOps = operators.filter((o) => o.active);

  return (
    <>
      <PageTitle title="Operadores" />
      <Flash ok={one(sp.ok)} err={one(sp.err)} />
      <Panel title="Novo operador" className="mb-6">
        <CreateOperatorForm />
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <table className="w-full">
          <thead>
            <tr>
              {["Nome", "Matrícula", "Situação", "Último acesso", "Pendentes", "Emplacados", "Ações"].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {operators.map((o) => {
              const open = pendingOf(o.id);
              return (
                <tr key={o.id} className="border-t border-concreto-200 align-top">
                  <td className={td}>{o.name}</td>
                  <td className={`${td} font-mono`}>{o.matricula}</td>
                  <td className={td}>
                    {o.active ? "Ativo" : <span className="font-medium text-erro">Desativado</span>}
                    {!o.active && open > 0 && (
                      <div className="mt-1 max-w-[14rem] text-xs text-erro">Ainda tem {open} veículo(s) pendente(s). Redistribua.</div>
                    )}
                  </td>
                  <td className={td}>{o.lastLoginAt ? formatDateTime(o.lastLoginAt) : "Nunca entrou"}</td>
                  <td className={`${td} tabular-nums`}>{open}</td>
                  <td className={`${td} tabular-nums`}>{doneOf(o.id)}</td>
                  <td className={td}>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <form action={toggleActiveAction}>
                          <input type="hidden" name="userId" value={o.id} />
                          <button className={o.active ? btnDanger : btnQuiet}>{o.active ? "Desativar" : "Reativar"}</button>
                        </form>
                        <ResetPasswordForm userId={o.id} />
                      </div>
                      {open > 0 && (
                        <form action={redistributeAction} className="flex gap-2">
                          <input type="hidden" name="fromId" value={o.id} />
                          <select name="toId" required defaultValue="" aria-label={`Passar pendentes de ${o.name} para`} className={`${field} w-44`}>
                            <option value="" disabled>Passar pendentes para…</option>
                            {activeOps.filter((x) => x.id !== o.id).map((x) => (
                              <option key={x.id} value={x.id}>{x.name}</option>
                            ))}
                          </select>
                          <button className={btnPrimary}>Passar</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {operators.length === 0 && (
              <tr><td colSpan={7} className={`${td} text-asfalto-500`}>Nenhum operador cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
