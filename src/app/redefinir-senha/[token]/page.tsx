import Link from "next/link";
import { isResetTokenValid } from "@/lib/auth/reset";
import { ResetForm } from "./form";

export const metadata = { title: "Redefinir senha" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await isResetTokenValid(token);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-4 text-2xl font-semibold">Redefinir senha</h1>
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <>
          <p role="alert" className="rounded border border-erro bg-erro-100 px-3 py-2 text-sm text-erro">
            Este link venceu ou já foi usado.
          </p>
          <Link href="/esqueci-senha" className="mt-4 text-sm font-medium text-chapa underline">Pedir um novo link</Link>
        </>
      )}
    </main>
  );
}
