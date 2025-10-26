# Señor Arroz - Sistema de Gestión de Restaurante

## 📋 Información General del Proyecto

**Señor Arroz** es un sistema completo de gestión de restaurante desarrollado en Vue 3 + TypeScript + Tailwind CSS. El sistema maneja pedidos, clientes, productos, pagos y múltiples roles de usuario con funcionalidades específicas para cada tipo de operación.

> **📚 Documentación Modular**: Esta documentación ha sido dividida en archivos especializados en la carpeta `docs/`. Para información detallada, consulta:
> - **[docs/README.md](./docs/README.md)** - Overview completo y navegación
> - **[docs/architecture.md](./docs/architecture.md)** - Arquitectura técnica
> - **[docs/components.md](./docs/components.md)** - Guía de componentes
> - **[docs/business-rules.md](./docs/business-rules.md)** - Reglas de negocio
> - **[docs/api-reference.md](./docs/api-reference.md)** - Referencia de APIs
> - **[docs/development.md](./docs/development.md)** - Guías de desarrollo

### 🏗️ Arquitectura Técnica

- **Frontend**: Vue 3 + Composition API + TypeScript
- **Styling**: Tailwind CSS v4
- **Estado**: Pinia (stores modulares)
- **Routing**: Vue Router 4
- **HTTP Client**: Axios con interceptores
- **Icons**: Heroicons
- **Build Tool**: Vite
- **Testing**: Vitest

### 🎨 Paleta de Colores y Diseño

#### Colores Principales
- **Primario**: Emerald (Verde) - `#009966`, `emerald-600`, `emerald-700`
- **Secundario**: Gray (Gris) - `gray-50`, `gray-100`, `gray-300`, `gray-500`, `gray-700`, `gray-900`
- **Éxito**: Green - `green-600`, `green-700`
- **Peligro**: Red - `red-600`, `red-700`
- **Advertencia**: Yellow/Orange
- **Info**: Blue

#### Sistema de Diseño
- **Bordes redondeados**: `rounded-lg`, `rounded-xl`, `rounded-2xl`
- **Sombras**: `shadow-sm`, `shadow-md`
- **Espaciado**: Sistema consistente con Tailwind
- **Tipografía**: Font weights: `font-medium`, `font-bold`
- **Transiciones**: `transition-all duration-200`

## 🏢 Estructura del Proyecto

```
src/
├── components/           # Componentes Vue (organización domain-driven)
│   ├── layout/          # Componentes de layout (Sidebar, TopNav, etc.)
│   ├── ui/              # Componentes base reutilizables
│   ├── branches/        # Componentes de sucursales
│   │   ├── BranchForm.vue
│   │   ├── BranchUsersTable.vue
│   │   └── users/
│   │       └── UserForm.vue
│   ├── customers/       # Componentes de clientes
│   │   ├── CustomerForm.vue
│   │   ├── CustomerSection.vue
│   │   ├── CustomerDetailModal.vue
│   │   ├── CustomerSelector.vue
│   │   ├── CustomerStatsCard.vue
│   │   ├── CustomerAddressesList.vue
│   │   ├── PhoneNumberItem.vue
│   │   └── address/
│   │       └── CustomerAddressForm.vue
│   ├── neighborhoods/   # Componentes de barrios
│   │   └── NeighborhoodSearch.vue
│   ├── orders/          # Componentes de pedidos
│   │   ├── OrderSidebar.vue
│   │   ├── OrderHeader.vue
│   │   ├── OrderItemList.vue
│   │   ├── OrderTabs.vue
│   │   ├── products/
│   │   │   ├── ProductCard.vue
│   │   │   ├── ProductGrid.vue
│   │   │   ├── ProductStock.vue
│   │   │   ├── ProductCardSkeleton.vue
│   │   │   ├── ProductCategories.vue
│   │   │   └── ProductSearch/
│   │   │       ├── ProductSearch.vue
│   │   │       ├── SearchInput.vue
│   │   │       ├── FilterToggle.vue
│   │   │       ├── ActiveFilters.vue
│   │   │       ├── FilterPanel.vue
│   │   │       └── SearchHistory.vue
│   │   ├── payments/
│   │   │   └── PaymentSelector.vue
│   │   └── __tests__/
│   └── products/        # Componentes legacy de productos
│       └── ProductsGrid.vue
├── views/               # Páginas/Vistas principales
├── store/               # Stores de Pinia
│   ├── auth.ts
│   ├── orders.ts
│   ├── productSearch.ts
│   └── __tests__/
├── services/            # APIs y servicios HTTP
│   └── MainAPI/
├── types/               # Definiciones de TypeScript
│   ├── order.ts
│   └── product.ts
├── composables/         # Composables Vue reutilizables
│   ├── useFormatting.ts
│   ├── useOrderTabs.ts
│   ├── useOrderItems.ts
│   ├── useOrderPayments.ts
│   ├── useOrderValidation.ts
│   ├── useOrderSubmission.ts
│   ├── useOrderPersistence.ts
│   └── __tests__/
├── router/              # Configuración de rutas
├── test/                # Configuración de tests
│   └── setup.ts
└── assets/              # Recursos estáticos
```

