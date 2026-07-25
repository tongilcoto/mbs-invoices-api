import type { Invoice } from "../../types/invoice";
import type {
  InvoiceFilter,
  InvoiceRepository,
} from "../../domain/invoice.repository";

export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly invoices: Invoice[] = [];
  private readonly sequences = new Map<string, number>();

  async connect(): Promise<void> {
    // No hay conexión real que establecer: el almacén vive en memoria del propio proceso.
  }

  async save(invoice: Invoice): Promise<void> {
    this.invoices.push(invoice);
  }

  async findAll(filter: InvoiceFilter): Promise<Invoice[]> {
    return this.invoices.filter((invoice) => {
      if (filter.status && invoice.status !== filter.status) {
        return false;
      }
      if (filter.clientTaxId && invoice.clientTaxId !== filter.clientTaxId) {
        return false;
      }
      return true;
    });
  }

  async findById(id: string): Promise<Invoice | undefined> {
    return this.invoices.find((invoice) => invoice.id === id);
  }

  async update(invoice: Invoice): Promise<void> {
    const index = this.invoices.findIndex((current) => current.id === invoice.id);
    if (index !== -1) {
      this.invoices[index] = invoice;
    }
  }

  async delete(id: string): Promise<void> {
    const index = this.invoices.findIndex((invoice) => invoice.id === id);
    if (index !== -1) {
      this.invoices.splice(index, 1);
    }
  }

  async nextSequenceValue(prefix: string): Promise<number> {
    const next = (this.sequences.get(prefix) ?? 0) + 1;
    this.sequences.set(prefix, next);
    return next;
  }
}
