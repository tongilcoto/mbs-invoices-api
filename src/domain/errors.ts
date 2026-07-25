export class InvoiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Invoice ${id} not found`);
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceAlreadyClosedError extends Error {
  constructor(id: string) {
    super(`Invoice ${id} is already closed`);
    this.name = "InvoiceAlreadyClosedError";
  }
}
