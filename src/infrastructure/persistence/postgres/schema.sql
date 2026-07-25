CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY,
  number TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'closed')),
  client_tax_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_address TEXT NOT NULL,
  base_amount NUMERIC(12, 2) NOT NULL,
  tax_amount NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_tax_id ON invoices (client_tax_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_number ON invoices (number) WHERE number IS NOT NULL;

CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  prefix TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);
