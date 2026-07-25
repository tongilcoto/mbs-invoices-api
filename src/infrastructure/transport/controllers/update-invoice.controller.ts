import type { RequestHandler } from "express";
import type { UpdateInvoiceUseCase } from "../../../domain/update-invoice.use-case";
import {
  InvoiceAlreadyClosedError,
  InvoiceNotFoundError,
} from "../../../domain/errors";

export function updateInvoiceController(
  useCase: UpdateInvoiceUseCase
): RequestHandler {
  return async (req, res) => {
    try {
      const invoice = await useCase.execute(
        req.params.id as string,
        req.body ?? {}
      );
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
          message: "No se puede modificar una factura cerrada.",
        });
        return;
      }

      throw error;
    }
  };
}
