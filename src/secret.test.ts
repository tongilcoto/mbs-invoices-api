import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "./infrastructure/transport/app";

let app: Express;

beforeEach(async () => {
  app = await createApp();
});

describe("GET /secret", () => {
  it("devuelve 401 si no se envía token", async () => {
    const response = await request(app).get("/secret");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
  });

  it("devuelve 401 si el token es incorrecto", async () => {
    const response = await request(app)
      .get("/secret")
      .set("Authorization", "Bearer wrong-token");

    expect(response.status).toBe(401);
  });

  it("devuelve 200 con el token correcto", async () => {
    const response = await request(app)
      .get("/secret")
      .set("Authorization", "Bearer super-secret-token");

    expect(response.status).toBe(200);
  });
});

describe("Aislamiento del middleware de auth", () => {
  it("las rutas de /invoices no requieren token", async () => {
    const response = await request(app).get("/invoices");

    expect(response.status).toBe(200);
  });
});
