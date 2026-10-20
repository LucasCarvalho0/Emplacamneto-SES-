import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateOnly, formatDateTime } from "@/lib/time";
import { normalizeCode } from "@/lib/domain/vin";
import { one, type SP } from "@/lib/params";
import { PageTitle, Panel } from "@/components/ui";
import { btnPrimary, field, td, th } from "@/components/styles";

export const metadata = { title: "Ordens de serviço" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").trim().slice(0, 40);
  const code = normalizeCode(q);
  const where: Prisma.ServiceOrderWhereInput = q
    ? {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { externalCode: { contains: q, mode: "insensitive" } },
          { vehicles: { some: { OR: [{ plate: { contains: code } }, { vin: { contains: code } }] } } },
        ],
      }
    : {};

  const orders = await db.serviceOrder.findMany({
    where,
    orderBy: [{ operationDate: "desc" }, { importedAt: "desc" }],
    take: 100,
    include: { importedBy: { select: { name: true } } },
  });
  const groups = await db.vehicle.groupBy({
    by: ["serviceOrderId", "status"],
    where: { serviceOrderId: { in: orders.map((o) => o.id) } },
    _count: { _all: true },
  });
  const n = (osId: string, status: string) =>
    groups.find((g) => g.serviceOrderId === osId && g.status === status)?._count._all ?? 0;

  return (
    <>
      <PageTitle title="Ordens de serviço">
        <Link href="/admin/importar" className={btnPrimary}>Importar nova OS</Link>
      </PageTitle>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por OS, placa ou chassi" className={`${field} max-w-sm`} aria-label="Buscar" />
        <button className={btnPrimary}>Buscar</button>
      </form>
      <Panel className="overflow-x-auto p-0">
        <table className="w-full">
          <thead>
            <tr>
              {["OS", "Data", "Planilha", "Total", "Autorizados", "Distribuídos", "Emplacados", "Pendentes", "Bloqueados", "Importada por"].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const pending = n(o.id, "PENDING");
              const assigned = n(o.id, "ASSIGNED");
              const done = n(o.id, "COMPLETED");
              const blocked = n(o.id, "BLOCKED");
              return (
                <tr key={o.id} className="border-t border-concreto-200">
                  <td className={td}>
                    <Link href={`/admin/os/${o.id}`} className="font-medium text-chapa underline">{o.code}</Link>
                    {o.externalCode && <div className="text-xs text-asfalto-500">{o.externalCode}</div>}
                  </td>
                  <td className={td}>{formatDateOnly(o.operationDate)}</td>
                  <td className={`${td} max-w-[14rem] truncate`} title={o.sourceFileName}>{o.sourceFileName}</td>
                  <td className={`${td} tabular-nums`}>{pending + assigned + done + blocked}</td>
                  <td className={`${td} tabular-nums`}>{pending + assigned + done}</td>
                  <td className={`${td} tabular-nums`}>{assigned + done}</td>
                  <td className={`${td} tabular-nums`}>{done}</td>
                  <td className={`${td} tabular-nums`}>{pending + assigned}</td>
                  <td className={`${td} tabular-nums`}>{blocked}</td>
                  <td className={td}>
                    {o.importedBy.name}
                    <div className="text-xs text-asfalto-500">{formatDateTime(o.importedAt)}</div>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={10} className={`${td} text-asfalto-500`}>Nenhuma OS encontrada. Importe a primeira planilha.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
