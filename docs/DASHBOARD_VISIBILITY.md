# Reglas de visibilidad — Dashboards (Superadmin vs Admin)

Este documento es la referencia al construir pantallas de métricas y gráficas. **Consultarlo antes de añadir KPIs, endpoints o componentes nuevos.**

## Ruta en el front

- Una sola ruta: **`/dashboard`** (meta `requiresRole`: Superadmin y Admin).
- **`Dashboard.vue`** elige el bloque visible según el rol: `GlobalDashboard.vue` (Superadmin) o `AdminDashboard.vue` (Admin).

## Estructura por secciones (`GlobalDashboard` / `AdminDashboard`)

Ambos paneles **no** cargan ni piden “todo el dashboard” en una sola petición. La UI está dividida en **las mismas categorías** con **sidebar fijo a la derecha** (`DashboardRightNav.vue`):

| Sección (id) | Contenido aproximado |
|--------------|----------------------|
| `principal` | KPIs, pipeline Kanban, actividad reciente |
| `ventas` | Comparación sucursales, evolución temporal, placeholder pedidos por estado |
| `gastos` | Placeholder (endpoint futuro) |
| `domicilios` | Operación / domiciliarios (`OperationOverviewPanel`) |
| `mapa_entregas` | Placeholder (mapa futuro) |
| `regalos` | Placeholder (endpoint futuro) |

- **Solo una sección activa** se muestra a la vez (componentes bajo `src/views/dashboard/sections/`).
- **Carga de datos:** al entrar en una sección (o al cambiar el filtro de sucursal mientras está activa) debe usarse el **patrón por vista**: composables en `src/composables/dashboard/` y funciones en `src/services/MainAPI/dashboardSectionApi.ts` (sustituir mocks por HTTP). **Evitar** un único endpoint que devuelva todas las secciones.
- **Filtro de sucursal (Superadmin):** en el sidebar, “Todas” o una sucursal concreta. Afecta a los bloques que sean susceptibles (Principal, Ventas, Domicilios, etc.). El bloque de domicilios **no** duplica el selector de sucursal cuando el filtro es global (`OperationOverviewPanel` con `showBranchFilter={false}`).
- **Admin (`AdminDashboard.vue`):** misma navegación por secciones y mismos componentes de sección, **sin** bloque de sucursal en el sidebar; `branchId` viene del perfil (`authStore`) y se pasa a composables y a domicilios sin selector duplicado.

Definición de ids: `src/views/dashboard/dashboardSectionIds.ts`.

## Contrato API para KPIs (implementación backend)

Lista de valores, ventanas temporales y JSON esperado: **`docs/DASHBOARD_KPI_API.md`**.

## Ubicación de componentes de dashboard

Todos los componentes reutilizables de dashboards (KPIs, gráficas, filtros de periodo, etc.) viven en:

`src/components/dashboard/`

Importar desde el índice del módulo cuando exista:

```ts
import {
  DashboardKpiCard,
  DashboardBarChart,
  DashboardLineChart,
  DashboardSegmentedTabs,
  DashboardRankingTable,
  BranchComparisonPanel,
  TimeEvolutionPanel,
  OperationOverviewPanel,
  DashboardPeriodFilter,
  DashboardRightNav,
} from '@/components/dashboard'
```

### `DashboardKpiCard` (KPIs)

Tarjeta compacta: **valor en una línea** (`truncate`, tipografía pequeña); sin barras de desplazamiento; el número completo se puede ver en el `title` al pasar el cursor.

- **Formatos**: `currency` (COP), `number`, `percent` (sufijo % en el valor principal).
- **`weekChangePercent`** / **`yearChangePercent`**: variación vs mismo día semana anterior / misma fecha año anterior. Etiquetas cortas en UI: **“semana pasada”** y **“año pasado”**. Ambas en **una fila** (`flex`), cada bloque: flecha + % + etiqueta.
- Si ambas son `null`, se muestra “Sin comparación disponible”.
- **Color**: 🟢 mejor (`text-emerald-600`), 🔴 peor (`text-red-600`), gris si el cambio es 0.
- **`higherIsBetter`**: por defecto `true`. En **% cancelaciones** usar `false` (bajar el % es verde).
- **Flecha**: según el signo del delta; el color según bueno/malo.
- Rejilla sugerida: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5`.

## Roles

- **Superadmin**: ve datos de **todas las sucursales** y puede usar **vistas comparativas** entre sucursales.
- **Admin**: ve **únicamente la información de su sucursal** (`branchId` del usuario). No debe acceder a datos agregados o comparativos que implied otras sucursales.

## Alcance de datos

| Aspecto | Superadmin | Admin |
|--------|------------|-------|
| Filtro de sucursal | Opcional o “todas”; puede elegir una sucursal para detalle | Siempre **fijo** a su sucursal (sin selector multi-sucursal) |
| Métricas propias de la operación (ventas, pedidos por estado, ticket, cancelaciones de *su* punto, etc.) | Sí (global o por sucursal seleccionada) | Sí, solo su sucursal |
| Rankings / tablas “top” dentro de una sucursal | Sí | Sí |
| **Comparativas entre sucursales** (ej. ventas A vs B, ranking de sucursales, mismos gráficos partidos por `branch`) | **Sí** | **No** — no mostrar ni pedir datos de otras sucursales |
| Totales o promedios **globales del negocio** (todas las sucursales) | Sí | **No** — sustituir por totales solo de su sucursal |
| Listados que mezclen actividad de varias sucursales | Sí | **No** |

## API y permisos (cuando existan endpoints de dashboard)

- Los endpoints “globales” o sin `branchId` deben estar restringidos a **Superadmin** (o devolver solo lo permitido según rol).
- Para **Admin**, los endpoints deben **inferir o exigir** el `branchId` del usuario autenticado y **rechazar** cualquier intento de consultar otra sucursal.
- No exponer en respuestas de Admin campos que identifiquen o desglosen otras sucursales si no aportan a su contexto (evitar fugas de datos en payloads compartidos).

## UI / UX

- Ocultar en Admin: selectores “todas las sucursales”, leyendas multi-sucursal, tarjetas “vs resto de sucursales”, etc.
- Mantener **la misma familia de métricas** donde aplique (mismos KPIs conceptualmente), cambiando solo el **ámbito** (global vs una sucursal) y la **ausencia de comparativas** para Admin.

## Cálculo de tiempos y cambios de estado (pedidos)

Al calcular duraciones entre estados, SLAs o cualquier métrica que use el instante en que el pedido pasó a **Taken** (taken):

- Si el pedido tiene **`prepare_at`** con valor (no nulo), ese instante **sustituye** en el cálculo al instante real de **Taken** para todos los fines de ese cómputo.
- Es decir: **referencia temporal “efectiva de inicio” = `prepare_at` si existe; si no, el timestamp de Taken** (p. ej. desde `status_times` u otra fuente de verdad).

Ejemplo: tiempo hasta Ready se mide desde `prepare_at` si está definido; en caso contrario, desde Taken.

Esta regla aplica igual para **Superadmin** y **Admin**; solo cambia el filtro de sucursal según la sección *Alcance de datos*.

## Resumen en una línea

> **Admin = mismas métricas operativas que le importan a su sucursal, sin comparativas ni datos de otras sucursales. Superadmin = eso más visión multi-sucursal y comparativas.**
