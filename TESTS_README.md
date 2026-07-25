# Tests — guía rápida

## Objetivo

**El mismo fichero de test vale para todas las configuraciones**: lo que se comprueba (qué endpoints existen, qué status devuelven, qué forma tiene el body) no depende del backend. **Lo único que cambia según el driver activo es, cuando hace falta, el comportamiento de arranque/limpieza** (por ejemplo, un `TRUNCATE` antes de cada test si se corre contra Postgres real). No se escriben suites duplicadas por backend — se escribe una vez y se ejecuta contra cada configuración real, para ganar confianza de que el comportamiento es el mismo sea cual sea la infraestructura detrás.

Toda la gestión del entorno necesario para correr esas configuraciones —qué variables de entorno exportar en cada caso, si hay que levantar Postgres, esperar a que esté listo, migrar, dejar las tablas limpias— la asume `scripts/test-matrix.ts`. No es trabajo manual del desarrollador: se elige una configuración (o `all`) y el script se encarga del resto.

## Tipos de test en el proyecto

| Capa | Ficheros | ¿Depende de Postgres? |
|---|---|---|
| Smoke | `src/sum.test.ts` | No — no toca Express ni nada del proyecto, es la prueba dummy del propio toolchain de Vitest |
| Integración | `src/infrastructure/transport/middlewares/*.test.ts` (Express real + middleware, vía supertest), `src/infrastructure/persistence/in-memory-invoice.repository.test.ts`, `src/infrastructure/persistence/postgres/postgres-invoice.repository.test.ts` | Depende del fichero: los de middleware y el in-memory no; el de Postgres sí, siempre |
| API completa (`createApp`) | `src/invoices.test.ts`, `src/secret.test.ts` | Sí — el resultado depende de `PERSISTENCE_DRIVER` |

## Ejecución básica (Vitest "a pelo")

```bash
pnpm test        # modo watch
pnpm test:run    # un solo pase
```

Estos comandos lanzan **todos** los ficheros de test a la vez. `PERSISTENCE_DRIVER` (de `.env`, por defecto `memory`) solo afecta a `invoices.test.ts` y `secret.test.ts`, que pasan por `createApp()`. Pero `postgres-invoice.repository.test.ts` no mira esa variable en ningún momento — instancia `PostgresInvoiceRepository` directamente porque su propósito es probar ese adaptador en concreto, así que **siempre** necesita Postgres real, sin importar el valor de `PERSISTENCE_DRIVER`.

Por eso, con Vitest "a pelo", para que todo pase necesitas tener el contenedor levantado y migrado igualmente (`docker compose up -d postgres` + `pnpm db:migrate`), aunque estés en modo `memory`. Si quieres ejecutar solo lo que no depende de Postgres, usa el orquestador (`pnpm test:matrix smoke` o `pnpm test:matrix app:memory`) en vez de estos comandos — ver más abajo.

## Orquestador de matriz de configuraciones (`pnpm test:matrix`)

En vez de ir levantando Postgres, exportando variables de entorno y lanzando ficheros de test sueltos a mano, `scripts/test-matrix.ts` define cada combinación como una **configuración nombrada** (variables de entorno + ficheros a ejecutar + si necesita Postgres) y se encarga de todo el ciclo de vida.

### Configuraciones disponibles

Reflejan exactamente las 3 capas de la tabla anterior — "API completa" se divide en dos configuraciones porque ahí sí importa el driver.

| Nombre | Variables de entorno | Ficheros | ¿Levanta Postgres? |
|---|---|---|---|
| `smoke` | — | `sum.test.ts` | No |
| `integracion` | — | middlewares, in-memory repo, Postgres repo | Sí (por el fichero de Postgres; arrastra a todo el bloque) |
| `app:memory` | `PERSISTENCE_DRIVER=memory` | `invoices.test.ts`, `secret.test.ts` | No |
| `app:postgres` | `PERSISTENCE_DRIVER=postgres` | `invoices.test.ts`, `secret.test.ts` | Sí |

### Uso

```bash
pnpm test:matrix list                    # lista las configuraciones
pnpm test:matrix smoke                   # una sola configuración
pnpm test:matrix integracion
pnpm test:matrix all                     # todas, en orden, con resumen final
```

Para las configuraciones marcadas con "Levanta Postgres": el script ejecuta `docker compose up -d postgres`, espera a `pg_isready` (hasta 30s), aplica la migración (`runMigration()`) y vacía las tablas (`TRUNCATE`) **antes** de lanzar Vitest — así cada configuración parte de estado limpio, sin pasos manuales.

El contenedor de Postgres **no se para automáticamente** al terminar (queda levantado para iterar rápido). Párralo tú cuando termines: `docker compose stop postgres`.

### Salida

Al final de una ejecución (`all` o individual) imprime un resumen `✓/✗` por configuración, y el código de salida del proceso es no-cero si alguna falló — pensado para poder usarse en CI.

## Aislamiento entre tests: `invoices.test.ts` contra Postgres

`invoices.test.ts` se ejecuta bajo ambos drivers (`app:memory` y `app:postgres`), y varios tests de `GET /invoices` asumen que cada `it()` empieza con el repositorio vacío. Eso es gratis con `InMemoryInvoiceRepository` (cada `createApp()` crea un array nuevo en memoria), pero no con `PostgresInvoiceRepository`: todos los `it()` de un mismo fichero comparten la misma base de datos real.

Por eso, en el propio `beforeEach` de `invoices.test.ts`, cuando `PERSISTENCE_DRIVER === "postgres"`, se hace `TRUNCATE invoices, invoice_number_sequences` antes de cada test (y se cierra el pool en `afterAll`). Así cada test parte de estado limpio sin importar el backend.

## Variables de entorno relevantes

| Variable | Valores | Dónde se usa |
|---|---|---|
| `PERSISTENCE_DRIVER` | `memory` \| `postgres` | `app.ts` → elige el repositorio |
| `DATABASE_URL` | connection string de Postgres | `pool.ts` |

Ver `.env.example` para los valores por defecto de desarrollo local.
