import { z } from "zod";
import { apiAuth } from "@/lib/auth/guards";
import { confirmPlating } from "@/lib/services/completion.service";

const schema = z.object({
  vehicleId: z.string().min(1).max(60),
  scannedVin: z.string().min(1).max(100),
  plate: z.string().min(1).max(20),
  method: z.enum(["SCAN", "MANUAL"]),
});

export async function POST(req: Request) {
  const auth = await apiAuth(req, "OPERATOR");
  if (!auth.ok) return auth.response;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ ok: false, message: "Requisição inválida." }, { status: 400 });
  return Response.json(await confirmPlating({ operatorId: auth.user.id, ...body.data }));
}