## 👥 Sistema de Roles y Permisos

### Roles Definidos
```typescript
enum UserRole {
  SUPERADMIN = 'Superadmin',    // Acceso total al sistema
  ADMIN = 'Admin',              // Administrador de sucursal
  CASHIER = 'Cashier',          // Cajero
  KITCHEN = 'Kitchen',          // Cocina
  DELIVERYMAN = 'Deliveryman'   // Domiciliario
}
```

### Matriz de Permisos

| Funcionalidad | Superadmin | Admin | Cajero | Cocina | Domiciliario |
|---------------|------------|-------|--------|--------|--------------|
| Dashboard Global | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestión Usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestión Productos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestión Pedidos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gestión Clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gestión Bancos/Apps | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver Pedidos Cocina | ✅ | ✅ | ❌ | ✅ | ❌ |
| Entregar Pedidos | ✅ | ✅ | ❌ | ❌ | ✅ |

## 🍽️ Funcionalidades Principales

### 1. Sistema de Pedidos
- **Tipos de Pedido**:
  - `onsite`: En el local (cliente opcional)
  - `delivery`: A domicilio (cliente + dirección + guestName obligatorios)
  - `reservation`: Reservación (fecha/hora + guestName obligatorios)

- **Estados del Pedido** (estado inicial: `taken`):
  - `taken`: Tomado (estado por defecto al crear)
  - `in_preparation`: En preparación
  - `ready`: Listo
  - `on_the_way`: En camino
  - `delivered`: Entregado
  - `cancelled`: Cancelado

- **Campo guestName**:
  - Obligatorio para `delivery` y `reservation`
  - Auto-completado con nombre del cliente si existe
  - Editable para casos donde recibe otra persona

### 2. Gestión de Productos
- Categorías por sucursal
- Control de stock
- Precios dinámicos
- Activar/desactivar productos

### 3. Sistema de Pagos
- **App Payments**: Máximo 1 por pedido (Rappi, Uber Eats, etc.)
- **Bank Payments**: Múltiples transferencias bancarias
- **Efectivo**: Diferencia no cubierta por apps/bancos
- **Liquidación de Apps**: Crear bank_payment cuando app se marca como settled

### 4. Gestión de Clientes
- Registro con teléfono
- Múltiples direcciones por cliente
- Dirección principal
- Historial de pedidos

## 🛠️ Componentes Clave

