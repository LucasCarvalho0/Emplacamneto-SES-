import { z } from "zod";
import { apiAuth } from "@/lib/auth/guards";
import { validateScan } from "@/lib/services/completion.service";

const schema = z.object({ code: z.string().min(1).max(100), method: z.enum(["SCAN", "MANUAL"]) });

export async function POST(req: Request) {
  const auth = await apiAuth(req, "OPERATOR");
  if (!auth.ok) return auth.response;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ ok: false, message: "Requisição inválida." }, { status: 400 });
  // O operador vem da sessão no servidor. Nada do que o navegador enviar identifica quem ele é.
  return Response.json(await validateScan({ operatorId: auth.user.id, ...body.data }));
}
