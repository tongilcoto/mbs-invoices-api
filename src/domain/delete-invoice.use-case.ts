import type { InvoiceRepository } from "./invoice.repository";
import { InvoiceAlreadyClosedError, InvoiceNotFoundError } from "./errors";

export class DeleteInvoiceUseCase {
  constructor(private readonly repository: InvoiceRepository) {}

  async execute(id: string): Promise<void> {
    const invoice = await this.repository.findById(id);

    if (!invoice) {
      throw new InvoiceNotFoundError(id);
    }

    if (invoice.status === "closed") {
      throw new InvoiceAlreadyClosedError(id);
    }

    await this.repository.delete(id);
  }
}