### Componentes UI Base
- `BaseButton`: Botón con variantes (primary, secondary, danger, success, outline, ghost)
- `BaseInput`: Input con validación y estados
- `BaseCard`: Tarjeta contenedora
- `BaseDialog`: Modal/Dialog
- `BaseLoading`: Spinner de carga
- `BaseAlert`: Alertas y notificaciones
- `BaseToast`: Sistema de toasts
- `BaseSelect`: Select con busqueda dinamica y opcion de creacion al no encontrar resultado.
- `BaseRadioGroup`: Grupo de radio buttons con estilo segmentado (iOS-style). Soporta tamaños (sm, md, lg), fullWidth, y estados disabled. Ideal para selección de opciones mutuamente excluyentes de forma compacta.

### Componentes de Layout
- `MainLayout`: Layout principal con sidebar
- `Sidebar`: Navegación lateral
- `TopNavigation`: Barra superior
- `Breadcrumbs`: Navegación de rutas

### Componentes de Funcionalidad
- `ProductsGrid`: Grid de productos con filtros (legacy - usar ProductGrid)
- `ProductGrid`: Grid responsive optimizado con ProductCard
- `ProductCard`: Componente minimalista (sin imagen, click para agregar, hover effect, stock ilimitado para "arroces")
- `ProductStock`: Sub-componente para estado de stock con soporte de stock ilimitado
- `ProductCardSkeleton`: Skeleton loading para ProductCard
- `ProductSearch`: Sistema completo de búsqueda y filtros
- `CategoriesBar`: Barra de categorías clickeables
- `OrderSidebar`: Sidebar de pedidos activos con tabs, validación completa y feedback visual
- `OrderHeader`: Header del pedido con tipo y nombre
- `OrderItemList`: Lista de productos en el pedido
- `OrderTabs`: Sistema de tabs para múltiples pedidos
- `CustomerSelector`: Selector de clientes por teléfono
- `PaymentSelector`: Selector de métodos de pago con validación de monto máximo y término "Efectivo"

### Componentes Autónomos ⭐
Componentes que manejan su propio estado y deciden cuándo emitir vs. actualizar directamente:

- **`CustomerSection`**: Selector de cliente con modo draft/persisted
  - Modo 'draft': Actualiza `ordersDraftsStore` directamente
  - Modo 'persisted': Emite eventos para validación externa
  - Auto-selecciona dirección principal
  - Auto-completa guestName

- **`PersistedPaymentSelector`**: Gestión completa de pagos
  - CRUD de pagos (app y bank)
  - Verificación de bank payments
  - Liquidación de app payments
  - Auto-ajuste de pagos al cambiar total
  - Validación de monto máximo
  - Emite solo `@updated` cuando hay cambios

- **Modales Autónomos**:
  - `EditCustomerModal`: Edición de cliente con validación interna
  - `SelectAddressModal`: Selección/edición de dirección con delivery fee
  - `EditOrderTypeModal`: Cambio de tipo de pedido con validaciones
  - Todos manejan API calls, validación y actualizaciones optimistas internamente

**Patrón común:**
```typescript
interface Props {
    mode?: 'draft' | 'persisted'  // Define comportamiento
}

// Lógica condicional
if (props.mode === 'draft') {
    store.updateData(data)  // Actualizar directamente
} else {
    emit('data-updated', data)  // Emitir para validación
}
```

Ver [docs/patterns.md](./docs/patterns.md) para más detalles.

## 🗄️ Stores de Pinia

### Auth Store (`auth.ts`)
```typescript
// Estado
user: User | null
token: string | null
isAuthenticated: computed
userRole: computed
branchId: computed

// Acciones
login(credentials)
logout()
refreshAccessToken()
changePassword()
forgotPassword()
resetPassword()
```

### Orders Store (`orders.ts`)
```typescript
// Estado
list: PagedResult<Order> | null
current: Order | null
activeOrders: Map<string, DraftOrder>
activeOrderId: string | null
products: Product[]
categories: ProductCategory[]

// Acciones principales
fetchList(filters)
fetchById(id)
create(dto: CreateOrderDto)
update(id, dto)
updateGuestName(name)
recalculateTotals()

// NOTA: La lógica de tabs, items y pagos se movió a composables:
// - useOrderTabs: Gestión de tabs
// - useOrderItems: CRUD de productos
// - useOrderPayments: Gestión de pagos
// - useOrderValidation: Validaciones
// - useOrderSubmission: Envío al backend
```

