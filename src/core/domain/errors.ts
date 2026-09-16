export class InvalidDocumentError extends Error {
  constructor(document: string) {
    super(`Documento inválido: ${document}`);
    this.name = "InvalidDocumentError";
  }
}

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Cliente não encontrado para o documento informado.");
    this.name = "CustomerNotFoundError";
  }
}

export class CustomerInactiveError extends Error {
  constructor() {
    super("Cliente inativo.");
    this.name = "CustomerInactiveError";
  }
}
