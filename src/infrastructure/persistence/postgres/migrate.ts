import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pool } from "./pool";

export async function runMigration(): Promise<void> {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("Migración aplicada correctamente.");
      return pool.end();
    })
    .catch((error: unknown) => {
      console.error("Error al aplicar la migración:", error);
      process.exitCode = 1;
      return pool.end();
    });
}
