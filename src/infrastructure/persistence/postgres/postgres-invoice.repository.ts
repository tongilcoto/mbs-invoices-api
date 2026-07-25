import type { Pool } from "pg";
import type { Invoice, InvoiceStatus } from "../../../types/invoice";
import type {
  InvoiceFilter,
  InvoiceRepository,
} from "../../../domain/invoice.repository";

interface InvoiceRow {
  id: string;
  number: string | null;
  status: string;
  client_tax_id: string;
  client_name: string;
  client_address: string;
  base_amount: string;
  tax_amount: string;
  total_amount: string;
  created_at: Date;
  closed_at: Date | null;
}

function mapRowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    status: row.status as InvoiceStatus,
    clientTaxId: row.client_tax_id,
    clientName: row.client_name,
    clientAddress: row.client_address,
    baseAmount: Number(row.base_amount),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at.toISOString(),
    closedAt: row.closed_at ? row.closed_at.toISOString() : null,
  };
}

export class PostgresInvoiceRepository implements InvoiceRepository {
  constructor(private readonly pool: Pool) {}

  async connect(): Promise<void> {
    const client = await this.pool.connect();
    client.release();
  }

  async save(invoice: Invoice): Promise<void> {
    await this.pool.query(
      `INSERT INTO invoices (
        id, number, status, client_tax_id, client_name, client_address,
        base_amount, tax_amount, total_amount, created_at, closed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        invoice.id,
        invoice.number,
        invoice.status,
        invoice.clientTaxId,
        invoice.clientName,
        invoice.clientAddress,
        invoice.baseAmount,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.createdAt,
        invoice.closedAt,
      ]
    );
  }

  async findAll(filter: InvoiceFilter): Promise<Invoice[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter.status) {
      values.push(filter.status);
      conditions.push(`status = $${values.length}`);
    }

    if (filter.clientTaxId) {
      values.push(filter.clientTaxId);
      conditions.push(`client_tax_id = $${values.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await this.pool.query<InvoiceRow>(
      `SELECT * FROM invoices ${whereClause} ORDER BY created_at ASC`,
      values
    );

    return result.rows.map(mapRowToInvoice);
  }

  async findById(id: string): Promise<Invoice | undefined> {
    const result = await this.pool.query<InvoiceRow>(
      "SELECT * FROM invoices WHERE id = $1",
      [id]
    );

    const row = result.rows[0];
    return row ? mapRowToInvoice(row) : undefined;
  }

  async update(invoice: Invoice): Promise<void> {
    await this.pool.query(
      `UPDATE invoices SET
        number = $2, status = $3, client_tax_id = $4, client_name = $5,
        client_address = $6, base_amount = $7, tax_amount = $8,
        total_amount = $9, closed_at = $10
      WHERE id = $1`,
      [
        invoice.id,
        invoice.number,
        invoice.status,
        invoice.clientTaxId,
        invoice.clientName,
        invoice.clientAddress,
        invoice.baseAmount,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.closedAt,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM invoices WHERE id = $1", [id]);
  }

  async nextSequenceValue(prefix: string): Promise<number> {
    const result = await this.pool.query<{ last_value: number }>(
      `INSERT INTO invoice_number_sequences (prefix, last_value)
       VALUES ($1, 1)
       ON CONFLICT (prefix) DO UPDATE
         SET last_value = invoice_number_sequences.last_value + 1
       RETURNING last_value`,
      [prefix]
    );

    return result.rows[0].last_value;
  }
}
