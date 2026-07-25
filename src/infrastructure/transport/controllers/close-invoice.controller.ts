import type { RequestHandler } from "express";
import type { CloseInvoiceUseCase } from "../../../domain/close-invoice.use-case";
import {
  InvoiceAlreadyClosedError,
  InvoiceNotFoundError,
} from "../../../domain/errors";

export function closeInvoiceController(
  useCase: CloseInvoiceUseCase
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

      if (error instanceof InvoiceAlreadyClosedError) {
        res.status(409).json({
          error: "invoice_closed",
          message: "La factura ya está cerrada.",
        });
        return;
      }

      throw error;
    }
  };
}
