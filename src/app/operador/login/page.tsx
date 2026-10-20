import { redirect } from "next/navigation";

// Login unificado — administradores e operadores entram pelo mesmo formulário
export default function OperatorLoginRedirect() {
  redirect("/login");
}
