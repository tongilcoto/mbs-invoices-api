import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { Invoice } from "../../../types/invoice";
import { pool } from "./pool";
import { runMigration } from "./migrate";
import { PostgresInvoiceRepository } from "./postgres-invoice.repository";

function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: randomUUID(),
    number: null,
    status: "draft",
    clientTaxId: "B12345678",
    clientName: "Acme Solutions S.L.",
    clientAddress: "Calle Mayor 10, 28013 Madrid",
    baseAmount: 1000,
    taxAmount: 210,
    totalAmount: 1210,
    createdAt: new Date().toISOString(),
    closedAt: null,
    ...overrides,
  };
}

describe("PostgresInvoiceRepository", () => {
  const repository = new PostgresInvoiceRepository(pool);

  beforeAll(async () => {
    await runMigration();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE invoices, invoice_number_sequences");
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("connect", () => {
    it("resuelve correctamente cuando Postgres es alcanzable", async () => {
      await expect(repository.connect()).resolves.toBeUndefined();
    });

    it("falla cuando Postgres no es alcanzable", async () => {
      const unreachablePool = new Pool({
        connectionString:
          "postgresql://invoices:invoices@localhost:5999/invoices",
        connectionTimeoutMillis: 500,
      });
      const unreachableRepository = new PostgresInvoiceRepository(
        unreachablePool
      );

      await expect(unreachableRepository.connect()).rejects.toThrow();

      await unreachablePool.end();
    });
  });

  it("guarda una factura y la recupera por id", async () => {
    const invoice = buildInvoice();

    await repository.save(invoice);
    const found = await repository.findById(invoice.id);

    expect(found).toEqual(invoice);
  });

  it("devuelve undefined si el id no existe", async () => {
    const found = await repository.findById(randomUUID());

    expect(found).toBeUndefined();
  });

  it("lista todas las facturas guardadas", async () => {
    const a = buildInvoice();
    const b = buildInvoice({
      status: "closed",
      number: "BT001",
      closedAt: new Date().toISOString(),
    });
    await repository.save(a);
    await repository.save(b);

    const all = await repository.findAll({});

    expect(all).toHaveLength(2);
  });

  it("filtra por status", async () => {
    const draft = buildInvoice();
    const closed = buildInvoice({
      status: "closed",
      number: "BT001",
      closedAt: new Date().toISOString(),
    });
    await repository.save(draft);
    await repository.save(closed);

    const draftResults = await repository.findAll({ status: "draft" });
    const closedResults = await repository.findAll({ status: "closed" });

    expect(draftResults).toEqual([draft]);
    expect(closedResults).toEqual([closed]);
  });

  it("filtra por clientTaxId", async () => {
    const a = buildInvoice({ clientTaxId: "A11111111" });
    const b = buildInvoice({ clientTaxId: "B22222222" });
    await repository.save(a);
    await repository.save(b);

    const results = await repository.findAll({ clientTaxId: "A11111111" });

    expect(results).toEqual([a]);
  });

  it("actualiza una factura existente", async () => {
    const invoice = buildInvoice();
    await repository.save(invoice);

    const updated: Invoice = {
      ...invoice,
      baseAmount: 2000,
      taxAmount: 420,
      totalAmount: 2420,
    };
    await repository.update(updated);

    const found = await repository.findById(invoice.id);

    expect(found).toEqual(updated);
  });

  it("elimina una factura", async () => {
    const invoice = buildInvoice();
    await repository.save(invoice);

    await repository.delete(invoice.id);
    const found = await repository.findById(invoice.id);

    expect(found).toBeUndefined();
  });

  it("genera números de secuencia correlativos por prefijo", async () => {
    const first = await repository.nextSequenceValue("BT");
    const second = await repository.nextSequenceValue("BT");
    const otherPrefix = await repository.nextSequenceValue("FA");

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(otherPrefix).toBe(1);
  });
});
