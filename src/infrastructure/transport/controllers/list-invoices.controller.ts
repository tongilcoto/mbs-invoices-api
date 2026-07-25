import type { RequestHandler } from "express";
import type { ListInvoicesUseCase } from "../../../domain/list-invoices.use-case";
import type { InvoiceStatus } from "../../../types/invoice";

export function listInvoicesController(
  useCase: ListInvoicesUseCase
): RequestHandler {
  return async (req, res) => {
    const { status, clientTaxId } = req.query;

    const items = await useCase.execute({
      status: typeof status === "string" ? (status as InvoiceStatus) : undefined,
      clientTaxId: typeof clientTaxId === "string" ? clientTaxId : undefined,
    });

    res.status(200).json({ items });
  };
}
