export type InvoiceStatus = "draft" | "closed";

export interface Invoice {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  clientTaxId: string;
  clientName: string;
  clientAddress: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  closedAt: string | null;
}
