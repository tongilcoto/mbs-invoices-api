import { describe, expect, it } from "vitest";
import { InMemoryInvoiceRepository } from "./in-memory-invoice.repository";

describe("InMemoryInvoiceRepository", () => {
  describe("connect", () => {
    it("siempre resuelve correctamente, sin conexión real que establecer", async () => {
      const repository = new InMemoryInvoiceRepository();

      await expect(repository.connect()).resolves.toBeUndefined();
    });
  });
});
