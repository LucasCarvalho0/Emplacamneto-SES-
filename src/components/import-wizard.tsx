"use client";
import { useState } from "react";
import Link from "next/link";
import type { ImportPreview } from "@/lib/services/import.service";
import { btnPrimary, field, labelCls, td, th } from "./styles";
import { Panel } from "./ui";

interface Done {
  id: string;
  code: string;
  imported: number;
  blocked: number;
  rejected: number;
}

export function ImportWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [externalCode, setExternalCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  async function post(form: FormData) {
    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: form });
      const body = await res.json();
      return { ok: res.ok && body.ok, body };
    } catch {
      return { ok: false, body: { message: "Sem conexão com o servidor." } };
    }
  }

  async function pick(f: File | null) {
    setPreview(null);
    setDone(null);
    setError(null);
    setFile(f);
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) return setError("Envie um arquivo .xlsx.");
    setBusy(true);
    const form = new FormData();
    form.set("mode", "preview");
    form.set("file", f);
    const r = await post(form);
    setBusy(false);
    if (!r.ok) return setError(r.body.message ?? "Não foi possível ler a planilha.");
    const p = r.body.preview as ImportPreview;
    setPreview(p);
    const suggested = p.sheets.filter((s) => s.suggested);
    setSelected(suggested.map((s) => s.name));
    setDate(suggested.find((s) => s.headerDate)?.headerDate ?? "");
  }

  async function commit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("mode", "commit");
    form.set("file", file);
    form.set("sheets", JSON.stringify(selected));
    form.set("date", date);
    form.set("externalCode", externalCode);
    const r = await post(form);
    setBusy(false);
    if (!r.ok) return setError(r.body.message ?? "Falha ao importar.");
    setDone(r.body.result as Done);
    setPreview(null);
  }

  const chosen = preview?.sheets.filter((s) => selected.includes(s.name)) ?? [];
  const headerDates = [...new Set(chosen.map((s) => s.headerDate).filter(Boolean))];
  const total = chosen.reduce((n, s) => n + s.validRows + s.blockedRows, 0);

  return (
    <div className="space-y-6">
      <Panel>
        <label htmlFor="file" className={labelCls}>Planilha da OS (.xlsx)</label>
        <input
          id="file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className={field}
        />
        {busy && !preview && <p className="mt-3 text-sm text-asfalto-500">Lendo a planilha…</p>}
      </Panel>

      {error && (
        <p role="alert" className="rounded border border-erro bg-erro-100 px-3 py-2 text-sm text-erro">{error}</p>
      )}

      {done && (
        <Panel title={`${done.code} criada`}>
          <p className="text-sm">
            {done.imported} veículo(s) importado(s), {done.blocked} bloqueado(s) e {done.rejected} linha(s) rejeitada(s).
          </p>
          <Link href={`/admin/os/${done.id}`} className={`${btnPrimary} mt-4`}>Abrir a OS e distribuir</Link>
        </Panel>
      )}

      {preview && (
        <>
          {preview.alreadyImportedAs && (
            <p role="alert" className="rounded border border-sinal bg-sinal-100 px-3 py-2 text-sm text-sinal-700">
              Este mesmo arquivo já foi importado como {preview.alreadyImportedAs}. A importação será recusada.
            </p>
          )}
          <Panel title="Abas encontradas">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Usar</th>
                    <th className={th}>Aba</th>
                    <th className={th}>Data no cabeçalho</th>
                    <th className={`${th} text-right`}>Válidos</th>
                    <th className={`${th} text-right`}>Bloqueados</th>
                    <th className={`${th} text-right`}>Rejeitados</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sheets.map((s) => (
                    <tr key={s.name} className="border-t border-concreto-200 align-top">
                      <td className={td}>
                        <input
                          type="checkbox"
                          aria-label={`Importar a aba ${s.name}`}
                          disabled={!s.headerFound}
                          checked={selected.includes(s.name)}
                          onChange={(e) =>
                            setSelected((cur) => (e.target.checked ? [...cur, s.name] : cur.filter((n) => n !== s.name)))
                          }
                        />
                      </td>
                      <td className={td}>
                        <span className="font-medium">{s.name}</span>
                        {s.hidden && (
                          <span className="ml-2 rounded bg-sinal-100 px-2 py-0.5 text-xs font-medium text-sinal-700">Aba oculta</span>
                        )}
                        {!s.headerFound && <span className="ml-2 text-xs text-erro">Sem colunas VIN e PLACA</span>}
                        {(s.blockedSample.length > 0 || s.rejectedSample.length > 0) && (
                          <details className="mt-1 text-xs text-asfalto-500">
                            <summary className="cursor-pointer">Ver problemas</summary>
                            <ul className="mt-1 space-y-0.5">
                              {s.blockedSample.map((b) => (
                                <li key={`b${b.rowNumber}`}>Linha {b.rowNumber} (bloqueada): {b.issues.join(", ")}</li>
                              ))}
                              {s.rejectedSample.map((b) => (
                                <li key={`r${b.rowNumber}`}>Linha {b.rowNumber} (rejeitada): {b.reason}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                      <td className={td}>{s.headerDate ? s.headerDate.split("-").reverse().join("/") : "—"}</td>
                      <td className={`${td} text-right tabular-nums`}>{s.validRows}</td>
                      <td className={`${td} text-right tabular-nums`}>{s.blockedRows}</td>
                      <td className={`${td} text-right tabular-nums`}>{s.rejectedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-asfalto-500">
              Abas ocultas vêm desmarcadas porque costumam guardar OS antigas. Marque só se tiver certeza.
            </p>
          </Panel>

          <Panel title="Dados da OS">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className={labelCls}>Data da operação</label>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={field} />
                {headerDates.length > 1 && (
                  <p className="mt-1 text-xs text-sinal-700">As abas escolhidas têm datas diferentes no cabeçalho. Confira.</p>
                )}
                {headerDates.length === 1 && date && headerDates[0] !== date && (
                  <p className="mt-1 text-xs text-sinal-700">A data difere da que está no cabeçalho da planilha.</p>
                )}
              </div>
              <div>
                <label htmlFor="ext" className={labelCls}>Número da OS (opcional)</label>
                <input id="ext" value={externalCode} onChange={(e) => setExternalCode(e.target.value)} maxLength={60} className={field} />
              </div>
            </div>
            <button
              onClick={commit}
              disabled={busy || selected.length === 0 || !date || !!preview.alreadyImportedAs}
              className={`${btnPrimary} mt-4`}
            >
              {busy ? "Importando…" : `Importar ${total} veículo(s)`}
            </button>
          </Panel>
        </>
      )}
    </div>
  );
}
