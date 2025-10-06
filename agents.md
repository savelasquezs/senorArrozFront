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
├── components/           # Componentes Vue
│   ├── layout/          # Componentes de layout (Sidebar, TopNav, etc.)
│   ├── ui/              # Componentes base reutilizables
│   └── [feature].vue    # Componentes específicos de funcionalidad
├── views/               # Páginas/Vistas principales
├── store/               # Stores de Pinia
├── services/            # APIs y servicios HTTP
│   └── MainAPI/         # APIs específicas por dominio
├── types/               # Definiciones de TypeScript
├── composables/         # Composables Vue reutilizables
├── router/              # Configuración de rutas
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
  - `delivery`: A domicilio (cliente + dirección obligatorios)
  - `reservation`: Reservación (fecha/hora obligatoria)

- **Estados del Pedido**:
  - `taken`: Tomado
  - `in_preparation`: En preparación
  - `ready`: Listo
  - `on_the_way`: En camino
  - `delivered`: Entregado
  - `cancelled`: Cancelado

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

### Componentes de Layout
- `MainLayout`: Layout principal con sidebar
- `Sidebar`: Navegación lateral
- `TopNavigation`: Barra superior
- `Breadcrumbs`: Navegación de rutas

### Componentes de Funcionalidad
- `ProductsGrid`: Grid de productos con filtros
- `CategoriesBar`: Barra de categorías clickeables
- `OrderSidebar`: Sidebar de pedidos activos con tabs
- `OrderTab`: Contenido de cada pedido activo
- `CustomerSelector`: Selector de clientes por teléfono
- `AddressSelector`: Selector de direcciones del cliente
- `PaymentSelector`: Selector de métodos de pago

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
activeOrders: Map<string, ActiveOrder>
activeOrderId: string | null
products: Product[]
categories: ProductCategory[]

// Acciones principales
createActiveOrder(type)
addProductToActiveOrder(product)
updateOrderDetailQuantity(detailId, quantity)
addBankPayment(bankId, amount)
addAppPayment(appId, amount)
submitActiveOrder()
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
│ Header: Búsqueda de productos                          │
├─────────────────────────────────────────────────────────┤
│ CategoriesBar: Chips de categorías                     │
├─────────────────────────────────────────────────────────┤
│ ProductsGrid: Grid de productos                        │
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
│ OrderTab: Contenido del pedido activo                  │
│ - CustomerSelector                                      │
│ - AddressSelector (si es delivery)                     │
│ - OrderLines (productos del pedido)                    │
│ - PaymentSelector                                       │
│ - TotalsPanel                                           │
│ - Botones Save/Send                                     │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Trabajo de Pedidos

### 1. Creación de Pedido
1. Usuario hace clic en producto → se agrega al pedido activo
2. Si no hay pedido activo → se crea uno nuevo
3. Usuario puede cambiar entre tabs de pedidos
4. Cada pedido mantiene su estado independiente

### 2. Configuración por Tipo
- **Onsite**: Cliente opcional, puede usar `guest_name`
- **Delivery**: Cliente obligatorio + dirección obligatoria
- **Reservation**: Fecha/hora de entrega obligatoria

### 3. Procesamiento de Pagos
1. Usuario selecciona métodos de pago
2. Máximo 1 app payment por pedido
3. Múltiples bank payments permitidos
4. Diferencia se considera efectivo
5. Validación: suma de pagos ≤ total

### 4. Envío del Pedido
1. Validación de campos obligatorios
2. Creación del pedido en backend
3. Eliminación del pedido activo
4. Actualización de la lista de pedidos

## 🎯 Reglas de Negocio Importantes

### Pedidos
- Delivery requiere cliente + dirección
- Reservation suma en ventas del día de entrega (no creación)
- Solo 1 app payment por pedido
- Cancelación requiere motivo

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
- ✅ Sistema de pedidos básico
- ✅ Componentes UI base
- ✅ Stores de Pinia
- ✅ APIs de servicios

### En Desarrollo
- 🚧 Pantalla completa de pedidos
- 🚧 Sistema de pagos integrado
- 🚧 Gestión de productos completa
- 🚧 Dashboard y reportes

### Pendiente
- ⏳ Módulo de cocina
- ⏳ Módulo de domicilios
- ⏳ Sistema de gastos
- ⏳ Caja y cuadres
- ⏳ Reportes avanzados

## 🤝 Colaboración



### Para Otros Agentes IA
- Usar este documento como contexto principal
- Consultar tipos TypeScript para estructura de datos
- Seguir patrones establecidos en componentes existentes
- Mantener consistencia con el sistema de diseño
- Respetar las reglas de negocio definidas

---

**Última actualización**: Diciembre 2024
**Versión del proyecto**: 0.0.0 (desarrollo)
