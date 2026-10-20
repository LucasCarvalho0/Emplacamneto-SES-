import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./form";
import Image from "next/image";

export const metadata = { title: "Entrar — Emplacamento Sesé" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ senha?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (session) redirect(session.user.role === "ADMIN" ? "/admin" : "/operador");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-asfalto">
      {/* Gradient blobs decorativos */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-chapa opacity-20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-chapa-700 opacity-20 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sinal opacity-10 blur-[100px]" />
      </div>

      {/* Grade sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Card principal */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="rounded-2xl border border-white/10 p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Logo + cabeçalho */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 overflow-hidden rounded-xl bg-white/10 p-3 shadow-lg ring-1 ring-white/20">
              <Image
                src="/sese-logo.jpg"
                alt="Logo Sesé"
                width={140}
                height={60}
                className="h-14 w-auto object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Bem-vindo de volta
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Emplacamento Sesé — Sistema de Controle
            </p>
          </div>

          {/* Alerta senha redefinida */}
          {sp.senha === "redefinida" && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
              <span>✓</span>
              <span>Senha redefinida. Entre com a nova senha.</span>
            </div>
          )}

          {/* Formulário */}
          <LoginFormStyled />
        </div>

        {/* Rodapé */}
        <p className="mt-6 text-center text-xs text-white/25">
          © {new Date().getFullYear()} Sesé Emplacamento. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}

// Wrapper para o form já existente, apenas envolve com estilos extras
function LoginFormStyled() {
  return <LoginForm />;
}
