import type { Invoice, InvoiceStatus } from "../types/invoice";

export interface InvoiceFilter {
  status?: InvoiceStatus;
  clientTaxId?: string;
}

export interface InvoiceRepository {
  connect(): Promise<void>;
  save(invoice: Invoice): Promise<void>;
  findAll(filter: InvoiceFilter): Promise<Invoice[]>;
  findById(id: string): Promise<Invoice | undefined>;
  update(invoice: Invoice): Promise<void>;
  delete(id: string): Promise<void>;
  nextSequenceValue(prefix: string): Promise<number>;
}
