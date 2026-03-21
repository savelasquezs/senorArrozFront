# Contrato de datos — KPIs del dashboard (backend)

Documento para implementar **después** los endpoints que alimentan la vista de dashboard (`GlobalDashboard` para Superadmin; futura vista por sucursal para Admin). Reglas de alcance por rol: **`docs/DASHBOARD_VISIBILITY.md`**.

---

## 0. Modelo por sección (rendimiento)

**No** diseñar ni exponer un único `GET /api/dashboard/all` (o equivalente) que devuelva todas las secciones: sería costoso en base de datos, red y memoria.

En su lugar, **un contrato (o grupo pequeño) por categoría** del sidebar, alineado con la carga bajo demanda del front:

| Sección | Responsabilidad del endpoint (ejemplo conceptual) | Front (mock / futuro HTTP) |
|---------|---------------------------------------------------|----------------------------|
| **Principal** | KPIs + pipeline operativo + actividad reciente | `fetchPrincipalDashboard` → `useDashboardPrincipalSection` |
| **Ventas** | Alcance comparación sucursales + series temporales (con `from`/`to` según rango UI) | `fetchVentasDashboardScope` + computeds de series; `useDashboardVentasSection` |
| **Gastos** | (futuro) resumen / listados de gastos | stub hasta existir ruta |
| **Domicilios** | Operación: tiempos, pipeline domicilios, evolución, ranking repartidores (ver secciones 9–10 de este doc) | `fetchDomiciliosDashboardScope` (marca de vista) + estado detallado en padre hasta granularizar |
| **Mapa de entregas** | (futuro) entregas georreferenciadas | stub |
| **Regalos** | (futuro) campañas / canjes | stub |

Parámetros habituales por petición: `branchId` opcional (Superadmin / agregado), ventanas de fecha, paginación en listas. Al cambiar de sección o de sucursal, el cliente **vuelve a pedir** solo lo necesario para esa vista.

Implementación actual de referencia: `src/services/MainAPI/dashboardSectionApi.ts`, composables en `src/composables/dashboard/`, mocks base en `src/views/dashboard/mock/dashboardMockCore.ts`.

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

## 7. Evolución en el tiempo (Superadmin)

Front: `TimeEvolutionPanel` (`SalesTimeSeriesBlock`, `OrdersPerHourBlock` / `OrdersTimeSeriesBlock` en `timeEvolution.types.ts`). Rango con `DashboardDateRangeFilter`. **Granularidad** unificada: **día | hora | mes | año** (tabs `DashboardSegmentedTabs`). Convenciones: **día / mes / año** = todos los buckets entre `from` y `to` (meses como primer día de cada mes; años como años enteros); **hora** = último día del rango (`to`) para ventas multi-sucursal y pedidos por hora.

### 7.1 Ventas en el tiempo (multi-línea)

- **Por día:** eje X = días en `[from, to]`; eje Y = ventas (COP); una serie por sucursal.
- **Por hora:** eje X = horas (ej. 08:00–21:00) del día `to`; multi-sucursal.
- **Por mes:** eje X = meses calendario en el rango (ej. “ene 2025”); multi-sucursal; totales mensuales.
- **Por año:** eje X = años (`from.year` … `to.year`); multi-sucursal; totales anuales.

```http
GET /api/dashboard/sales-timeline?granularity=day|hour|month|year&from=YYYY-MM-DD&to=YYYY-MM-DD&branchIds=
Authorization: Bearer …
```

Respuesta sugerida (alineada con el front):

```jsonc
{
  "granularity": "day",
  "labels": ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  "series": [
    { "branchId": 1, "branchName": "Santander", "values": [820000, 910000, ...] }
  ]
}
```

El front transforma `series` → `datasets` de `DashboardLineChart` (misma longitud que `labels`). Ventas: filtrar pedidos **entregados** y fecha de negocio acordada (ver §3 del mismo doc).

### 7.2 Pedidos (serie agregada, misma granularidad)

- **Por hora:** `labels` + `counts`; UI: **área** o **barras**.
- **Por día / mes / año:** `labels` + `counts`; UI: **barras** (pedidos totales por bucket).

```http
GET /api/dashboard/orders-timeline?granularity=day|hour|month|year&from=YYYY-MM-DD&to=YYYY-MM-DD
Authorization: Bearer …
```

Ejemplo respuesta (misma forma para cualquier granularidad):

```jsonc
{
  "labels": ["08:00", "09:00", "..."],
  "counts": [12, 18, 25, ...]
}
```

**Admin:** solo su sucursal; sin multi-línea cruzada si no aplica.

Utilidades front para buckets: `daysInclusive`, `monthsInclusive`, `yearsInclusive` (`dashboardDateUtils.ts`).

**Presets de periodo (reutilizables):** definiciones y `getDateRangeForPreset` en `src/utils/dashboardPeriodPresets.ts`. UI: `DashboardPeriodFilter.vue` (chips: Hoy, Ayer, Esta quincena, Quincena pasada, Este mes, Mes pasado, Este año + rango personalizado con `DashboardDateRangeFilter`). La serie mock de evolución de entregas por granularidad está en `src/utils/deliveryEvolutionSeries.ts` (`buildDeliveryEvolutionSeries`).

---

## 8. Otros bloques aún mock

| Bloque | Datos (borrador) |
|--------|------------------|
| **Pedidos por estado** | Conteos por `status` para el alcance y periodo. |
| **Actividad reciente** | Eventos con `description`, `timestamp`, `branchName`; paginación. |

---

## 9. Operación en vivo (Kanban, tiempos, domiciliarios)

Los bloques **Operación de pedidos** (`OperationOverviewPanel` + hijos) muestran el tubería operativo y eficiencia. Convenciones UI:

