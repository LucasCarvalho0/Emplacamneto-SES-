import Link from "next/link";
import { ForgotForm } from "./form";

export const metadata = { title: "Esqueci a senha" };

export default function ForgotPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-semibold">Esqueci a senha</h1>
      <p className="mb-6 text-sm text-asfalto-500">
        Vale para o painel administrativo. Operadores pedem uma nova senha ao administrativo.
      </p>
      <ForgotForm />
      <Link href="/login" className="mt-6 text-sm font-medium text-chapa underline">Voltar ao login</Link>
    </main>
  );
}
