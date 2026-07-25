import type { RequestHandler } from "express";

export const secretController: RequestHandler = (_req, res) => {
  res.status(200).json({ message: "Acceso concedido" });
};
