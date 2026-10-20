/** Remove acentos, caixa e espaços repetidos. Usado para comparar cabeçalhos e valores. */
export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Vazio, #N/A ou qualquer erro do Excel (#REF!, #VALUE!...) = informação ausente. */
export function isMissing(value: unknown): boolean {
  const t = normalizeText(value);
  return t === "" || t === "N/A" || t.startsWith("#");
}

export function cleanText(value: unknown): string | null {
  if (isMissing(value)) return null;
  return String(value).replace(/\s+/g, " ").trim() || null;
}
