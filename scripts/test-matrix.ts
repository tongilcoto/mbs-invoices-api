import { spawn } from "node:child_process";
import { pool } from "../src/infrastructure/persistence/postgres/pool";
import { runMigration } from "../src/infrastructure/persistence/postgres/migrate";

interface TestConfig {
  name: string;
  description: string;
  env: Record<string, string>;
  files: string[];
  requiresPostgres?: boolean;
}

const configs: TestConfig[] = [
  {
    name: "smoke",
    description:
      "Prueba de humo del toolchain (no toca Express ni el resto del proyecto)",
    env: {},
    files: ["src/sum.test.ts"],
  },
  {
    name: "integracion",
    description:
      "Integración de Express con middleware, y de los repositorios con su backend real (in-memory y Postgres)",
    env: {},
    files: [
      "src/infrastructure/transport/middlewares/request-logger.middleware.test.ts",
      "src/infrastructure/transport/middlewares/auth.middleware.test.ts",
      "src/infrastructure/persistence/in-memory-invoice.repository.test.ts",
      "src/infrastructure/persistence/postgres/postgres-invoice.repository.test.ts",
    ],
    requiresPostgres: true,
  },
  {
    name: "app:memory",
    description: "API completa (createApp) con PERSISTENCE_DRIVER=memory",
    env: { PERSISTENCE_DRIVER: "memory" },
    files: ["src/invoices.test.ts", "src/secret.test.ts"],
  },
  {
    name: "app:postgres",
    description: "API completa (createApp) con PERSISTENCE_DRIVER=postgres",
    env: { PERSISTENCE_DRIVER: "postgres" },
    files: ["src/invoices.test.ts", "src/secret.test.ts"],
    requiresPostgres: true,
  },
];

function run(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; allowFailure?: boolean } = {}
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: options.env ?? process.env,
    });

    child.on("exit", (code) => {
      const exitCode = code ?? 1;
      if (exitCode !== 0 && !options.allowFailure) {
        reject(
          new Error(`${command} ${args.join(" ")} salió con código ${exitCode}`)
        );
        return;
      }
      resolve(exitCode);
    });

    child.on("error", reject);
  });
}

async function ensurePostgresReady(): Promise<void> {
  console.log("→ Asegurando que Postgres está levantado (docker compose up -d postgres)...");
  await run("docker", ["compose", "up", "-d", "postgres"]);

  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    const exitCode = await run(
      "docker",
      ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "invoices"],
      { allowFailure: true }
    );
    if (exitCode === 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!ready) {
    throw new Error("Postgres no respondió a tiempo (pg_isready).");
  }

  console.log("→ Aplicando migración...");
  await runMigration();

  console.log("→ Vaciando tablas para partir de estado limpio...");
  await pool.query("TRUNCATE invoices, invoice_number_sequences");
}

async function runConfig(config: TestConfig): Promise<boolean> {
  console.log(`\n=== ${config.name} — ${config.description} ===`);

  if (config.requiresPostgres) {
    await ensurePostgresReady();
  }

  const exitCode = await run("pnpm", ["exec", "vitest", "run", ...config.files], {
    env: { ...process.env, ...config.env },
    allowFailure: true,
  });

  return exitCode === 0;
}

function printUsage(): void {
  console.log(`
Uso: tsx scripts/test-matrix.ts <configuración|all|list>

Configuraciones disponibles:
${configs.map((c) => `  - ${c.name}: ${c.description}`).join("\n")}
  - all: ejecuta todas las configuraciones anteriores, en orden
  - list: lista las configuraciones disponibles
`);
}

async function main(): Promise<void> {
  const [, , target] = process.argv;

  if (!target || target === "--help" || target === "-h") {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (target === "list") {
    configs.forEach((c) => console.log(`- ${c.name}: ${c.description}`));
    return;
  }

  const selected =
    target === "all" ? configs : configs.filter((c) => c.name === target);

  if (selected.length === 0) {
    console.error(`Configuración desconocida: "${target}"`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  const results: { name: string; passed: boolean }[] = [];
  for (const config of selected) {
    const passed = await runConfig(config);
    results.push({ name: config.name, passed });
  }

  console.log("\n=== Resumen ===");
  for (const result of results) {
    console.log(`${result.passed ? "✓" : "✗"} ${result.name}`);
  }

  process.exitCode = results.every((r) => r.passed) ? 0 : 1;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end().catch(() => {});
  });
