# Reglas de refactor (frontend SenorArroz)

Objetivo: cambios **pequeños**, **reversibles** y **consistentes** con el código existente.

---

## 1. Cuándo extraer lógica de un componente

Extraer cuando se cumple **alguno** de estos criterios:

- El `.vue` supera **~300–400 líneas** de script o mezcla muchas responsabilidades (filtros + API + estado + modales).
- La misma regla o cálculo aparece en **más de un** componente.
- Es **difícil de testear** sin montar toda la UI.
- Hay **ramas condicionales** largas que encarnan reglas de negocio (“si estado X y tipo Y entonces…”).

**No extraer** en el mismo cambio: solo estilos, copy o un bugfix de una línea (evitar mezclar refactors masivos con fixes).

---

## 2. Separación UI vs lógica de negocio / aplicación

| Capa | Qué va aquí | Ejemplos |
|------|-------------|----------|
| **Vista / componente** | Marcado, clases, eventos de UI, binding | `v-model`, `@click`, slots |
| **Composable** | Estado de pantalla, wiring store ↔ API, efectos | `useOrderListFilters`, `usePagination` |
| **Dominio (policy / servicios puros)** | Reglas sin Vue, sin HTTP | `OrderPolicy.canCancel(status)`, funciones puras |
| **Store (Pinia)** | Estado compartido, orquestación de llamadas API, caché de listas | `useOrdersDataStore` |
| **API (`*Api`)** | Serialización HTTP, query params, URLs | `orderApi.getOrders` |

**Prohibido en componentes (anti-patrón):** bloques grandes de reglas de negocio que podrían ejecutarse igual en un test unitario sin DOM.

---

## 3. Composables (`src/composables/`)

- Un composable debe tener **un eje claro** (fechas, permisos, filtros, envío de formulario).
- **Reutilizar** los existentes (`useDateTime`, `useFormatting`, etc.) antes de crear uno nuevo.
- Preferir **entrada explícita** (refs/args) sobre leer “cualquier store” global salvo que sea cross-cutting (`auth`).
- Exportar tipos cuando el consumidor necesite contratos estables.

---

## 4. Helpers y servicios

- **Helpers genéricos** → `src/utils/` (sin dependencia de Vue si es posible).
- **Tiempo y zona de negocio** → `DateTimeService`, `businessCalendar`, `useDateTime`; **no** repetir `'America/Bogota'` ni offsets en cada vista.
- **Query string** → `buildQueryParams` + `QueryParamMapper` en APIs; **no** duplicar mapas ad hoc si el patrón ya existe en otro `*Api`.

---

## 5. Patrón de stores (async y listas)

- Para operaciones async con loading y error, usar **`createResourceState`** de `src/store/helpers/resourceStore.ts` y envolver el cuerpo con **`run()`** (equivalente al “runAsyncAction” del plan arquitectónico).
- Opciones soportadas: `silent`, `errorMessage` (ver `ResourceActionOptions`).
- Para listas **`PagedResult<T>`** ya cargadas en memoria:
  - insertar al inicio → `prependPagedItem`
  - actualizar por `id` → `replacePagedItem`
  - borrar por `id` → `removePagedItem`
- **No** copiar/pegar bloques `isLoading = true` / `try` / `finally` en cada acción si el store es un CRUD estándar.

---

## 6. Paginación en UI

- Preferir el componente compartido de paginación (actualmente **`BasePaginatiopn.vue`**) en listas paginadas.
- La vista puede poseer `page` / `pageSize`, pero la **presentación** del control de páginas debe reutilizar el mismo componente para UX y accesibilidad consistentes.

---

## 7. Anti-patrones (evitar)

- **God component:** una sola vista que concentra decenas de handlers, fetch y modales.
- **Lógica de negocio inline** en template o en computed de 80+ líneas sin extraer.
- **Duplicar** mapeo de filtros a query params en cada API.
- **Refactor “big bang”** en múltiples módulos sin tests ni compilación intermedia.
- **Nuevos `alert()`** — el proyecto usa modales personalizados.

---

## 8. Orden de trabajo recomendado

1. Alinear **stores/API** con patrones existentes (`resourceStore`, `buildQueryParams`).
2. Introducir **policies** y composables **extraídos de un solo archivo** por PR.
3. **Último** (cuando el dominio esté estable): plantear puertos/adaptadores si el equipo adopta Clean Architecture explícita en el front.

---

## 9. Verificación obligatoria tras cambios

- `npm run test:run` y `npm run build` en `senorArrozFront` después de cambios sustantivos.
- Si se toca regla de negocio, revisar **`bussiness-rules.md`** en la raíz del monorepo (o equivalente acordado).

---

## 10. Numeración “Fase” en herramientas (p. ej. Codex)

En logs de asistentes puede aparecer **“Phase 2”** refiriéndose a un **lote interno** de migración o verificación (p. ej. “seguir con el siguiente grupo de stores”). Eso **no** debe confundirse con **Fase 1 / 2 / 3** del **`refactor-master-plan.md`** (Fase 2 = `OrderPolicy` + `OrdersList`, etc.). Cuando documentes trabajo hecho con IA, anota **archivos tocados** y **commits/PR**; no te bases solo en la palabra “phase” del chat.
