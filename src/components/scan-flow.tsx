"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import type { VehicleView } from "@/lib/services/completion.service";
import { BarcodeScanner } from "./barcode-scanner";
import { KeyBadges, PlateTag } from "./ui";
import { btnPrimary, btnQuiet, field, labelCls } from "./styles";
import { useHidScanner } from "@/hooks/use-hid-scanner";

type Method = "SCAN" | "MANUAL";
type InputMode = "hid" | "camera" | "manual";
type Step =
  | { kind: "scan" }
  | { kind: "confirm"; vehicle: VehicleView; scannedVin: string; method: Method }
  | { kind: "done"; plate: string; vin: string }
  | { kind: "refused"; message: string };

async function call<T>(url: string, body: unknown): Promise<T | { ok: false; message: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json()) as T;
  } catch {
    return { ok: false, message: "Sem conexão com o servidor. Nada foi registrado." };
  }
}

export function ScanFlow() {
  const [step, setStep] = useState<Step>({ kind: "scan" });
  const [inputMode, setInputMode] = useState<InputMode>("hid");
  const [manual, setManual] = useState("");
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  // Flash visual quando o coletor lê um código
  const [hidFlash, setHidFlash] = useState(false);
  const manualRef = useRef<HTMLInputElement>(null);

  const buzz = (ms: number) => navigator.vibrate?.(ms);

  async function validate(code: string, method: Method) {
    if (busy) return;
    setBusy(true);
    const r = await call<{ ok: true; vehicle: VehicleView }>("/api/operador/validar", { code, method });
    setBusy(false);
    if (r.ok && "vehicle" in r) {
      buzz(80);
      setPlate("");
      setPlateError(null);
      setStep({ kind: "confirm", vehicle: r.vehicle, scannedVin: r.vehicle.vin, method });
    } else {
      buzz(400);
      setStep({ kind: "refused", message: "message" in r ? r.message : "Leitura recusada." });
    }
  }

  async function confirm() {
    if (step.kind !== "confirm" || busy) return;
    setBusy(true);
    setPlateError(null);
    const r = await call<{ ok: true; plate: string; vin: string }>("/api/operador/confirmar", {
      vehicleId: step.vehicle.id,
      scannedVin: step.scannedVin,
      plate,
      method: step.method,
    });
    setBusy(false);
    if (r.ok && "plate" in r) {
      buzz(150);
      setStep({ kind: "done", plate: r.plate, vin: r.vin });
    } else {
      buzz(400);
      const message = "message" in r ? r.message : "Confirmação recusada.";
      const code = "code" in r ? (r as { code?: string }).code : undefined;
      if (code === "PLATE_MISMATCH") setPlateError(message);
      else setStep({ kind: "refused", message });
    }
  }

  const again = () => {
    setManual("");
    setStep({ kind: "scan" });
  };

  // Coletor HID: só intercepta quando estamos na tela de scan
  useHidScanner(
    (code) => {
      if (step.kind !== "scan" || busy) return;
      setHidFlash(true);
      setTimeout(() => setHidFlash(false), 600);
      validate(code, "SCAN");
    },
    { minLength: 6, maxGapMs: 50 },
  );

  /* ── Tela de resultado: recusado ──────────────────────────────── */
  if (step.kind === "refused") {
    return (
      <div role="alert" className="space-y-4">
        <div className="rounded-md border-2 border-erro bg-erro-100 p-5">
          <p className="text-xl font-semibold text-erro">Não emplacar</p>
          <p className="mt-2 text-base">{step.message}</p>
        </div>
        <button onClick={again} className={`${btnPrimary} w-full py-3`}>
          Ler outro veículo
        </button>
      </div>
    );
  }

  /* ── Tela de resultado: sucesso ───────────────────────────────── */
  if (step.kind === "done") {
    return (
      <div role="status" className="space-y-4">
        <div className="rounded-md border-2 border-ok bg-ok-100 p-5 text-center">
          <p className="mb-3 text-xl font-semibold text-ok">Emplacamento registrado ✓</p>
          <PlateTag plate={step.plate} large />
          <p className="mt-3 font-mono text-xs">{step.vin}</p>
        </div>
        <button onClick={again} className={`${btnPrimary} w-full py-3`}>
          Próximo veículo
        </button>
        <Link href="/operador" className={`${btnQuiet} w-full`}>
          Voltar aos meus serviços
        </Link>
      </div>
    );
  }

  /* ── Tela de confirmação ──────────────────────────────────────── */
  if (step.kind === "confirm") {
    const v = step.vehicle;
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-concreto-200 bg-white p-4 text-center">
          <p className="mb-2 text-sm text-asfalto-500">Placa autorizada para este veículo</p>
          <PlateTag plate={v.plate} large />
          <p className="mt-3 font-mono text-sm">{v.vin}</p>
          <p className="mt-1 text-sm">{[v.model, v.color].filter(Boolean).join(", ")}</p>
          {v.bay && <p className="text-sm text-asfalto-500">Vaga {v.bay}</p>}
          <div className="mt-3">
            <KeyBadges retirar={v.retirarChave} duas={v.duasChaves} />
          </div>
        </div>

        <div className="rounded-md border border-concreto-200 bg-white p-4">
          <label htmlFor="plate" className={labelCls}>
            Digite a placa que você instalou
          </label>
          <input
            id="plate"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!plateError}
            className={`${field} text-center font-placa text-3xl tracking-[0.12em]`}
          />
          {plateError && (
            <p role="alert" className="mt-2 text-sm font-medium text-erro">
              {plateError}
            </p>
          )}
          <button
            onClick={confirm}
            disabled={busy || plate.replace("-", "").length < 7}
            className={`${btnPrimary} mt-4 w-full py-3 text-base`}
          >
            {busy ? "Registrando…" : "Confirmar emplacamento"}
          </button>
        </div>
        <button onClick={again} className={`${btnQuiet} w-full`}>
          Cancelar e ler outro
        </button>
      </div>
    );
  }

  /* ── Tela de leitura (step === "scan") ───────────────────────── */
  return (
    <div className="space-y-4">
      {/* Flash visual quando coletor HID lê */}
      {hidFlash && (
        <div className="pointer-events-none fixed inset-0 z-50 animate-ping bg-sinal/20" />
      )}

      {/* Seletor de modo de entrada */}
      <div className="flex rounded-md border border-concreto-200 bg-white p-1 text-sm">
        {(
          [
            { id: "hid", label: "🔫 Coletor", title: "Leitor HID / pistola" },
            { id: "camera", label: "📷 Câmera", title: "Câmera do aparelho" },
            { id: "manual", label: "⌨️ Digitar", title: "Digitação manual" },
          ] as { id: InputMode; label: string; title: string }[]
        ).map((m) => (
          <button
            key={m.id}
            title={m.title}
            onClick={() => {
              setInputMode(m.id);
              if (m.id === "manual") setTimeout(() => manualRef.current?.focus(), 50);
            }}
            className={`flex-1 rounded py-2 font-medium transition-colors ${
              inputMode === m.id
                ? "bg-asfalto text-white"
                : "text-asfalto-500 hover:bg-concreto-100"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Modo coletor HID */}
      {inputMode === "hid" && (
        <div className="rounded-md border-2 border-dashed border-sinal/60 bg-sinal/5 p-6 text-center">
          {busy ? (
            <div className="flex flex-col items-center gap-3">
              <svg className="h-8 w-8 animate-spin text-sinal" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-asfalto-500">Conferindo no servidor…</p>
            </div>
          ) : (
            <>
              <p className="text-4xl">🔫</p>
              <p className="mt-3 text-lg font-semibold text-asfalto">Pronto para leitura</p>
              <p className="mt-1 text-sm text-asfalto-500">
                Aponte o coletor para o código de barras e pressione o gatilho.
              </p>
              <p className="mt-3 rounded bg-sinal/10 px-3 py-1 text-xs font-mono text-asfalto-500">
                Aguardando sinal do coletor…
              </p>
            </>
          )}
        </div>
      )}

      {/* Modo câmera */}
      {inputMode === "camera" && (
        <div className="space-y-2">
          <BarcodeScanner onDetect={(text) => validate(text, "SCAN")} />
          <p className="text-sm text-asfalto-500">
            Aponte a câmera para o código de barras. A leitura é automática.
          </p>
        </div>
      )}

      {/* Modo digitação manual */}
      {inputMode === "manual" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            validate(manual, "MANUAL");
          }}
          className="rounded-md border border-concreto-200 bg-white p-4"
        >
          <label htmlFor="vin" className={labelCls}>
            Chassi completo (17 caracteres)
          </label>
          <input
            id="vin"
            ref={manualRef}
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            maxLength={20}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="ex: 94DFCAP15TB126695"
            className={`${field} font-mono text-base`}
          />
          <p className="mt-1 text-xs text-asfalto-400">
            {manual.length}/17 caracteres
            {manual.length === 17 && " ✓"}
          </p>
          <button
            disabled={busy || manual.trim().length < 17}
            className={`${btnPrimary} mt-3 w-full`}
          >
            {busy ? "Conferindo…" : "Validar chassi"}
          </button>
        </form>
      )}
    </div>
  );
}
