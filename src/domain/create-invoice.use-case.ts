import { randomUUID } from "node:crypto";
import type { Invoice } from "../types/invoice";
import type { InvoiceRepository } from "./invoice.repository";

export interface CreateInvoiceInput {
  clientTaxId: string;
  clientName: string;
  clientAddress: string;
  baseAmount: number;
  taxAmount: number;
}

export class CreateInvoiceUseCase {
  constructor(private readonly repository: InvoiceRepository) {}

  async execute(input: CreateInvoiceInput): Promise<Invoice> {
    const invoice: Invoice = {
      id: randomUUID(),
      number: null,
      status: "draft",
      clientTaxId: input.clientTaxId,
      clientName: input.clientName,
      clientAddress: input.clientAddress,
      baseAmount: input.baseAmount,
      taxAmount: input.taxAmount,
      totalAmount: input.baseAmount + input.taxAmount,
      createdAt: new Date().toISOString(),
      closedAt: null,
    };

    await this.repository.save(invoice);

    return invoice;
  }
}
