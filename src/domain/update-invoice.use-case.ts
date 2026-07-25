import type { Invoice } from "../types/invoice";
import type { InvoiceRepository } from "./invoice.repository";
import { InvoiceAlreadyClosedError, InvoiceNotFoundError } from "./errors";

export interface UpdateInvoiceInput {
  clientTaxId?: string;
  clientName?: string;
  clientAddress?: string;
  baseAmount?: number;
  taxAmount?: number;
}

export class UpdateInvoiceUseCase {
  constructor(private readonly repository: InvoiceRepository) {}

  async execute(id: string, input: UpdateInvoiceInput): Promise<Invoice> {
    const invoice = await this.repository.findById(id);

    if (!invoice) {
      throw new InvoiceNotFoundError(id);
    }

    if (invoice.status === "closed") {
      throw new InvoiceAlreadyClosedError(id);
    }

    const baseAmount = input.baseAmount ?? invoice.baseAmount;
    const taxAmount = input.taxAmount ?? invoice.taxAmount;

    const updatedInvoice: Invoice = {
      ...invoice,
      clientTaxId: input.clientTaxId ?? invoice.clientTaxId,
      clientName: input.clientName ?? invoice.clientName,
      clientAddress: input.clientAddress ?? invoice.clientAddress,
      baseAmount,
      taxAmount,
      totalAmount: baseAmount + taxAmount,
    };

    await this.repository.update(updatedInvoice);

    return updatedInvoice;
  }
}
