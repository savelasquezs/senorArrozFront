# Seguimiento de refactor (frontend)

Leyenda: **Completado** · **Parcial** · **Pendiente**

**Nota:** La columna **Origen** indica qué quedó explícito en el **log de la sesión Codex CLI** (abr. 2026). El resto está **verificado en el código** pero no aparece en ese transcript.

---

## Stores (`src/store/`)

### Completado

| Archivo | Origen | Qué mejoró | Qué falta |
|---------|--------|------------|-----------|
| `helpers/resourceStore.ts` | Código (+ uso Codex en `apps`/`banks`) | `createResourceState`, `run`, helpers de lista paginada | Opcional: renombrar/documentar como “runAsyncAction” en guías si se unifica el vocabulario |
| `apps.ts` | **Codex** | Patrón unificado + `byBank` + mutaciones coherentes; `__tests__/apps.test.ts` | Nada crítico |
| `banks.ts` | **Codex** | Patrón unificado + `currentDetail` + remove limpia selección; `__tests__/banks.test.ts` | Nada crítico |
| `customers.ts` | Código (no en log Codex) | Patrón unificado | Tests de store al nivel de apps/banks si no existen |
| `products.ts` | Código (no en log Codex) | Patrón unificado | Idem |
| `productCategories.ts` | Código (no en log Codex) | Patrón unificado | Archivo grande (~471 líneas); tests/regresión; posible extracción futura |
| `ordersData.ts` | Código | `createResourceState` + `run`, `removePagedItem` / `replacePagedItem`, `ResourceActionOptions` opcional en acciones; `update` en **silent** por defecto (sin `isLoading`); `clear` usa `clearError`; tests `ordersData.test.ts` | Opcional: métodos delivery en tests; alinear `orderApi.getOrders` con `buildQueryParams` (otro archivo) |

### Pendiente (patrón clásico isLoading/try/catch o sin helpers)

| Archivo | Qué mejoró | Qué falta |
|---------|------------|-----------|
| `ordersDrafts.ts` | — | Alinear con `resourceStore` donde haya fetch/mutación repetida |
| `delivery.ts` | — | Idem |
| `branches.ts` | — | Idem |
| `branchPosSettings.ts` | — | Idem |
| `expenseCategoriesCatalog.ts` | — | Idem |
| `bankPayments.ts` | — | Idem (API options store) |
| `appPayments.ts` | — | Idem |
| `productSearch.ts` | — | Idem |
| `users.ts` | — | Idem |
| `auth.ts` | — | Valorar si el patrón aplica (sesión vs recurso CRUD) |

---

## API / infra (`src/services/MainAPI/`)

### Parcial

| Archivo | Qué mejoró | Qué falta |
|---------|------------|-----------|
| `queryParams.ts` | `QueryParamMapper`, `buildQueryParams`, tests | Extender adopción a más clientes HTTP |
| `orderApi.ts` | `getOrders` usa `buildQueryParams` + `orderGetOrdersQueryMapper`; tests `orderGetOrdersQuery.test.ts` | Otros métodos con `params` manual (`fetchList`, `fetchDeliveryReady`, etc.) si se unifica |

### Completado (mapper)

`appApi.ts`, `bankApi.ts`, `customerApi.ts`, `productApi.ts`, `productCategoryApi.ts` — usan `buildQueryParams`.

---

## Dominio / utilidades

### Parcial

| Archivo | Qué mejoró | Qué falta |
|---------|------------|-----------|
| `services/domain/DateTimeService.ts` | Hora local ↔ Date en zona de negocio | Usar de forma sistemática en vistas con fechas; evitar duplicar offset/TZ |
| `utils/datetime/businessCalendar.ts` | API de calendario cerrada sobre `America/Bogota` | Auditar call sites que aún usen `Intl` o strings inline |

---

## Componentes y vistas

### Pendiente (alto impacto)

| Archivo | Qué mejoró | Qué falta |
|---------|------------|-----------|
| `views/OrdersList.vue` | — | Extraer composables (filtros, paginación, fetch), sub-vistas, delegar reglas a `OrderPolicy` |
| `components/orders/OrderDetailContent.vue` | — | Separar orquestación, reglas y UI; reducir llamadas directas mezcladas con presentación |

### Parcial

| Archivo | Qué mejoró | Qué falta |
|---------|------------|-----------|
| `components/ui/BasePaginatiopn.vue` | Componente de paginación existe | Corregir nombre archivo → `BasePagination.vue` y actualizar imports; ampliar uso |
| `components/delivery/DeliveryHistoryTable.vue` | Usa `BasePagination` | — |

---

## Fase 3 (Clean Architecture)

| Área | Estado |
|------|--------|
| Puertos / adaptadores / casos de uso en front | **No implementado** |

---

## Próximo archivo a refactorizar (un solo archivo)

Sugerencia: **`orderApi.fetchList`** o **`fetchDeliveryReady`** (mismo patrón `buildQueryParams`) **o** el siguiente store pendiente (`ordersDrafts`, `delivery`, etc.) — ver tabla **Pendiente** arriba.

**Por qué:** `getOrders` ya está unificado; conviene un archivo a la vez para no mezclar riesgos.
