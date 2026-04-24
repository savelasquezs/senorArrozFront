# Plan maestro de refactor (frontend)

**Ámbito:** `senorArrozFront`  
**Principios:** SOLID, separación UI / lógica, cambios incrementales.  
**Última auditoría de código:** 2026-04-24 (estado verificado en repo).

---

## Resumen ejecutivo

La revisión arquitectónica definió tres fases. En el código **no existe** un símbolo llamado `runAsyncAction`; el patrón vigente para acciones async con loading/error es **`createResourceState()`** y su método **`run()`** en `src/store/helpers/resourceStore.ts` (equivalente funcional al “runAsyncAction” del plan).

### Aclaración: “Phase 2” en el log de Codex ≠ Fase 2 del plan

En la sesión de **Codex CLI** aparece la frase *“Phase 2 rollout”* al correr tests/build tras migrar stores. Ahí **“Phase 2”** se refiere al **siguiente lote de trabajo del propio refactor incremental de stores** (p. ej. bancos/apps y verificación amplia), **no** a la **Fase 2 arquitectónica** de este documento (`OrderPolicy`, extracción de `OrdersList.vue`). Para evitar confusiones, en estos docs usamos **Fase 1 / 2 / 3** solo como en la revisión arquitectónica (tablas siguientes).

### Historial verificado: sesión Codex CLI (abr. 2026)

Consta en la terminal / transcript revisado:

- Migración de stores **`apps`** y **`banks`** al patrón **`resourceStore`** (`createResourceState`, `run`, helpers de lista paginada donde aplica; en `apps`, sincronización de **`byBank`** en create/update/remove).
- Tests nuevos: **`src/store/__tests__/apps.test.ts`**, **`src/store/__tests__/banks.test.ts`** (mocks de API, rutas de lista y mutaciones).
- Verificación: **`npx vitest`** (suites objetivo y suite completa) y **`npm run build`** en `senorArrozFront` sin errores (solo avisos habituales de Rollup/chunks).

**No consta** en ese log que la misma sesión migrara **`customers`**, **`products`** o **`productCategories`**; en el repo actual también usan `createResourceState` (trabajo previo u otras sesiones). Ver **`refactor-tracking.md`** para separar “atribuido a Codex” vs “solo verificado en código”.

---

## Estado actual (verificado en código)

### Fase 1 — Alta prioridad

| Objetivo | Estado | Evidencia |
|----------|--------|-----------|
| Acción async unificada (loading/error) | **Parcial** | `createResourceState` + `run` en `apps`, `banks`, `customers`, `products`, `productCategories`, **`ordersData`**. **No** en `ordersDrafts`, `delivery`, `branches`, `auth`, `productSearch`, `users`, `bankPayments`, `appPayments`, `expenseCategoriesCatalog`, `branchPosSettings`. |
| Helpers de mutación de listas paginadas | **Hecho (stores migrados)** | `prependPagedItem`, `replacePagedItem`, `removePagedItem` en `resourceStore.ts`; usados en stores CRUD migrados, incl. **`ordersData`** en update/remove/selfAssign. |
| Paginación centralizada (`BasePagination`) | **Muy parcial** | Uso confirmado en `DeliveryHistoryTable.vue`. El componente vive como `BasePaginatiopn.vue` (typo en nombre de archivo). Muchas vistas con lógica de página propia (p. ej. pedidos). |
| Fechas vía capa de dominio (`DateTimeService` / calendario) | **Parcial** | `DateTimeService` + `defaultBusinessCalendar` / `useDateTime` existen. Uso correcto en p. ej. `OrderSidebar.vue`. Persisten utilidades y TZ dispersas; conviene auditar vistas que aún formatean o interpretan fechas inline. |
| `QueryParamMapper` / `buildQueryParams` | **Parcial** | Implementado en `src/services/MainAPI/queryParams.ts` y usado en `appApi`, `bankApi`, `customerApi`, `productApi`, `productCategoryApi`. **`orderApi.getOrders` sigue mapeando filtros a mano** (duplicación y riesgo de desalineación). |

