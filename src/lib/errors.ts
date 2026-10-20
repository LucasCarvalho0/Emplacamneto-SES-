/** Erro de regra de negócio: a mensagem é segura para mostrar ao usuário. */
export class DomainError extends Error {
  readonly code: string;
  constructor(message: string, code = "DOMAIN") {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
