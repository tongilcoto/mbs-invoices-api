import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "./infrastructure/transport/app";
import { pool } from "./infrastructure/persistence/postgres/pool";

const isPostgresDriver = process.env.PERSISTENCE_DRIVER === "postgres";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVOICE_NUMBER_REGEX = /^[A-Z]+(\d+)$/;
const UNKNOWN_ID = "00000000-0000-0000-0000-000000000000";

let app: Express;

function validInvoicePayload(overrides: Record<string, unknown> = {}) {
  return {
    clientTaxId: "B12345678",
    clientName: "Acme Solutions S.L.",
    clientAddress: "Calle Mayor 10, 28013 Madrid",
    baseAmount: 1000,
    taxAmount: 210,
    ...overrides,
  };
}

async function createDraftInvoice(overrides: Record<string, unknown> = {}) {
  const response = await request(app)
    .post("/invoices")
    .send(validInvoicePayload(overrides));
  return response.body;
}

async function closeInvoice(id: string) {
  return request(app).post(`/invoices/${id}/close`);
}

describe("Invoices API", () => {
  beforeEach(async () => {
    if (isPostgresDriver) {
      await pool.query("TRUNCATE invoices, invoice_number_sequences");
    }
    app = await createApp();
  });

  afterAll(async () => {
    if (isPostgresDriver) {
      await pool.end();
    }
  });

  describe("POST /invoices", () => {
    it("crea una factura en borrador sin número asignado", async () => {
      const response = await request(app)
        .post("/invoices")
        .send(validInvoicePayload());

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        number: null,
        status: "draft",
        clientTaxId: "B12345678",
        clientName: "Acme Solutions S.L.",
        clientAddress: "Calle Mayor 10, 28013 Madrid",
        baseAmount: 1000,
        taxAmount: 210,
        totalAmount: 1210,
        closedAt: null,
      });
      expect(response.body.id).toMatch(UUID_REGEX);
      expect(response.body.createdAt).toBeTruthy();
    });

    it("devuelve 400 si faltan campos obligatorios", async () => {
      const { clientTaxId: _clientTaxId, ...incompletePayload } =
        validInvoicePayload();

      const response = await request(app)
        .post("/invoices")
        .send(incompletePayload);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("GET /invoices", () => {
    it("devuelve la lista de facturas creadas", async () => {
      const created = await createDraftInvoice();

      const response = await request(app).get("/invoices");

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([created]);
    });

    it("filtra por status", async () => {
      const draft = await createDraftInvoice();
      const toClose = await createDraftInvoice();
      const closed = (await closeInvoice(toClose.id)).body;

      const draftResponse = await request(app).get("/invoices?status=draft");
      const closedResponse = await request(app).get(
        "/invoices?status=closed"
      );

      expect(draftResponse.body.items).toEqual([draft]);
      expect(closedResponse.body.items).toEqual([closed]);
    });

    it("filtra por clientTaxId", async () => {
      const clientA = await createDraftInvoice({ clientTaxId: "A11111111" });
      const clientB = await createDraftInvoice({ clientTaxId: "B22222222" });

      const clientAResponse = await request(app).get(
        "/invoices?clientTaxId=A11111111"
      );
      const clientBResponse = await request(app).get(
        "/invoices?clientTaxId=B22222222"
      );

      expect(clientAResponse.body.items).toEqual([clientA]);
      expect(clientBResponse.body.items).toEqual([clientB]);
    });

    it("filtra combinando status y clientTaxId", async () => {
      const clientADraft = await createDraftInvoice({
        clientTaxId: "A11111111",
      });
      const clientAClosed = (
        await closeInvoice(
          (await createDraftInvoice({ clientTaxId: "A11111111" })).id
        )
      ).body;
      await createDraftInvoice({ clientTaxId: "B22222222" });

      const response = await request(app).get(
        "/invoices?status=draft&clientTaxId=A11111111"
      );

      expect(response.body.items).toEqual([clientADraft]);
      expect(response.body.items).not.toContainEqual(clientAClosed);
    });
  });

  describe("GET /invoices/:id", () => {
    it("devuelve el detalle de una factura existente", async () => {
      const created = await createDraftInvoice();

      const response = await request(app).get(`/invoices/${created.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(created);
    });

    it("devuelve 404 si la factura no existe", async () => {
      const response = await request(app).get(`/invoices/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PATCH /invoices/:id", () => {
    it("modifica una factura en borrador", async () => {
      const created = await createDraftInvoice();

      const response = await request(app)
        .patch(`/invoices/${created.id}`)
        .send({ baseAmount: 1200, taxAmount: 252 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        baseAmount: 1200,
        taxAmount: 252,
        totalAmount: 1452,
      });
    });

    it("devuelve 404 si la factura no existe", async () => {
      const response = await request(app)
        .patch(`/invoices/${UNKNOWN_ID}`)
        .send({ baseAmount: 1200 });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });

    it("devuelve 409 si la factura ya está cerrada", async () => {
      const created = await createDraftInvoice();
      await closeInvoice(created.id);

      const response = await request(app)
        .patch(`/invoices/${created.id}`)
        .send({ baseAmount: 1200 });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /invoices/:id", () => {
    it("elimina una factura en borrador", async () => {
      const created = await createDraftInvoice();

      const deleteResponse = await request(app).delete(
        `/invoices/${created.id}`
      );
      const getResponse = await request(app).get(`/invoices/${created.id}`);

      expect(deleteResponse.status).toBe(204);
      expect(getResponse.status).toBe(404);
    });

    it("devuelve 404 si la factura no existe", async () => {
      const response = await request(app).delete(`/invoices/${UNKNOWN_ID}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });

    it("devuelve 409 si la factura está cerrada", async () => {
      const created = await createDraftInvoice();
      await closeInvoice(created.id);

      const response = await request(app).delete(`/invoices/${created.id}`);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /invoices/:id/close", () => {
    it("cierra la factura y le asigna un número con prefijo", async () => {
      const created = await createDraftInvoice();

      const response = await closeInvoice(created.id);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("closed");
      expect(response.body.number).toMatch(INVOICE_NUMBER_REGEX);
      expect(response.body.closedAt).toBeTruthy();
    });

    it("asigna números correlativos con el mismo prefijo", async () => {
      const first = await closeInvoice((await createDraftInvoice()).id);
      const second = await closeInvoice((await createDraftInvoice()).id);

      const [, firstPrefix, firstNumber] =
        first.body.number.match(/^([A-Z]+)(\d+)$/);
      const [, secondPrefix, secondNumber] =
        second.body.number.match(/^([A-Z]+)(\d+)$/);

      expect(secondPrefix).toBe(firstPrefix);
      expect(Number(secondNumber)).toBe(Number(firstNumber) + 1);
    });

    it("devuelve 404 si la factura no existe", async () => {
      const response = await closeInvoice(UNKNOWN_ID);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });

    it("devuelve 409 si la factura ya está cerrada", async () => {
      const created = await createDraftInvoice();
      await closeInvoice(created.id);

      const response = await closeInvoice(created.id);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Rutas no reconocidas", () => {
    it("devuelve 404 con el formato de error de la API", async () => {
      const response = await request(app).get("/does-not-exist");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
    });
  });
});
