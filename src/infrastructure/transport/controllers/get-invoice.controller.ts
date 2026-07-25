import type { RequestHandler } from "express";
import type { GetInvoiceUseCase } from "../../../domain/get-invoice.use-case";
import { InvoiceNotFoundError } from "../../../domain/errors";

export function getInvoiceController(
  useCase: GetInvoiceUseCase
): RequestHandler {
  return async (req, res) => {
    try {
      const invoice = await useCase.execute(req.params.id as string);
      res.status(200).json(invoice);
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        res.status(404).json({
          error: "invoice_not_found",
          message: "La factura solicitada no existe.",
        });
        return;
      }

      throw error;
    }
  };
}
