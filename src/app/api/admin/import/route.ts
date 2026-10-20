import { apiAuth } from "@/lib/auth/guards";
import { DomainError } from "@/lib/errors";
import { MAX_FILE_BYTES, commitImport, previewImport } from "@/lib/services/import.service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await apiAuth(req, "ADMIN");
  if (!auth.ok) return auth.response;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ ok: false, message: "Envie o arquivo da planilha." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return Response.json({ ok: false, message: "O arquivo passa de 8 MB." }, { status: 413 });
    const buf = Buffer.from(await file.arrayBuffer());

    if (form.get("mode") === "preview") {
      return Response.json({ ok: true, preview: await previewImport(buf) });
    }

    let sheets: unknown;
    try {
      sheets = JSON.parse(String(form.get("sheets") ?? "[]"));
    } catch {
      sheets = [];
    }
    if (!Array.isArray(sheets) || !sheets.every((s) => typeof s === "string")) {
      return Response.json({ ok: false, message: "Abas inválidas." }, { status: 400 });
    }
    const result = await commitImport({
      buf,
      fileName: file.name,
      selectedSheets: sheets,
      operationDate: String(form.get("date") ?? ""),
      externalCode: String(form.get("externalCode") ?? ""),
      userId: auth.user.id,
    });
    return Response.json({ ok: true, result });
  } catch (error) {
    if (error instanceof DomainError) return Response.json({ ok: false, message: error.message }, { status: 400 });
    console.error("Falha na importação", error);
    return Response.json({ ok: false, message: "Erro inesperado ao importar. Tente novamente." }, { status: 500 });
  }
}
