import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma, VehicleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateOnly, formatDateTime } from "@/lib/time";
import { normalizeCode } from "@/lib/domain/vin";
import { chavesFilter, keyWhere, retirarFilter } from "@/lib/services/filters";
import { one, type SP } from "@/lib/params";
import { Flash, KeyBadges, PageTitle, Panel, PlateTag, StatusBadge } from "@/components/ui";
import { btnPrimary, btnQuiet, field, labelCls, td, th } from "@/components/styles";
import { distributeAction, setKeysAction } from "./actions";

export const dynamic = "force-dynamic";
const PAGE = 200;
const STATUSES: VehicleStatus[] = ["PENDING", "ASSIGNED", "COMPLETED", "BLOCKED"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const os = await db.serviceOrder.findUnique({ where: { id }, include: { importedBy: { select: { name: true } } } });
  if (!os) notFound();

  const status = STATUSES.find((s) => s === one(sp.status));
  const retirar = retirarFilter(one(sp.retirar));
  const chaves = chavesFilter(one(sp.chaves));
  const q = (one(sp.q) ?? "").trim().slice(0, 40);
  const code = normalizeCode(q);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.VehicleWhereInput = {
    serviceOrderId: id,
    ...(status ? { status } : {}),
    ...keyWhere({ retirar, chaves }),
    ...(q ? { OR: [{ plate: { contains: code } }, { vin: { contains: code } }, { bay: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [vehicles, filteredCount, byStatus, openByKeys, operators, busy, batches, batchStats, issues] = await Promise.all([
    db.vehicle.findMany({
      where,
      orderBy: [{ sheetName: "asc" }, { rowNumber: "asc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { assignedTo: { select: { name: true } }, plating: { select: { completedAt: true, operator: { select: { name: true } } } } },
    }),
    db.vehicle.count({ where }),
    db.vehicle.groupBy({ by: ["status"], where: { serviceOrderId: id }, _count: { _all: true } }),
    db.vehicle.groupBy({
      by: ["retirarChave", "duasChaves"],
      where: { serviceOrderId: id, status: "PENDING" },
      _count: { _all: true },
    }),
    db.user.findMany({ where: { role: "OPERATOR", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.vehicle.groupBy({ by: ["assignedToId"], where: { status: "ASSIGNED", assignedToId: { not: null } }, _count: { _all: true } }),
    db.batch.findMany({
      where: { serviceOrderId: id },
      orderBy: { createdAt: "desc" },
      include: { operator: { select: { name: true } } },
    }),
    db.vehicle.groupBy({ by: ["batchId", "status"], where: { serviceOrderId: id, batchId: { not: null } }, _count: { _all: true } }),
    db.importIssue.findMany({ where: { serviceOrderId: id }, orderBy: [{ sheetName: "asc" }, { rowNumber: "asc" }], take: 50 }),
  ]);

  const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
  const pending = count("PENDING");
  const assigned = count("ASSIGNED");
  const done = count("COMPLETED");
  const blocked = count("BLOCKED");
  const pendingOf = (opId: string) => busy.find((b) => b.assignedToId === opId)?._count._all ?? 0;
  const batchCount = (batchId: string, s?: string) =>
    batchStats.filter((b) => b.batchId === batchId && (!s || b.status === s)).reduce((n, b) => n + b._count._all, 0);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (retirar !== "ANY") p.set("retirar", retirar);
    if (chaves !== "ANY") p.set("chaves", chaves);
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `?${p}`;
  };

  return (
    <>
      <PageTitle title={os.code}>
        <a href={`/api/admin/os/${id}/export`} className={btnQuiet}>Exportar CSV</a>
      </PageTitle>
      <Flash ok={one(sp.ok)} err={one(sp.err)} />

      <Panel className="mb-6">
        <p className="text-sm text-asfalto-700">
          Operação de {formatDateOnly(os.operationDate)}. Planilha {os.sourceFileName}, abas {os.sheets.join(", ")}. Importada por{" "}
          {os.importedBy.name} em {formatDateTime(os.importedAt)}.
          {os.externalCode && ` Número da OS: ${os.externalCode}.`}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[["Sem operador", pending], ["Distribuídos", assigned], ["Emplacados", done], ["Bloqueados", blocked], ["Total", pending + assigned + done + blocked]].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-asfalto-500">{k}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Distribuir para um operador">
          <form action={distributeAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="osId" value={id} />
            <div className="sm:col-span-2">
              <label htmlFor="operatorId" className={labelCls}>Operador</label>
              <select id="operatorId" name="operatorId" required className={field} defaultValue="">
                <option value="" disabled>Escolha…</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}{pendingOf(o.id) ? ` (${pendingOf(o.id)} pendentes)` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quantity" className={labelCls}>Quantidade</label>
              <input id="quantity" name="quantity" type="number" min={1} max={1000} defaultValue={20} required className={field} />
            </div>
            <div>
              <label htmlFor="retirar" className={labelCls}>Retirada da chave</label>
              <select id="retirar" name="retirar" className={field} defaultValue="ANY">
                <option value="ANY">Todos</option>
                <option value="SIM">Retira a chave</option>
                <option value="NAO">Não retira a chave</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="chaves" className={labelCls}>Quantidade de chaves</label>
              <select id="chaves" name="chaves" className={field} defaultValue="ANY">
                <option value="ANY">Todas</option>
                <option value="2">2 chaves</option>
                <option value="1">1 chave</option>
                <option value="NI">Não informado</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="busy" /> Enviar mesmo com lote em andamento
            </label>
            <button className={`${btnPrimary} sm:col-span-2`}>Distribuir veículos</button>
          </form>
        </Panel>

        <Panel title="Sem operador, por chave">
          {openByKeys.length === 0 ? (
            <p className="text-sm text-asfalto-500">Todos os veículos já foram distribuídos.</p>
          ) : (
            <ul className="space-y-2">
              {openByKeys.map((r) => (
                <li key={`${r.retirarChave}-${r.duasChaves}`} className="flex items-center justify-between gap-3 text-sm">
                  <KeyBadges retirar={r.retirarChave} duas={r.duasChaves} />
                  <span className="font-semibold tabular-nums">{r._count._all}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-asfalto-500">
            A coluna &quot;2 CHAVES NO VEICULO&quot; da planilha costuma vir vazia. Marque abaixo os veículos que têm 1 ou 2 chaves.
          </p>
        </Panel>
      </div>

      <Panel title="Veículos" className="mb-6">
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="f-status" className={labelCls}>Situação</label>
            <select id="f-status" name="status" defaultValue={status ?? ""} className={field}>
              <option value="">Todas</option>
              <option value="PENDING">Pendente</option>
              <option value="ASSIGNED">Distribuído</option>
              <option value="COMPLETED">Emplacado</option>
              <option value="BLOCKED">Bloqueado</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-retirar" className={labelCls}>Retirada</label>
            <select id="f-retirar" name="retirar" defaultValue={retirar} className={field}>
              <option value="ANY">Todas</option>
              <option value="SIM">Retira a chave</option>
              <option value="NAO">Não retira</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-chaves" className={labelCls}>Chaves</label>
            <select id="f-chaves" name="chaves" defaultValue={chaves} className={field}>
              <option value="ANY">Todas</option>
              <option value="2">2 chaves</option>
              <option value="1">1 chave</option>
              <option value="NI">Não informado</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-q" className={labelCls}>Placa, chassi ou vaga</label>
            <input id="f-q" name="q" defaultValue={q} className={field} />
          </div>
          <button className={btnPrimary}>Filtrar</button>
        </form>

        <form action={setKeysAction}>
          <input type="hidden" name="osId" value={id} />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-asfalto-700">Nos marcados:</span>
            <button name="mode" value="2" className={btnQuiet}>Definir 2 chaves</button>
            <button name="mode" value="1" className={btnQuiet}>Definir 1 chave</button>
            <button name="mode" value="NI" className={btnQuiet}>Limpar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}><span className="sr-only">Marcar</span></th>
                  {["Placa", "Chassi (VIN)", "Modelo e cor", "Vaga", "Chaves", "Situação", "Operador"].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-t border-concreto-200">
                    <td className={td}>
                      {v.status !== "COMPLETED" && <input type="checkbox" name="vehicleId" value={v.id} aria-label={`Marcar ${v.plate ?? v.vin}`} />}
                    </td>
                    <td className={td}><PlateTag plate={v.plate} /></td>
                    <td className={`${td} font-mono text-xs`}>{v.vin}</td>
                    <td className={td}>
                      {v.model ?? "—"}
                      <div className="text-xs text-asfalto-500">{v.color ?? ""}{v.client ? `, ${v.client}` : ""}</div>
                    </td>
                    <td className={td}>{v.bay ?? "—"}</td>
                    <td className={td}><KeyBadges retirar={v.retirarChave} duas={v.duasChaves} /></td>
                    <td className={td}>
                      <StatusBadge status={v.status} />
                      {v.blockReason && <div className="mt-1 max-w-[16rem] text-xs text-erro">{v.blockReason}</div>}
                    </td>
                    <td className={td}>
                      {v.plating ? (
                        <>
                          {v.plating.operator.name}
                          <div className="text-xs text-asfalto-500">{formatDateTime(v.plating.completedAt)}</div>
                        </>
                      ) : (
                        v.assignedTo?.name ?? "—"
                      )}
                    </td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr><td colSpan={8} className={`${td} text-asfalto-500`}>Nenhum veículo com esses filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-asfalto-500">{filteredCount} veículo(s), página {page}</span>
          <span className="flex gap-2">
            {page > 1 && <Link className={btnQuiet} href={qs({ page: String(page - 1) })}>Anterior</Link>}
            {page * PAGE < filteredCount && <Link className={btnQuiet} href={qs({ page: String(page + 1) })}>Próxima</Link>}
          </span>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Lotes">
          {batches.length === 0 ? (
            <p className="text-sm text-asfalto-500">Nenhum lote criado ainda.</p>
          ) : (
            <table className="w-full">
              <thead><tr><th className={th}>Operador</th><th className={th}>Criado em</th><th className={th}>Progresso</th><th className={th}>Situação</th></tr></thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-concreto-200">
                    <td className={td}>{b.operator.name}</td>
                    <td className={td}>{formatDateTime(b.createdAt)}</td>
                    <td className={`${td} tabular-nums`}>{batchCount(b.id, "COMPLETED")} de {batchCount(b.id)}</td>
                    <td className={td}>{b.status === "ACTIVE" ? "Em andamento" : b.status === "FINISHED" ? "Finalizado" : "Cancelado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Linhas rejeitadas na importação">
          {issues.length === 0 ? (
            <p className="text-sm text-asfalto-500">Nenhuma linha foi rejeitada.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {issues.map((i) => (
                <li key={i.id}>
                  Aba {i.sheetName}, linha {i.rowNumber}: {i.message}
                  {i.value ? <span className="text-asfalto-500"> ({i.value})</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
