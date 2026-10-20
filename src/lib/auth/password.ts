import { randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

// Argon2id (o padrão desta biblioteca) com custo recomendado pela OWASP para uso geral.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

let dummyHash: Promise<string> | null = null;

/**
 * Verifica a senha. Quando o usuário não existe, compara contra um hash falso para que o
 * tempo de resposta não revele se a conta existe.
 */
export async function verifyPassword(storedHash: string | null, password: string): Promise<boolean> {
  dummyHash ??= hashPassword("senha-falsa-para-igualar-o-tempo");
  try {
    const ok = await verify(storedHash ?? (await dummyHash), password);
    return ok && storedHash !== null;
  } catch {
    return false;
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // sem 0/O/1/l/I

/** Senha temporária para novos operadores e redefinições. Exige troca no primeiro acesso. */
export function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function passwordProblem(password: string, _matricula?: string | null): string | null {
  if (password.length < 3) return "A senha precisa ter pelo menos 3 caracteres.";
  if (password.length > 128) return "A senha pode ter no máximo 128 caracteres.";
  return null;
}
