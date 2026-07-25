import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { requireAuth } from "./auth.middleware";

function buildProtectedApp() {
  const app = express();
  app.get("/protected", requireAuth, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe("requireAuth", () => {
  it("permite el acceso con el token correcto", async () => {
    const response = await request(buildProtectedApp())
      .get("/protected")
      .set("Authorization", "Bearer super-secret-token");

    expect(response.status).toBe(200);
  });

  it("devuelve 401 si no se envía el header Authorization", async () => {
    const response = await request(buildProtectedApp()).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
  });

  it("devuelve 401 si el token es incorrecto", async () => {
    const response = await request(buildProtectedApp())
      .get("/protected")
      .set("Authorization", "Bearer wrong-token");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
  });
});
