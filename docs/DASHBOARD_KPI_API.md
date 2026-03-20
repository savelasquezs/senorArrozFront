# Contrato de datos — KPIs del dashboard (backend)

Documento para implementar **después** el endpoint (o endpoints) que alimentan la vista de dashboard (`GlobalDashboard` para Superadmin; futura vista por sucursal para Admin). Reglas de alcance por rol: **`docs/DASHBOARD_VISIBILITY.md`**.

---

## 1. Alcance y parámetros de la API (propuesta)

| Rol | `branchId` en query/body | Comportamiento |
|-----|---------------------------|----------------|
| **Superadmin** | Opcional. Si **omite** o envía “todas”: métricas consolidadas de **todas** las sucursales. Si envía un `branchId`: solo esa sucursal (útil para filtros futuros). |
| **Admin** | **Ignorar** el que venga en cliente; usar siempre `branchId` del usuario autenticado. |

**Zona horaria:** definir si los “días” son **UTC**, **America/Bogota** u horario por sucursal; documentar la misma convención en backend y respuesta (`asOf`).

**Fecha de referencia del dashboard (día “hoy”)**

- Por defecto: **día calendario actual** según regla anterior.
- Opcional (fase 2): query `date=YYYY-MM-DD` para reproducir un día pasado.

---

## 2. Ventanas temporales (definiciones)

Para cada KPI se necesitan **tres valores base** (o el actual más dos referencias) que permitan calcular el **valor mostrado** y dos **variaciones porcentuales**.

| Ventana | Significado sugerido |
|---------|----------------------|
| **Actual** | Del **inicio al fin** del día de referencia `D` (intervalo de 24 h según TZ acordada). |
| **Semana pasada** | Mismo intervalo relativo al día **`D - 7 días`** (mismo día de la semana). |
| **Año pasado** | Mismo **mes y día** en el año **`year(D) - 1`** (ajustar año bisiesto 29/02 si aplica). |

**Variación porcentual (para enviar ya calculada al front):**

```text
changePercent = ((actual - reference) / reference) * 100
```

- Si `reference === 0` y `actual > 0`: convención a acordar (ej. `null`, `100`, o cap).
- Si ambos son 0: `0` o `null` (el front trata “sin comparación” si es `null`).

El front espera **números** (ej. `5.2` = +5,2 %); el signo lo interpreta con la lógica bueno/malo (`higherIsBetter` en **% cancelaciones** es `false`).

---

## 3. ¿Qué pedidos cuentan? (regla de negocio sugerida)

Alinear con producto; propuesta inicial coherente con el dominio actual:

| Métrica | Universo sugerido |
|---------|-------------------|
| Ventas, pedidos entregados, ticket | Pedidos con `status = delivered` cuya fecha de negocio elegida (ver abajo) cae en la ventana. |
| % cancelaciones | Pedidos **creados** (o “tomados”) en la ventana con `status = cancelled` **dividido** entre total de pedidos creados en la ventana (o entre total “cerrados”; **definir** con negocio). |

**Fecha a usar por pedido (definir una sola para “ventas del día”):**

- Opción A: `created_at` del pedido.
- Opción B: instante en que pasó a `delivered` (p. ej. desde `status_times` JSON).
- Opción C: `updated_at` al entregar.

Documentar la opción en la API (`revenueBasis`, etc.).

> **SLA / tiempos entre estados** (p. ej. uso de `prepare_at` vs Taken) aplican a **otras** métricas futuras, no a estos cuatro KPI actuales; ver `DASHBOARD_VISIBILITY.md` sección *Cálculo de tiempos*.

---

## 4. Payload JSON sugerido (KPIs)

Tipos alineados con `GlobalDashboard.vue` (enteros COP sin decimales en moneda y conteos; porcentajes como decimal con una cifra razonable).

```jsonc
{
  "asOf": "2026-03-14T05:00:00.000Z",
  "timeZone": "America/Bogota",
  "branchScope": "all",
  "kpis": {
    "totalSales": 2500000,
    "totalSalesWeekChangePercent": 5.2,
    "totalSalesYearChangePercent": 12.4,

    "ordersCount": 145,
    "ordersWeekChangePercent": 8.0,
    "ordersYearChangePercent": -1.5,

    "avgTicket": 17241,
    "avgTicketWeekChangePercent": 3.4,
    "avgTicketYearChangePercent": 6.2,

    "cancellationRate": 2.1,
    "cancellationRateWeekChangePercent": -0.8,
    "cancellationRateYearChangePercent": 0.3
  }
}
```

