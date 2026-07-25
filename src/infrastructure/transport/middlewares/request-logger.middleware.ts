import type { RequestHandler } from "express";

export function requestLogger(
  log: (message: string) => void = console.log
): RequestHandler {
  return (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });

    next();
  };
}
