import { requireUser } from "@/lib/auth/guards";
import { PasswordForm } from "./form";

export const metadata = { title: "Trocar senha" };

export default async function ChangePasswordPage() {
  const { user } = await requireUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-semibold">Crie sua senha</h1>
      <p className="mb-6 text-sm text-asfalto-500">
        {user.mustChangePassword
          ? `Olá, ${user.name}. A senha temporária só vale para o primeiro acesso.`
          : "Escolha uma nova senha. As outras sessões abertas serão encerradas."}
      </p>
      <PasswordForm />
    </main>
  );
}
