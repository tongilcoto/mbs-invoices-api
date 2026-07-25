import type { Invoice } from "../types/invoice";
import type { InvoiceRepository } from "./invoice.repository";
import { InvoiceNotFoundError } from "./errors";

export class GetInvoiceUseCase {
  constructor(private readonly repository: InvoiceRepository) {}

  async execute(id: string): Promise<Invoice> {
    const invoice = await this.repository.findById(id);

    if (!invoice) {
      throw new InvoiceNotFoundError(id);
    }

    return invoice;
  }
}
