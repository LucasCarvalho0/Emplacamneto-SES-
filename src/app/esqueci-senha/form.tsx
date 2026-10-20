"use client";
import { useActionState } from "react";
import { btnPrimary, field, labelCls } from "@/components/styles";
import { forgotAction, type ForgotState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotAction, {});
  if (state.sent) {
    return (
      <p role="status" className="rounded border border-ok bg-ok-100 px-3 py-2 text-sm text-ok">
        Se o e-mail estiver cadastrado como administrador, enviamos um link válido por 30 minutos.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelCls}>E-mail corporativo</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={field} />
      </div>
      {state.error && <p role="alert" className="text-sm text-erro">{state.error}</p>}
      <button disabled={pending} className={`${btnPrimary} w-full py-3`}>{pending ? "Enviando…" : "Enviar link"}</button>
    </form>
  );
}
