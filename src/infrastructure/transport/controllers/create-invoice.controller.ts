import type { RequestHandler } from "express";
import type { CreateInvoiceUseCase } from "../../../domain/create-invoice.use-case";

export function createInvoiceController(
  useCase: CreateInvoiceUseCase
): RequestHandler {
  return async (req, res) => {
    const { clientTaxId, clientName, clientAddress, baseAmount, taxAmount } =
      req.body ?? {};

    if (
      typeof clientTaxId !== "string" ||
      typeof clientName !== "string" ||
      typeof clientAddress !== "string" ||
      typeof baseAmount !== "number" ||
      typeof taxAmount !== "number"
    ) {
      res.status(400).json({
        error: "invalid_request",
        message: "Los datos de la factura no son válidos.",
      });
      return;
    }

    const invoice = await useCase.execute({
      clientTaxId,
      clientName,
      clientAddress,
      baseAmount,
      taxAmount,
    });

    res.status(201).json(invoice);
  };
}