- **Kanban + contadores:** columnas `Taken` / `In preparation` / `Ready` / `On the way` (en UI: Tomado, En preparación, Listo, En camino).
- **Cuello de botella (heurística):** columna con **mayor conteo**; si hay empate, todas las empatadas se marcan. La lógica puede refinarse (ej. tiempo acumulado en columna).
- **Medidor (gauge):** colores por minutos — verde **&lt; 30**, amarillo **30–45**, rojo **&gt; 45** (constante `minuteGaugeColor` en `gaugeColors.ts`). Máximo mostrado en arco: 60 min (solo visual).
- **Eficiencia domiciliarios:** barras horizontales (entregas) o dispersión (eje X = tiempo promedio de entrega min, eje Y = pedidos entregados).

### JSON sugerido — contadores pipeline

`GET /api/dashboard/operation/pipeline?branchId=` (superadmin con filtro sucursal; admin: su sucursal)

```json
{
  "taken": 14,
  "in_preparation": 11,
  "ready": 7,
  "on_the_way": 18
}
```

Nombres de campo en front: `OrderPipelineStatusCounts` (`operation.types.ts`).

### JSON sugerido — tiempos promedio (minutos)

`GET /api/dashboard/operation/avg-times?branchId=&from=&to=`

```json
{
  "avg_prep_minutes": 26.4,
  "avg_delivery_minutes": 41.2
}
```

- **Tiempo preparación:** de **Tomado** a **Listo** (mismo criterio que tablas `preparation_time_seconds`: `COALESCE(prepare_at, taken_at)` → Ready).
- **Tiempo entrega:** de **Listo** a **Entregado** (`ready_at` → `delivered_at`).

### JSON sugerido — eficiencia por domiciliario

`GET /api/dashboard/operation/deliverymen?branchId=&from=&to=`

- **`branchId`:** si se omite (superadmin), el front puede mostrar todas las sucursales; si se envía, solo domiciliarios de esa sucursal. **Admin:** siempre su sucursal (equivalente a `branchId` fijo).

```json
{
  "items": [
    {
      "id": 1,
      "branch_id": 1,
      "name": "Carlos R.",
      "delivered_count": 32,
      "avg_delivery_minutes": 33,
      "delivery_fee_total": 185000
    }
  ]
}
```

- **`branch_id`:** sucursal del repartidor (para filtrar el bloque en UI).
- **`delivery_fee_total`:** suma del costo de domicilio (delivery fee) cobrado en pedidos entregados por ese repartidor en el periodo `from`–`to` (COP, entero).

Para la **evolución temporal** (entregas + recaudo fees) con la misma granularidad, el front usa `buildDeliveryEvolutionBundle` + `scaleSeriesToTargetSum` (mock) o un endpoint tipo `GET .../operation/delivery-evolution?branchId=&from=&to=` devolviendo `labels`, `deliveries[]`, `fees_total[]` (COP por bucket). La línea **solo de entregas** puede filtrarse por **`userId` / `deliverymanId`** (mismo endpoint con `deliverymanId=` opcional) para que la serie ya venga desglosada; si no, el back puede devolver solo el agregado de sucursal y el front escala (como el mock).

En UI, los **títulos** junto a cada gráfica de domiciliarios muestran la **suma** de la serie o de las filas según el periodo. Para fees se muestra además la parte del **domiciliario** según `DELIVERY_FEE_DRIVER_SHARE` (por defecto **70%**, `src/constants/deliveryFeeShare.ts`); la gráfica de barras horizontales de fees por persona es **apilada** (70% / 30% resto).

**Admin:** solo su sucursal. **Superadmin:** todas o filtradas por sucursal. Datos en vivo pueden complementarse con SignalR (evento de cambio de estado) recalculando contadores.

---

## 10. Referencia rápida front

- Orquestación: `GlobalDashboard.vue` (Superadmin) y `AdminDashboard.vue` (Admin): sidebar + sección activa; carpeta `src/views/dashboard/`.
- Secciones: `src/views/dashboard/sections/*.vue`, ids `dashboardSectionIds.ts`.
- API por sección (mock): `src/services/MainAPI/dashboardSectionApi.ts`; composables: `src/composables/dashboard/` (incl. `useDashboardShellMockState.ts`: periodos, mocks domicilios/ventas compartidos entre `GlobalDashboard` y `AdminDashboard`).
- Navegación lateral: `DashboardRightNav.vue`
- KPI: `DashboardKpiCard.vue`
- Barras: `DashboardBarChart.vue`
- Línea / área: `DashboardLineChart.vue`
- Tabs segmentados: `DashboardSegmentedTabs.vue`
- Barra mini: `DashboardMiniBar.vue`
- Tabla ranking: `DashboardRankingTable.vue`
- Comparación sucursales: `BranchComparisonPanel.vue`
- Evolución temporal: `TimeEvolutionPanel.vue`
- **Operación:** `OperationOverviewPanel.vue`, `DashboardOrderStatusKanban.vue`, `DashboardGaugeCard.vue`, `DashboardGaugeDoughnut.vue`, `DashboardHorizontalBarChart.vue`, `DashboardDeliveryScatterChart.vue`, `DashboardPeriodFilter.vue`, tipos `operation.types.ts`, colores gauge `gaugeColors.ts`, utilidades `dashboardPeriodPresets.ts`, `deliveryEvolutionSeries.ts`
- Filtro fechas (rango): `DashboardDateRangeFilter.vue`, utilidades `dashboardDateUtils.ts`
- Colores series: `chartColors.ts` (`getBranchSeriesColor`)

Cualquier cambio en nombres de campos del JSON debe actualizarse en este documento y en el front a la vez.