### ProductSearch Store (`productSearch.ts`)
```typescript
// Estado de búsqueda
searchState: {
  query: string
  suggestions: Product[]
  history: string[]
  showSuggestions: boolean
}

// Estado de filtros
filterState: {
  category: number | null
  minPrice: number | null
  maxPrice: number | null
  stockFilter: 'all' | 'available' | 'out_of_stock'
  expanded: boolean
}

// Acciones principales
setSearchQuery(query)
searchWithDebounce(callback, debounceMs)
setCategoryFilter(categoryId)
setPriceRange(min, max)
setStockFilter(filter)
clearFilters()
loadSearchHistory()
saveSearchHistory()
```

## 🧩 Composables de Gestión de Pedidos

Para evitar stores sobrecargados ("god objects"), la lógica compleja de pedidos se divide en composables especializados:

### useOrderTabs (`composables/useOrderTabs.ts`)
```typescript
// Gestión de tabs de pedidos activos
createNewTab(type: OrderType) - Crear nuevo tab
switchTab(tabId: string) - Cambiar entre tabs
closeTab(tabId: string) - Cerrar tab
renameTab(tabId: string, name: string) - Renombrar tab
updateOrderType(type: OrderType) - Cambiar tipo de pedido
```

### useOrderItems (`composables/useOrderItems.ts`)
```typescript
// CRUD de productos en el pedido
addProduct(product: Product) - Agregar producto al pedido
removeItem(detailId: string) - Quitar producto
updateQuantity(detailId: string, quantity: number) - Actualizar cantidad
updatePrice(detailId: string, price: number) - Actualizar precio
updateDiscount(detailId: string, discount: number) - Aplicar descuento
updateNotes(detailId: string, notes: string) - Agregar notas
```

### useOrderPayments (`composables/useOrderPayments.ts`)
```typescript
// Gestión de métodos de pago
addAppPayment(appId: number, amount: number) - Agregar pago por app
updateAppPayment(tempId: string, amount: number) - Actualizar pago app
removeAppPayment(tempId: string) - Quitar pago app
addBankPayment(bankId: number, amount: number) - Agregar pago bancario
updateBankPayment(tempId: string, data) - Actualizar pago banco
removeBankPayment(tempId: string) - Quitar pago banco
```

### useOrderValidation (`composables/useOrderValidation.ts`)
```typescript
// Validaciones de negocio
validateOrder(order: DraftOrder) - Validar pedido completo
canSubmitOrder: computed - Si se puede enviar el pedido
orderErrors: computed - Lista de errores de validación
```

### useOrderSubmission (`composables/useOrderSubmission.ts`)
```typescript
// Transformación y envío al backend
submitOrder(draftOrder: DraftOrder) - Transformar y enviar pedido
transformDraftToCreateDto(draft: DraftOrder) - Convertir DraftOrder a CreateOrderDto
// Incluye status: 'taken' por defecto
```

### useOrderPersistence (`composables/useOrderPersistence.ts`)
```typescript
// Persistencia en localStorage
saveToLocalStorage() - Guardar pedidos activos
loadFromLocalStorage() - Cargar pedidos guardados
clearLocalStorage() - Limpiar almacenamiento
```

## 🌐 APIs y Servicios

### Base API (`baseApi.ts`)
- Clase base con Axios configurado
- Interceptores para autenticación JWT
- Manejo automático de refresh tokens
- Manejo centralizado de errores

### APIs Específicas
- `authApi.ts`: Autenticación y usuarios
- `orderApi.ts`: Gestión de pedidos
- `productApi.ts`: Productos y categorías
- `customerApi.ts`: Clientes y direcciones
- `bankApi.ts`: Bancos
- `appApi.ts`: Apps de pago

## 📱 Interfaz de Usuario

