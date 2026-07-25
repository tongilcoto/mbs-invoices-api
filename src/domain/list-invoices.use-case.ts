import type { Invoice } from "../types/invoice";
import type { InvoiceFilter, InvoiceRepository } from "./invoice.repository";

export class ListInvoicesUseCase {
  constructor(private readonly repository: InvoiceRepository) {}

  async execute(filter: InvoiceFilter): Promise<Invoice[]> {
    return this.repository.findAll(filter);
  }
}
