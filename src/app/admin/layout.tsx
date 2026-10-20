import { requireAdmin } from "@/lib/auth/guards";
import { logoutAction } from "@/app/actions/session";
import { NavLink } from "@/components/nav-link";
import { btnQuiet } from "@/components/styles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[14rem_1fr]">
      <aside className="bg-asfalto p-4 lg:sticky lg:top-0 lg:h-screen">
        <p className="mb-6 px-3 font-placa text-2xl font-bold tracking-wide text-white">EMPLACAMENTO SESÉ</p>
        <nav aria-label="Principal" className="flex gap-1 overflow-x-auto lg:flex-col">
          <NavLink href="/admin" exact>Operação</NavLink>
          <NavLink href="/admin/importar">Importar OS</NavLink>
          <NavLink href="/admin/os">Ordens de serviço</NavLink>
          <NavLink href="/admin/operadores">Operadores</NavLink>
          <NavLink href="/admin/historico">Histórico</NavLink>
          <NavLink href="/admin/auditoria">Auditoria</NavLink>
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-end gap-3 border-b border-concreto-200 bg-white px-6 py-3">
          <span className="text-sm text-asfalto-700">{user.name}</span>
          <form action={logoutAction}>
            <button className={btnQuiet}>Sair</button>
          </form>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
