import type { RequestHandler } from "express";

const HARDCODED_TOKEN = "super-secret-token";

export const requireAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;

  if (token !== HARDCODED_TOKEN) {
    res.status(401).json({
      error: "unauthorized",
      message: "Token de autenticación inválido o ausente.",
    });
    return;
  }

  next();
};