### Pantalla Principal de Pedidos
```
┌─────────────────────────────────────────────────────────┐
│ ProductSearch: Búsqueda avanzada con filtros           │
├─────────────────────────────────────────────────────────┤
│ CategoriesBar: Chips de categorías con iconos alineados│
├─────────────────────────────────────────────────────────┤
│ ProductGrid: Grid responsive de ProductCard            │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                       │
│ │Prod1│ │Prod2│ │Prod3│ │Prod4│                       │
│ └─────┘ └─────┘ └─────┘ └─────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Sidebar de Pedidos
```
┌─────────────────────────────────────────────────────────┐
│ OrderSidebar: Tabs de pedidos activos                  │
│ ┌─────┐ ┌─────┐ ┌─────┐ [+]                           │
│ │Tab1 │ │Tab2 │ │Tab3 │                               │
│ └─────┘ └─────┘ └─────┘                               │
├─────────────────────────────────────────────────────────┤
│ OrderHeader: Tipo de pedido y nombre                   │
│ - Select de tipo de pedido (onsite/delivery/reservation)│
│ - Input de guestName (obligatorio para delivery/reservation)│
├─────────────────────────────────────────────────────────┤
│ CustomerSection: Cliente y dirección                   │
│ - Búsqueda por teléfono                                │
│ - Selector de dirección (si es delivery)               │
│ - Modal de detalle del cliente                         │
├─────────────────────────────────────────────────────────┤
│ OrderItemList: Productos del pedido                    │
│ - Lista de productos con cantidad y subtotal           │
│ - Actualización de cantidad (+/-)                      │
│ - Eliminación de productos                             │
├─────────────────────────────────────────────────────────┤
│ PaymentSelector: Métodos de pago                       │
│ - App Payments (máx. 1)                                │
│ - Bank Payments (múltiples)                            │
│ - Efectivo (diferencia automática)                     │
│ - Validación: suma ≤ total                             │
│ - Alerta visual si hay sobrepago                       │
├─────────────────────────────────────────────────────────┤
│ Totales y Botón de Envío                               │
│ - Subtotal, descuentos, total                          │
│ - Botón "Enviar Pedido" con tooltip dinámico          │
│ - Validación completa con feedback visual              │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Trabajo de Pedidos

### 1. Creación de Pedido
1. Usuario hace clic en producto → se agrega al pedido activo
2. Si no hay pedido activo → se crea uno nuevo
3. Usuario puede cambiar entre tabs de pedidos
4. Cada pedido mantiene su estado independiente

### 2. Configuración por Tipo
- **Onsite**: Cliente opcional, `guestName` opcional
- **Delivery**: Cliente obligatorio + dirección obligatoria + `guestName` obligatorio (auto-completado con nombre del cliente, editable)
- **Reservation**: Fecha/hora de entrega obligatoria + `guestName` obligatorio (auto-completado con nombre del cliente, editable)

### 3. Procesamiento de Pagos
1. Usuario selecciona métodos de pago
2. Máximo 1 app payment por pedido
3. Múltiples bank payments permitidos
4. Diferencia se considera efectivo
5. Validación: suma de pagos ≤ total

### 4. Envío del Pedido
1. Validación completa de campos obligatorios:
   - Al menos 1 producto
   - Cliente (si es delivery)
   - Dirección (si es delivery)
   - guestName (si es delivery o reservation)
   - Fecha/hora (si es reservation)
   - Suma de pagos ≤ total
2. Transformación de DraftOrder a CreateOrderDto (incluye `status: 'taken'`)
3. Creación del pedido en backend
4. Feedback visual con toasts
5. Eliminación del pedido activo
6. Actualización de la lista de pedidos

## 🎯 Reglas de Negocio Importantes

### Pedidos
- Delivery requiere cliente + dirección + guestName
- Reservation requiere fecha/hora + guestName
- guestName se auto-completa con nombre del cliente pero es editable
- Todos los pedidos nuevos se crean con `status: 'taken'`
- Reservation suma en ventas del día de entrega (no creación)
- Solo 1 app payment por pedido
- Suma de pagos debe ser ≤ total del pedido
- Diferencia entre pagos y total se considera efectivo
- Cancelación requiere motivo
- Productos de categoría "arroces" tienen stock ilimitado

