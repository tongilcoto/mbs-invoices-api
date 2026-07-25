# Diseño API REST — Gestión de Facturas

## Necesidades

1. Guardar una factura con el CIF del cliente y el importe, desglosado en base imponible e IVA.
2. Cada factura tiene un número correlativo con prefijo configurable (ej. `BT001`, `BT002`, ...). El número es único y correlativo por prefijo.
3. Las facturas tienen dos estados: `borrador` y `cerrada`.
   - Solo se pueden eliminar facturas en estado `borrador`.
   - El número definitivo se asigna en el momento en que la factura pasa de `borrador` a `cerrada`. Mientras está en `borrador`, no tiene número asignado (o tiene un identificador provisional no numerado).

## Modelo de datos

### Invoice

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador interno, inmutable, independiente del número de factura. |
| `number` | string \| null | Número correlativo con prefijo (ej. `BT001`). `null` mientras está en `borrador`. |
| `status` | enum | `draft` \| `closed`. |
| `clientTaxId` | string | CIF del cliente. |
| `clientName` | string | Nombre social (razón social) del cliente. |
| `clientAddress` | string | Dirección fiscal del cliente. |
| `baseAmount` | decimal | Base imponible. |
| `taxAmount` | decimal | Importe del IVA. |
| `totalAmount` | decimal | `baseAmount + taxAmount` (calculado). |
| `createdAt` | datetime | Fecha de creación. |
| `closedAt` | datetime \| null | Fecha en que se cerró y se asignó número. |

La numeración correlativa se gestiona por prefijo (ej. una secuencia independiente para `BT`), incrementando en el momento del cierre para evitar huecos por facturas borrador eliminadas.

## Endpoints

### `POST /invoices`

Crea una factura en estado `borrador`. No asigna número.

Request body:
```json
{
  "clientTaxId": "B12345678",
  "clientName": "Acme Solutions S.L.",
  "clientAddress": "Calle Mayor 10, 28013 Madrid",
  "baseAmount": 1000.00,
  "taxAmount": 210.00
}
```

Response `201 Created`:
```json
{
  "id": "3f2a1b7e-9c4d-4e2a-8b1a-6d5f0c2e1a90",
  "number": null,
  "status": "draft",
  "clientTaxId": "B12345678",
  "clientName": "Acme Solutions S.L.",
  "clientAddress": "Calle Mayor 10, 28013 Madrid",
  "baseAmount": 1000.00,
  "taxAmount": 210.00,
  "totalAmount": 1210.00,
  "createdAt": "2026-07-23T09:15:00Z",
  "closedAt": null
}
```

### `GET /invoices`

Lista facturas, filtrable por `status` y/o `clientTaxId`.

Query parameters:
| Parámetro | Tipo | Descripción |
|---|---|---|
| `status` | string (opcional) | Filtra por `draft` o `closed`. |
| `clientTaxId` | string (opcional) | Filtra por el CIF del cliente. |

Ejemplo: `GET /invoices?status=closed&clientTaxId=B12345678`

Response `200 OK`:
```json
{
  "items": [
    {
      "id": "3f2a1b7e-9c4d-4e2a-8b1a-6d5f0c2e1a90",
      "number": "BT001",
      "status": "closed",
      "clientTaxId": "B12345678",
      "clientName": "Acme Solutions S.L.",
      "clientAddress": "Calle Mayor 10, 28013 Madrid",
      "baseAmount": 1000.00,
      "taxAmount": 210.00,
      "totalAmount": 1210.00,
      "createdAt": "2026-07-23T09:15:00Z",
      "closedAt": "2026-07-23T10:00:00Z"
    }
  ]
}
```

### `GET /invoices/{id}`

Obtiene el detalle de una factura.

Response `200 OK`: mismo formato que el objeto `Invoice` anterior.

Response `404 Not Found` si no existe.

### `PATCH /invoices/{id}`

Modifica datos de una factura en `borrador` (CIF, nombre, dirección, importes). No permitido si está `cerrada`.

Request body (campos opcionales, solo los que se quieren actualizar):
```json
{
  "baseAmount": 1200.00,
  "taxAmount": 252.00
}
```

Response `200 OK`: objeto `Invoice` actualizado.

Response `409 Conflict` si la factura está `cerrada`:
```json
{
  "error": "invoice_closed",
  "message": "No se puede modificar una factura cerrada."
}
```

### `POST /invoices/{id}/close`

Cierra la factura: cambia `status` a `cerrada` y le asigna el siguiente número correlativo del prefijo. Operación irreversible. Sin body.

Response `200 OK`:
```json
{
  "id": "3f2a1b7e-9c4d-4e2a-8b1a-6d5f0c2e1a90",
  "number": "BT001",
  "status": "closed",
  "clientTaxId": "B12345678",
  "clientName": "Acme Solutions S.L.",
  "clientAddress": "Calle Mayor 10, 28013 Madrid",
  "baseAmount": 1000.00,
  "taxAmount": 210.00,
  "totalAmount": 1210.00,
  "createdAt": "2026-07-23T09:15:00Z",
  "closedAt": "2026-07-23T10:00:00Z"
}
```

### `DELETE /invoices/{id}`

Elimina la factura. Solo permitido si `status` es `borrador`.

Response `204 No Content` si se elimina correctamente.

Response `409 Conflict` si está `cerrada`:
```json
{
  "error": "invoice_closed",
  "message": "No se puede eliminar una factura cerrada."
}
```

## Reglas de negocio

- No se puede editar ni eliminar una factura `cerrada`.
- La asignación de número es atómica con el cierre, para garantizar correlatividad sin huecos.
- El prefijo de numeración es un dato de configuración, no se define aquí su origen (fijo, por serie, etc.) al no estar especificado en los requisitos.
