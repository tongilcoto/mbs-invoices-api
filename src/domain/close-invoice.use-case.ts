import type { Invoice } from "../types/invoice";
import type { InvoiceRepository } from "./invoice.repository";
import { InvoiceAlreadyClosedError, InvoiceNotFoundError } from "./errors";

const INVOICE_NUMBER_PREFIX = "BT";
const INVOICE_NUMBER_PADDING = 3;

export class CloseInvoiceUseCase {
  constructor(private readonly repository: InvoiceRepository) {}

  async execute(id: string): Promise<Invoice> {
    const invoice = await this.repository.findById(id);

    if (!invoice) {
      throw new InvoiceNotFoundError(id);
    }

    if (invoice.status === "closed") {
      throw new InvoiceAlreadyClosedError(id);
    }

    const sequence = await this.repository.nextSequenceValue(
      INVOICE_NUMBER_PREFIX
    );
    const number = `${INVOICE_NUMBER_PREFIX}${String(sequence).padStart(
      INVOICE_NUMBER_PADDING,
      "0"
    )}`;

    const closedInvoice: Invoice = {
      ...invoice,
      status: "closed",
      number,
      closedAt: new Date().toISOString(),
    };

    await this.repository.update(closedInvoice);

    return closedInvoice;
  }
}
