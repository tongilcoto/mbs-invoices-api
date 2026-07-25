import express, { type Express } from "express";
import type { InvoiceRepository } from "../../domain/invoice.repository";
import { InMemoryInvoiceRepository } from "../persistence/in-memory-invoice.repository";
import { PostgresInvoiceRepository } from "../persistence/postgres/postgres-invoice.repository";
import { pool } from "../persistence/postgres/pool";
import { CreateInvoiceUseCase } from "../../domain/create-invoice.use-case";
import { ListInvoicesUseCase } from "../../domain/list-invoices.use-case";
import { GetInvoiceUseCase } from "../../domain/get-invoice.use-case";
import { UpdateInvoiceUseCase } from "../../domain/update-invoice.use-case";
import { DeleteInvoiceUseCase } from "../../domain/delete-invoice.use-case";
import { CloseInvoiceUseCase } from "../../domain/close-invoice.use-case";
import { createInvoiceController } from "./controllers/create-invoice.controller";
import { listInvoicesController } from "./controllers/list-invoices.controller";
import { getInvoiceController } from "./controllers/get-invoice.controller";
import { updateInvoiceController } from "./controllers/update-invoice.controller";
import { deleteInvoiceController } from "./controllers/delete-invoice.controller";
import { closeInvoiceController } from "./controllers/close-invoice.controller";
import { requestLogger } from "./middlewares/request-logger.middleware";
import { requireAuth } from "./middlewares/auth.middleware";
import { secretController } from "./controllers/secret.controller";
import { buildInvoicesRouter } from "./routes/invoices.routes";

function buildInvoiceRepository(): InvoiceRepository {
  if (process.env.PERSISTENCE_DRIVER === "postgres") {
    return new PostgresInvoiceRepository(pool);
  }

  return new InMemoryInvoiceRepository();
}

export async function createApp(): Promise<Express> {
  const app = express();

  app.use(requestLogger());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.send("Hello World");
  });

  app.get("/secret", requireAuth, secretController);

  const invoiceRepository = buildInvoiceRepository();
  await invoiceRepository.connect();

  const createInvoiceUseCase = new CreateInvoiceUseCase(invoiceRepository);
  const listInvoicesUseCase = new ListInvoicesUseCase(invoiceRepository);
  const getInvoiceUseCase = new GetInvoiceUseCase(invoiceRepository);
  const updateInvoiceUseCase = new UpdateInvoiceUseCase(invoiceRepository);
  const deleteInvoiceUseCase = new DeleteInvoiceUseCase(invoiceRepository);
  const closeInvoiceUseCase = new CloseInvoiceUseCase(invoiceRepository);

  app.use(
    "/invoices",
    buildInvoicesRouter({
      createInvoice: createInvoiceController(createInvoiceUseCase),
      listInvoices: listInvoicesController(listInvoicesUseCase),
      getInvoice: getInvoiceController(getInvoiceUseCase),
      updateInvoice: updateInvoiceController(updateInvoiceUseCase),
      deleteInvoice: deleteInvoiceController(deleteInvoiceUseCase),
      closeInvoice: closeInvoiceController(closeInvoiceUseCase),
    })
  );

  app.use((_req, res) => {
    res.status(404).json({
      error: "not_found",
      message: "El recurso solicitado no existe.",
    });
  });

  return app;
}
