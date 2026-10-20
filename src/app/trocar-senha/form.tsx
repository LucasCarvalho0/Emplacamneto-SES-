"use client";
import { useActionState } from "react";
import { btnPrimary, field, labelCls } from "@/components/styles";
import { changePasswordAction, type PasswordState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="current" className={labelCls}>Senha atual</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className={field} />
      </div>
      <div>
        <label htmlFor="next" className={labelCls}>Nova senha (mínimo de 10 caracteres)</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={10} required className={field} />
      </div>
      <div>
        <label htmlFor="confirm" className={labelCls}>Repita a nova senha</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required className={field} />
      </div>
      {state.error && (
        <p role="alert" className="rounded border border-erro bg-erro-100 px-3 py-2 text-sm text-erro">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3`}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