### 4.1 Campos obligatorios por tarjeta

| Clave JSON | Tipo | UI | Notas |
|------------|------|-----|--------|
| `totalSales` | `number` | Ventas totales (COP) | Suma de `order.total` (o ingreso neto definido) en ventana **actual**. |
| `totalSalesWeekChangePercent` | `number \| null` | vs semana pasada | Ver §2. |
| `totalSalesYearChangePercent` | `number \| null` | vs año pasado | Ver §2. |
| `ordersCount` | `integer` | Pedidos | Conteo en ventana **actual** (mismo universo que ventas si aplica). |
| `ordersWeekChangePercent` | `number \| null` | | |
| `ordersYearChangePercent` | `number \| null` | | |
| `avgTicket` | `number` | Ticket promedio (COP) | `totalSales / ordersCount` si `ordersCount > 0`; si no, `0` o `null` + convención. |
| `avgTicketWeekChangePercent` | `number \| null` | | Calcular comparando ticket del día actual vs ticket del día referencia semana/año. |
| `avgTicketYearChangePercent` | `number \| null` | | |
| `cancellationRate` | `number` | % cancelaciones | **Porcentaje 0–100** con decimales (ej. `2.1` = 2,1 %). |
| `cancellationRateWeekChangePercent` | `number \| null` | | En UI **mejor** = bajar este % (`higherIsBetter: false`). |
| `cancellationRateYearChangePercent` | `number \| null` | | |

**Origen de datos (referencia BD actual):** principalmente tabla `order` (`branch_id`, `status`, `total`, `created_at`, `updated_at`, `status_times`); filtros por `branch_id` según §1.

---

## 5. Endpoint sugerido (a implementar)

```http
GET /api/dashboard/kpis?branchId=&date=YYYY-MM-DD
Authorization: Bearer …
```

- Respuesta: cuerpo como §4.
- **403/404** si un Admin intenta otra sucursal.
- Superadmin sin `branchId`: agregado multi-sucursal.

(El path exacto puede ajustarse al estándar del proyecto; mantener este contrato de `kpis`.)

---

## 6. Comparación entre sucursales (Superadmin)

Implementado en front: `BranchComparisonPanel` + filas `BranchComparisonRow[]` (`src/components/dashboard/branchComparison.types.ts`).

### 6.1 Endpoint y JSON sugeridos

```http
GET /api/dashboard/branches/comparison?date=YYYY-MM-DD
Authorization: Bearer …
```

```jsonc
{
  "asOf": "2026-03-14T05:00:00.000Z",
  "rows": [
    {
      "id": 1,
      "name": "Santander",
      "salesTotal": 2850000,
      "ordersTotal": 162,
      "salesDelivery": 1920000,
      "salesOnsite": 930000,
      "ordersDelivery": 108,
      "ordersOnsite": 54,
      "deliveryTimeMinutes": 34
    }
  ]
}
```

| Campo | Uso |
|-------|-----|
| `salesTotal` / `ordersTotal` | Barras simples (tabs Ventas / Pedidos) y ranking. |
| `salesDelivery`, `salesOnsite`, `ordersDelivery`, `ordersOnsite` | Barras **apiladas** (canales delivery / local / onsite). Deben ser coherentes con los totales. |
| `deliveryTimeMinutes` | Media tiempo entrega por sucursal (definir cálculo en backend; SLAs y `prepare_at`: `DASHBOARD_VISIBILITY.md`). |

**Admin:** no exponer comparativa multi-sucursal (ver `DASHBOARD_VISIBILITY.md`).

---

## 7. Otros bloques aún mock

| Bloque | Datos (borrador) |
|--------|------------------|
| **Pedidos por estado** | Conteos por `status` para el alcance y periodo. |
| **Actividad reciente** | Eventos con `description`, `timestamp`, `branchName`; paginación. |

---

## 8. Referencia rápida front

- Vista: `src/views/dashboard/GlobalDashboard.vue`
- KPI: `DashboardKpiCard.vue`
- Gráfico barras: `DashboardBarChart.vue`
- Tabs segmentados: `DashboardSegmentedTabs.vue`
- Barra mini: `DashboardMiniBar.vue`
- Tabla ranking: `DashboardRankingTable.vue`
- Panel comparación: `BranchComparisonPanel.vue`

Cualquier cambio en nombres de campos del JSON debe actualizarse en este documento y en el front a la vez.