### Usuarios
- Solo 1 superadmin en el sistema
- 1 admin/cocina por sucursal
- Usuarios solo ven datos de su sucursal (excepto superadmin)

### Pagos
- Si no hay expense_bank_payment → 100% efectivo
- Apps se liquidan creando bank_payment
- Múltiples app_payments pueden liquidarse juntos

## 🔧 Configuración y Variables

### Variables de Entorno
```bash
VITE_API_URL=https://localhost:7049/api  # URL del backend
```

### Configuración de Vite
- Alias `@` para `src/`
- Target ES2020
- Plugin de Tailwind CSS
- Plugin de Vue

## 📝 Convenciones de Código

### ⚡ Reactividad Optimista (REGLA CRÍTICA)

**IMPORTANTE**: Después de cualquier mutación (CREATE, UPDATE, DELETE), **SIEMPRE actualizar el estado local inmediatamente** sin necesidad de recargar desde el servidor. Esto proporciona una experiencia de usuario instantánea y reduce la carga del servidor.

#### Patrón Obligatorio:

**CREATE:**
```typescript
const created = await api.create(data)
items.value.unshift(created)  // Agregar al inicio
totalCount.value++
```

**UPDATE:**
```typescript
const updated = await api.update(id, data)
const index = items.value.findIndex(item => item.id === id)
if (index !== -1) {
    items.value[index] = { ...items.value[index], ...updated }
}
```

**DELETE:**
```typescript
await api.delete(id)
items.value = items.value.filter(item => item.id !== id)
totalCount.value--
```

**Componentes child deben emitir el objeto actualizado:**
```typescript
emit('updated', updatedObject)  // No solo emitir evento vacío
```

Ver `.cursorrules` para ejemplos completos y casos de uso.

### Patrones Establecidos

#### Componentes Autónomos con Modo
- Usar prop `mode` para comportamiento condicional (draft/persisted)
- Decidir internamente cuándo emitir vs. actualizar directamente
- Ver [docs/patterns.md](./docs/patterns.md) para implementación completa

#### Modales Autónomos
- Manejar API calls internamente
- Aplicar actualizaciones optimistas en el store
- Emitir solo `@updated` con objeto actualizado
- Padre solo actualiza lista local si es necesario

#### Prellenado de Formularios
- Usar props `initial*` para prellenar desde búsquedas
- Ejemplo: `initialPhone`, `initialName`, `initialAddress`
- Aplicar en `onMounted` si no hay datos de edición

### Naming Conventions
- **Componentes**: PascalCase (`BaseButton.vue`)
- **Archivos**: camelCase para servicios, PascalCase para componentes
- **Variables**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

### Estructura de Componentes
```vue
<template>
  <!-- Template con clases Tailwind -->
</template>

<script setup lang="ts">
// Imports
// Props/Emits
// Composables
// State
// Computed
// Methods
// Lifecycle
</script>

<style scoped>
/* Estilos adicionales si es necesario */
</style>
```

### Estructura de Stores
```typescript
export const useStoreName = defineStore('storeName', {
    const variable=....
 return {
    variable
		// State
 }
})
```

## 🚀 Comandos de Desarrollo

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Tests
npm run test
npm run test:ui
npm run test:coverage
```

## 📊 Métricas y Monitoreo

### Dashboard por Rol
- **Superadmin**: Dashboard global con todas las sucursales
- **Admin**: Dashboard de sucursal específica
- **Domiciliario**: Historial de entregas y abonos propios

### KPIs Principales
- Ventas por sucursal/día
- Productos más vendidos
- Tiempo promedio de entrega
- Tasa de cancelación
- Ingresos por método de pago
- Metodos de pagos mas usados

## 🔒 Seguridad

### Autenticación
- JWT tokens con refresh automático
- Interceptores Axios para headers
- Logout automático en token expirado
- Protección de rutas por rol

### Validaciones
- Frontend: Validación de formularios
- Backend: Validación de datos y permisos
- Tipos TypeScript para type safety

## 🎨 Guía de Estilos

### Colores del Sistema
```css
/* Primary Colors */
--emerald-600: #059669;
--emerald-700: #047857;