### Fase 2

| Objetivo | Estado | Evidencia |
|----------|--------|-----------|
| `OrderPolicy` (reglas de negocio pedidos) | **No iniciado** | No hay módulo `OrderPolicy` en el repo. |
| Extraer lógica de `OrdersList.vue` | **No iniciado** | Vista ~1490 líneas; sigue concentrando filtros, fetch, tablas, modales y handlers. |

### Fase 3

| Objetivo | Estado | Evidencia |
|----------|--------|-----------|
| Clean Architecture (ports, repos, casos de uso) | **No iniciado** | APIs actuales son clases `*Api` + `BaseApi`; sin capa de puertos/casos de uso explícita en el front. |

---

## Completado (verificado)

- Helper **`createResourceState`** + **`run`**, **`clearError`**, y mutadores de lista paginada en `src/store/helpers/resourceStore.ts`.
- **Sesión Codex (documentada):** stores **`apps`** y **`banks`** migrados al patrón anterior; tests **`apps.test.ts`** y **`banks.test.ts`**.
- **Store `ordersData`:** migrado a `createResourceState` + helpers de lista; tests **`ordersData.test.ts`** (2026-04-24).
- **Resto del repo (código actual, sin atribución en log Codex):** **`customers`**, **`products`**, **`productCategories`** también usan `createResourceState`; conviene mantener tests/regresión al mismo nivel que apps/banks donde falten.
- **`buildQueryParams`** + tipo **`QueryParamMapper`** y tests en `queryParams.test.ts`.
- **`DateTimeService`** y calendario de negocio (`businessCalendar`, `DEFAULT_BUSINESS_TIMEZONE`).
- Documentación de negocio en `docs/business-rules.md` (referencia a zona Bogotá / DateTimeService).

---

## Pendiente (priorizado, incremental)

1. **Fase 1 — cerrar brechas sin tocar aún los god components**
   - Refactorizar **`orderApi.getOrders`** para usar `buildQueryParams` + mapper tipado (misma semántica que el objeto `params` actual).
   - Extender uso de **`BasePagination`** (y corregir nombre del archivo del componente cuando haya ventana segura de renombre + imports).
2. **Fase 1 — resto de stores** con patrón manual `isLoading`/`try`/`catch`: priorizar los que alimentan listas paginadas o pantallas críticas (`productSearch`, `delivery`, `ordersDrafts`, etc.).
3. **Fase 2 —** introducir **`OrderPolicy`** (funciones puras / clase pequeña) y mover reglas desde `OrdersList.vue` / `OrderDetailContent.vue` de forma incremental.
4. **Fase 2 —** dividir **`OrdersList.vue`** en composables + subcomponentes (un eje a la vez: filtros, fetch/paginación, tabla, modales).
5. **Fase 3 —** definir límites (puerto = interfaz, adaptador = `*Api`, caso de uso = función/composable de aplicación) solo cuando Fase 1–2 estabilicen el dominio de pedidos.

---

## Deuda técnica detectada

- **God components:** `OrdersList.vue` (~1490 líneas), `OrderDetailContent.vue` (~1323 líneas).
- **`ordersData`:** resuelto en cuanto a `resourceStore`; permanece deuda en torno a **`orderApi`** (query params) y god components que consumen el store.
- **`orderApi`:** filtros no usan `buildQueryParams`.
- **Paginación:** poco reutilizo del componente UI; nombre de archivo `BasePaginatiopn.vue` inconsistente.
- **Comentarios legacy** en `ordersData.ts` (“COPIAR EXACTO”) indican deuda de documentación y posible desalineación con la fuente de verdad.

---

## Próximo paso único recomendado

Ver **`docs/refactor-tracking.md`** (siguiente: **`orderApi.getOrders`** → `buildQueryParams`).
