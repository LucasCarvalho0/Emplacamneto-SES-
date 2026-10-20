"use client";
import { useActionState, useState } from "react";
import {
  createOperatorAction,
  resetPasswordAction,
  type OperatorFormState,
} from "@/app/admin/operadores/actions";
import { btnPrimary, btnQuiet, field, labelCls } from "./styles";

function TempPassword({ state }: { state: OperatorFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="mt-3 rounded border border-erro bg-erro-100 px-3 py-2 text-sm text-erro">
        {state.error}
      </p>
    );
  }
  if (!state.message) return null;
  return (
    <div role="status" className="mt-3 rounded border border-sinal bg-sinal-100 px-3 py-2 text-sm">
      <p>{state.message}</p>
      {state.tempPassword && (
        <>
          <p className="mt-1">
            Senha temporária: <strong className="select-all font-mono text-base">{state.tempPassword}</strong>
          </p>
          <p className="mt-1 text-xs text-sinal-700">Ela aparece só agora. O operador troca no primeiro acesso.</p>
        </>
      )}
    </div>
  );
}

export function CreateOperatorForm() {
  const [state, action, pending] = useActionState<OperatorFormState, FormData>(createOperatorAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action}>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr_auto] sm:items-end">
        <div>
          <label htmlFor="name" className={labelCls}>Nome completo</label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            placeholder="Ex: João da Silva"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="matricula" className={labelCls}>Matrícula</label>
          <input
            id="matricula"
            name="matricula"
            required
            maxLength={20}
            placeholder="Ex: 12345"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelCls}>Senha do operador</label>
          <div className="flex gap-1.5">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={3}
              maxLength={128}
              placeholder="Digite a senha (ex: 123456)"
              className={field}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className={btnQuiet}
              title={showPassword ? "Ocultar senha" : "Ver senha"}
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Cadastrando…" : "Cadastrar operador"}
        </button>
      </div>
      <p className="mt-1 text-xs text-asfalto-500">
        Você define a senha do operador diretamente (pode conter números, letras ou a própria matrícula).
      </p>
      <TempPassword state={state} />
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<OperatorFormState, FormData>(resetPasswordAction, {});
  const [open, setOpen] = useState(false);
  const [customPass, setCustomPass] = useState("");

  if (!open) {
    return (
      <div className="inline-block">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={btnQuiet}
          title="Alterar a senha deste operador"
        >
          Trocar senha
        </button>
        <TempPassword state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="mt-1 space-y-2 rounded border border-concreto-300 bg-white p-2 text-sm shadow-sm">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="password"
          type="text"
          value={customPass}
          onChange={(e) => setCustomPass(e.target.value)}
          placeholder="Nova senha (ex: 123456)"
          required
          minLength={3}
          className={`${field} w-44 py-1 text-xs`}
        />
        <button disabled={pending} className={`${btnPrimary} py-1 text-xs`}>
          {pending ? "Salvando…" : "Salvar senha"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setCustomPass("");
          }}
          className={`${btnQuiet} py-1 text-xs`}
        >
          Cancelar
        </button>
      </div>
      <TempPassword state={state} />
    </form>
  );
}