/* Gray Scale */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-300: #d1d5db;
--gray-500: #6b7280;
--gray-700: #374151;
--gray-900: #111827;
```

### Componentes Reutilizables
- Todos los componentes base están en `src/components/ui/`
- Sistema de variantes consistente
- Props tipados con TypeScript
- Eventos tipados con `defineEmits`

## 📱 Responsive Design

### Breakpoints
- Mobile: `< 640px`
- Tablet: `640px - 1024px`
- Desktop: `> 1024px`

### Adaptaciones
- Sidebar colapsible en mobile
- Grid de productos responsive
- Formularios adaptativos
- Navegación touch-friendly

## 🔄 Estado de Desarrollo

### Completado
- ✅ Sistema de autenticación
- ✅ Layout base y navegación
- ✅ Gestión de usuarios y roles
- ✅ Sistema de pedidos básico y creación
- ✅ **Vista de lista de pedidos completa**
- ✅ **Vista de detalle de pedidos con edición**
- ✅ Componentes UI base
- ✅ Stores de Pinia
- ✅ APIs de servicios
- ✅ **ProductCard**: Componente base para productos
- ✅ **ProductGrid**: Grid responsive optimizado
- ✅ **ProductSearch**: Sistema completo de búsqueda y filtros
- ✅ **ProductStock**: Indicador de estado de stock
- ✅ **ProductCardSkeleton**: Estados de carga
- ✅ **ProductSearch Store**: Estado centralizado para búsqueda
- ✅ **useFormatting**: Composable para formateo
- ✅ **useOrderPermissions**: Composable para permisos basados en rol
- ✅ **useOrderFilters**: Composable para filtrado local de pedidos
- ✅ **OrdersTable, OrdersList**: Vista de tabla con filtros y paginación
- ✅ **OrderDetail**: Vista de detalle con tabs y edición completa
- ✅ **OrderProgressBar**: Barra de progreso de estados
- ✅ **OrderStatusBadge, OrderTypeBadge**: Badges de estado y tipo
- ✅ **Tests unitarios**: Cobertura completa de componentes

### En Desarrollo
- 🚧 Dashboard y reportes

### Pendiente
- ⏳ Módulo de cocina
- ⏳ Módulo de domicilios
- ⏳ Sistema de gastos
- ⏳ **Módulo de Caja / Gestión Financiera** (Ver detalles abajo)
- ⏳ Reportes avanzados

### 📝 Módulo de Caja / Gestión Financiera (Pendiente)

El módulo de caja es una funcionalidad pendiente que permitirá una gestión financiera más completa. Actualmente, las acciones individuales de pagos (verificar, liquidar) están disponibles en la vista de detalle de pedidos, pero faltan funcionalidades de gestión masiva y reportes financieros.

**Funcionalidades a implementar:**
- Vista de liquidación masiva de app payments
- Vista de verificación masiva de bank payments
- Cuadre de caja diario
- Reportes de ingresos por método de pago
- Gestión de gastos
- Movimientos entre bancos y caja
- Dashboard financiero con KPIs

**Endpoints disponibles (pendientes de UI):**
- `POST /api/app-payments/settle-multiple` - Liquidar múltiples pagos por app
- Filtros avanzados para pagos pendientes
- Reportes de ingresos y egresos

**Ubicación sugerida:**
- Crear vista `/cash-register` para cuadre de caja
- Crear vista `/payments` para gestión masiva de pagos
- Agregar sección "Finanzas" en el menú de navegación

**Prioridad:** Media - Las funcionalidades básicas ya están disponibles en el detalle de pedidos, pero este módulo mejoraría la eficiencia para administradores y cajeros.

## 🔄 Flujo de Trabajo para Desarrollo de Issues

### Proceso Estándar de Desarrollo

1. **📋 Verificar Issue en Linear**
   - Revisar el issue del backlog en Linear
   - Leer especificaciones técnicas y criterios de aceptación
   - Entender el contexto y dependencias

2. **🚀 Poner en Progreso**
   - Actualizar estado del issue a "In Progress" en Linear
   - Asignar el issue si es necesario
   - Crear branch de desarrollo si se requiere

3. **💻 Desarrollo Completo**
   - Implementar todos los criterios de aceptación
   - Crear/actualizar componentes según especificaciones
   - Escribir tests unitarios completos
   - Asegurar integración con sistema existente
   - Verificar responsive design y accesibilidad

4. **✅ Marcar como Completado**
   - Actualizar estado del issue a "Done" en Linear
   - Documentar trabajo realizado en la descripción del issue
   - Incluir archivos creados/modificados
   - Listar funcionalidades implementadas
   - Confirmar que todos los tests pasan

5. **📚 Actualizar Documentación**
   - Actualizar `agents.md` con nuevos componentes/stores
   - Documentar nuevas funcionalidades
   - Actualizar estado de desarrollo
   - Registrar archivos creados en estructura del proyecto

### Componentes Recientemente Completados

#### SEN-6: ProductCard ✅
- **Archivos**: `ProductCard.vue`, `ProductStock.vue`
- **Tests**: `ProductCard.test.ts`, `ProductStock.test.ts`
- **Funcionalidades**: Variantes (default, compact), estados de stock, integración con orders

#### SEN-7: ProductGrid ✅
- **Archivos**: `ProductGrid.vue`, `ProductCardSkeleton.vue`
- **Tests**: `ProductGrid.test.ts`, `ProductCardSkeleton.test.ts`
- **Funcionalidades**: Grid responsive, skeleton loading, estados de carga

#### SEN-8: ProductSearch ✅
- **Archivos**: `ProductSearch.vue` + 5 sub-componentes, `productSearch.ts`, `useFormatting.ts`
- **Tests**: `ProductSearch.test.ts`, `productSearch.test.ts`, `useFormatting.test.ts`
- **Funcionalidades**: Búsqueda en tiempo real, filtros avanzados, historial, autocompletado

### Próximos Issues Sugeridos

Basado en el backlog de Linear, los siguientes issues recomendados son:

1. **SEN-11**: OrderHeader - Header del pedido
2. **SEN-12**: CustomerSection - Selección de cliente
3. **SEN-13**: OrderItems - Lista de productos del pedido
4. **SEN-17**: OrderSummary - Resumen compacto

## 🤝 Colaboración

### Para Otros Agentes IA
- Usar este documento como contexto principal
- Consultar tipos TypeScript para estructura de datos
- Seguir patrones establecidos en componentes existentes
- Mantener consistencia con el sistema de diseño
- Respetar las reglas de negocio definidas
- **Seguir el flujo de trabajo estándar para issues**
- **Actualizar documentación después de completar cada issue**

### Patrones de Componentes Establecidos

#### Estructura de Botones con Iconos
```vue
<BaseButton class="whitespace-nowrap">
    <span class="flex items-center">
        <Icon class="w-4 h-4 mr-2" />
        Texto
    </span>
</BaseButton>
```

#### Componentes con Variantes
- Usar props `variant` para diferentes estilos
- Implementar `default`, `compact`, `featured` cuando aplique
- Mantener consistencia en nombres de variantes

#### Stores de Pinia
- Usar Composition API style (`defineStore` con función)
- Separar estado, getters y actions claramente
- Implementar manejo de loading y error states

---

**Última actualización**: Enero 2025
**Versión del proyecto**: 0.1.0 (desarrollo)
**Issues completados**: SEN-6, SEN-7, SEN-8
