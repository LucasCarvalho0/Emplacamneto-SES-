"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

const fieldDark =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-chapa/60 focus:bg-white/10 focus:ring-2 focus:ring-chapa/30 transition-all duration-200";

const labelDark = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const isEmail = identifier.includes("@");

  const hintText = isEmail
    ? "🔑 Acesso administrativo"
    : identifier
    ? "🪪 Acesso de operador"
    : "Administrativos usam e-mail · Operadores usam matrícula";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Campo identificador */}
      <div>
        <label htmlFor="identifier" className={labelDark}>
          E-mail ou matrícula
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          inputMode={isEmail ? "email" : "text"}
          autoComplete="username"
          autoCapitalize="none"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="seu@email.com ou MATRICULA"
          className={fieldDark}
        />
        <p className={`mt-1.5 text-xs font-medium ${
          isEmail
            ? "text-sinal"
            : identifier
            ? "text-white/80"
            : "text-white/50"
        }`}>{hintText}</p>

      </div>

      {/* Campo senha */}
      <div>
        <label htmlFor="password" className={labelDark}>
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={`${fieldDark} pr-20`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/40 hover:text-white/70 transition-colors duration-150"
          >
            {show ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {/* Erro */}
      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-erro/40 bg-erro/10 px-4 py-3 text-sm text-erro"
        >
          <span>✕</span>
          <span>{state.error}</span>
        </div>
      )}

      {/* Botão entrar */}
      <button
        type="submit"
        disabled={pending}
        className="relative w-full overflow-hidden rounded-xl bg-chapa py-3.5 text-sm font-bold text-white shadow-lg shadow-chapa/30 transition-all duration-200 hover:bg-chapa-700 hover:shadow-chapa/50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Entrando…
          </span>
        ) : (
          "Entrar"
        )}
      </button>

      {/* Esqueci senha */}
      {isEmail && (
        <p className="text-center text-xs text-white/40">
          <Link
            href="/esqueci-senha"
            className="font-semibold text-chapa/80 underline decoration-chapa/30 underline-offset-2 hover:text-chapa hover:decoration-chapa transition-colors duration-150"
          >
            Esqueci minha senha
          </Link>
        </p>
      )}
    </form>
  );
}

export default LoginForm;
export const LoginFormUnified = LoginForm;
