import type { ReactNode } from "react";
import { card } from "./styles";
import { chavesLabel, retirarChaveLabel } from "@/lib/domain/keys";

/** A placa é o elemento de assinatura do sistema: aparece onde o operador precisa conferir. */
export function PlateTag({ plate, large = false }: { plate: string | null; large?: boolean }) {
  return (
    <span
      className={`inline-flex flex-col overflow-hidden rounded-md border-2 border-asfalto bg-white align-middle ${
        large ? "min-w-[14rem]" : "min-w-[6.5rem]"
      }`}
    >
      <span className={`bg-chapa text-center leading-none text-white ${large ? "py-1 text-xs" : "py-0.5 text-[0.6rem]"}`}>
        BRASIL
      </span>
      <span
        className={`text-center font-placa font-bold tracking-[0.12em] ${large ? "py-2 text-6xl" : "px-2 py-0.5 text-lg"}`}
      >
        {plate ?? "—"}
      </span>
    </span>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-concreto-200 text-asfalto-700" },
  ASSIGNED: { label: "Distribuído", cls: "bg-sinal-100 text-sinal-700" },
  COMPLETED: { label: "Emplacado", cls: "bg-ok-100 text-ok" },
  BLOCKED: { label: "Bloqueado", cls: "bg-erro-100 text-erro" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-concreto-200" };
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

export function KeyBadges({ retirar, duas }: { retirar: boolean | null; duas: boolean | null }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className="rounded bg-chapa-100 px-2 py-0.5 text-xs font-medium text-chapa-700">{retirarChaveLabel(retirar)}</span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          duas === null ? "bg-concreto-200 text-asfalto-500" : "bg-asfalto text-white"
        }`}
      >
        {chavesLabel(duas)}
      </span>
    </span>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <p
      role={err ? "alert" : "status"}
      className={`mb-4 rounded border px-3 py-2 text-sm ${
        err ? "border-erro bg-erro-100 text-erro" : "border-ok bg-ok-100 text-ok"
      }`}
    >
      {err ?? ok}
    </p>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`${card} p-4 ${className}`}>
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

/** Gráfico de barras horizontais em HTML/CSS: sem dependência extra e legível por leitores de tela. */
export function BarList({ items, empty = "Sem dados no período." }: { items: { label: string; value: number }[]; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-asfalto-500">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate text-asfalto-700" title={i.label}>
            {i.label}
          </span>
          <span className="h-3 rounded-sm bg-concreto-100">
            <span className="block h-3 rounded-sm bg-chapa" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium tabular-nums">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}
