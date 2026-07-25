import type { RequestHandler } from "express";
import type { DeleteInvoiceUseCase } from "../../../domain/delete-invoice.use-case";
import {
  InvoiceAlreadyClosedError,
  InvoiceNotFoundError,
} from "../../../domain/errors";

export function deleteInvoiceController(
  useCase: DeleteInvoiceUseCase
): RequestHandler {
  return async (req, res) => {
    try {
      await useCase.execute(req.params.id as string);
      res.status(204).send();
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
          message: "No se puede eliminar una factura cerrada.",
        });
        return;
      }

      throw error;
    }
  };
}
