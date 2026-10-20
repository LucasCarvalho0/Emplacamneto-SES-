import Link from "next/link";
import { requireOperator } from "@/lib/auth/guards";
import { logoutAction } from "@/app/actions/session";
import { btnQuiet } from "@/components/styles";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireOperator();
  return (
    <div className="mx-auto min-h-screen max-w-xl">
      <header className="flex items-center justify-between gap-3 bg-asfalto px-4 py-3 text-white">
        <Link href="/operador" className="font-placa text-xl font-bold tracking-wide">EMPLACAMENTO SESÉ</Link>
        <div className="flex items-center gap-3">
          <span className="text-right text-xs leading-tight">
            {user.name}
            <br />
            <span className="text-asfalto-300">Matrícula {user.matricula}</span>
          </span>
          <form action={logoutAction}><button className={btnQuiet}>Sair</button></form>
        </div>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
