import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { requestLogger } from "./request-logger.middleware";

describe("requestLogger", () => {
  it("loguea método, path, status code y duración de una petición exitosa", async () => {
    const log = vi.fn();
    const app = express();
    app.use(requestLogger(log));
    app.get("/ping", (_req, res) => {
      res.status(200).send("pong");
    });

    await request(app).get("/ping");

    expect(log).toHaveBeenCalledTimes(1);
    const [message] = log.mock.calls[0];
    expect(message).toMatch(/^GET \/ping 200 \d+ms$/);
  });

  it("loguea el status code de una respuesta de error", async () => {
    const log = vi.fn();
    const app = express();
    app.use(requestLogger(log));
    app.post("/broken", (_req, res) => {
      res.status(500).send("error");
    });

    await request(app).post("/broken");

    expect(log).toHaveBeenCalledTimes(1);
    const [message] = log.mock.calls[0];
    expect(message).toMatch(/^POST \/broken 500 \d+ms$/);
  });
});
