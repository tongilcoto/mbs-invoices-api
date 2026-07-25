import { Router, type RequestHandler } from "express";

interface InvoicesRouterControllers {
  createInvoice: RequestHandler;
  listInvoices: RequestHandler;
  getInvoice: RequestHandler;
  updateInvoice: RequestHandler;
  deleteInvoice: RequestHandler;
  closeInvoice: RequestHandler;
}

export function buildInvoicesRouter({
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  closeInvoice,
}: InvoicesRouterControllers): Router {
  const router = Router();

  router.post("/", createInvoice);
  router.get("/", listInvoices);
  router.get("/:id", getInvoice);
  router.patch("/:id", updateInvoice);
  router.delete("/:id", deleteInvoice);
  router.post("/:id/close", closeInvoice);

  return router;
}
