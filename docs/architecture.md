# Arquitectura Técnica - Señor Arroz

## 🏗️ Stack Tecnológico

### Frontend Core
- **Vue 3.5.18** - Framework principal con Composition API
- **TypeScript 5.8.3** - Tipado estático y type safety
- **Vite 7.1.2** - Build tool y dev server
- **Vue Router 4.5.1** - Routing SPA

### Estado y Datos
- **Pinia 3.0.3** - Estado global modular
- **Axios 1.12.1** - Cliente HTTP con interceptores
- **JWT** - Autenticación con refresh automático

### UI y Styling
- **Tailwind CSS 4.1.13** - Framework CSS utility-first
- **Heroicons 2.2.0** - Iconografía consistente
- **Responsive Design** - Mobile-first approach

### Testing
- **Vitest 3.2.4** - Testing framework
- **Vue Test Utils 2.4.6** - Utilidades para testing Vue
- **Happy DOM** - DOM environment para tests

## 📁 Estructura del Proyecto

```
src/
├── components/           # Componentes Vue (organización domain-driven)
│   ├── layout/          # Layout components
│   │   ├── MainLayout.vue
│   │   ├── Sidebar.vue
│   │   ├── TopNavigation.vue
│   │   └── Breadcrumbs.vue
│   ├── ui/              # Base UI components
│   │   ├── BaseButton.vue
│   │   ├── BaseInput.vue
│   │   ├── BaseCard.vue
│   │   ├── BaseDialog.vue
│   │   ├── BaseLoading.vue
│   │   ├── BaseAlert.vue
│   │   ├── BaseToast.vue
│   │   ├── BaseSelect.vue
│   │   └── BaseRadioGroup.vue
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
│   │   │       └── FilterPanel.vue
│   │   └── payments/
│   │       └── PaymentSelector.vue
│   └── products/        # Componentes legacy
│       └── ProductsGrid.vue
├── views/               # Page components
│   ├── Login.vue
│   ├── Dashboard.vue
│   ├── Orders.vue
│   └── [feature]/
├── store/               # Pinia stores
│   ├── auth.ts
│   ├── orders.ts
│   ├── products.ts
│   ├── productSearch.ts
│   └── [domain].ts
├── services/            # API services
│   └── MainAPI/
│       ├── baseApi.ts
│       ├── authApi.ts
│       ├── orderApi.ts
│       ├── productApi.ts
│       ├── customerApi.ts
│       └── [domain]Api.ts
├── types/               # TypeScript definitions
│   ├── auth.ts
│   ├── order.ts
│   ├── product.ts
│   └── [domain].ts
├── composables/         # Vue composables
│   ├── useToast.ts
│   ├── useFormatting.ts
│   ├── useOrderTabs.ts
│   ├── useOrderItems.ts
│   ├── useOrderPayments.ts
│   ├── useOrderValidation.ts
│   ├── useOrderSubmission.ts
│   └── useOrderPersistence.ts
├── router/              # Vue Router config
│   └── index.ts
└── assets/              # Static assets
```

## 🎨 Sistema de Diseño

### Paleta de Colores

```css
/* Primary Colors - Emerald */
--emerald-600: #059669;  /* Primary actions */
--emerald-700: #047857;  /* Primary hover */

/* Gray Scale */
--gray-50: #f9fafb;      /* Background light */
--gray-100: #f3f4f6;     /* Background subtle */
--gray-300: #d1d5db;     /* Borders */
--gray-500: #6b7280;     /* Text secondary */
--gray-700: #374151;     /* Text primary */
--gray-900: #111827;     /* Text dark */

/* Semantic Colors */
--green-600: #10b981;    /* Success */
--red-600: #ef4444;      /* Danger */
--yellow-500: #eab308;   /* Warning */
--blue-600: #2563eb;     /* Info */
```

### Tipografía
- **Font Family**: System fonts (Inter, -apple-system, BlinkMacSystemFont)
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Line Heights**: 1.5 (body), 1.25 (headings)

### Espaciado y Layout
- **Border Radius**: `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px)
- **Shadows**: `shadow-sm` (subtle), `shadow-md` (elevated)
- **Transitions**: `transition-all duration-200` (smooth interactions)

## 🗄️ Arquitectura de Estado (Pinia)

### Store Pattern (Composition API)
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useStoreName = defineStore('storeName', () => {
  // 1. Estado reactivo
  const data = ref<DataType[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 2. Computed properties (getters)
  const filteredData = computed(() => 
    data.value.filter(/* logic */)
  )
  const hasData = computed(() => data.value.length > 0)

  // 3. Actions
  const fetchData = async () => {
    loading.value = true
    error.value = null
    try {
      data.value = await api.getData()
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // 4. Return público
  return {
    // State
    data,
    loading,
    error,
    // Computed
    filteredData,
    hasData,
    // Actions
    fetchData
  }
})
```

### Stores Principales
- **auth.ts**: Autenticación, usuario, tokens
- **orders.ts**: Estado central de pedidos (estado, productos, categorías)
- **products.ts**: Gestión de productos y categorías
- **productSearch.ts**: Estado de búsqueda y filtros
- **customers.ts**: Clientes y direcciones
- **banks.ts**: Bancos y apps de pago

## 🧩 Patrón de Composables

Para evitar stores sobrecargados ("god objects"), la lógica compleja se divide en composables especializados con responsabilidades únicas:

### Composables de Orders
```typescript
// useOrderTabs.ts - Gestión de tabs de pedidos activos
export const useOrderTabs = () => {
  const ordersStore = useOrdersStore()
  
  const createNewTab = (type: OrderType) => { /* ... */ }
  const switchTab = (tabId: string) => { /* ... */ }
  const closeTab = (tabId: string) => { /* ... */ }
  const renameTab = (tabId: string, name: string) => { /* ... */ }
  const updateOrderType = (type: OrderType) => { /* ... */ }
  
  return { createNewTab, switchTab, closeTab, renameTab, updateOrderType }
}

// useOrderItems.ts - CRUD de productos en el pedido
export const useOrderItems = () => {
  const ordersStore = useOrdersStore()
  
  const addProduct = (product: Product) => { /* ... */ }
  const removeItem = (detailId: string) => { /* ... */ }
  const updateQuantity = (detailId: string, quantity: number) => { /* ... */ }
  
  return { addProduct, removeItem, updateQuantity, /* ... */ }
}

// useOrderPayments.ts - Gestión de métodos de pago
export const useOrderPayments = () => {
  const ordersStore = useOrdersStore()
  
  const addAppPayment = (appId: number, amount: number) => { /* ... */ }
  const addBankPayment = (bankId: number, amount: number) => { /* ... */ }
  
  return { addAppPayment, addBankPayment, /* ... */ }
}

// useOrderValidation.ts - Validaciones de negocio
export const useOrderValidation = () => {
  const validateOrder = (order: DraftOrder) => { /* ... */ }
  const canSubmitOrder = computed(() => { /* ... */ })
  const orderErrors = computed(() => { /* ... */ })
  
  return { validateOrder, canSubmitOrder, orderErrors }
}

// useOrderSubmission.ts - Transformación y envío
export const useOrderSubmission = () => {
  const transformDraftToCreateDto = (draft: DraftOrder): CreateOrderDto => {
    return {
      branchId: draft.branchId,
      takenById: draft.takenById,
      type: draft.type,
      status: 'taken', // Status por defecto
      guestName: draft.guestName || undefined,
      // ... más campos
    }
  }
  
  const submitOrder = async (draft: DraftOrder) => { /* ... */ }
  
  return { transformDraftToCreateDto, submitOrder }
}
```

### Ventajas del Patrón de Composables
- **Separación de responsabilidades**: Cada composable tiene una función específica
- **Reutilización**: Los composables pueden usarse en múltiples componentes
- **Testing**: Más fácil probar lógica aislada
- **Mantenibilidad**: Código más organizado y fácil de entender
- **Escalabilidad**: Agregar funcionalidad sin saturar el store

### Otros Composables
- **useFormatting.ts**: Formateo de precios, fechas, números
- **useOrderPersistence.ts**: Persistencia en localStorage

## 🌐 Arquitectura de APIs

### Base API Class
```typescript
class BaseApi {
  protected api: AxiosInstance
  
  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    })
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    // JWT token injection
    // Automatic token refresh
    // Error handling
  }
}
```

### API Structure
- **baseApi.ts**: Clase base con interceptores
- **authApi.ts**: Login, logout, refresh tokens
- **orderApi.ts**: CRUD de pedidos, estados
- **productApi.ts**: Productos y categorías
- **customerApi.ts**: Clientes y direcciones
- **bankApi.ts**: Bancos y apps

## 🔒 Seguridad

### Autenticación JWT
- **Access Token**: 15 minutos de vida
- **Refresh Token**: 7 días de vida
- **Automatic Refresh**: Interceptor Axios
- **Logout**: Limpieza de tokens y redirect

### Protección de Rutas
```typescript
// Router guards
router.beforeEach((to, from, next) => {
  // Check authentication
  // Check role permissions
  // Redirect if unauthorized
})
```

### Validaciones
- **Frontend**: Validación de formularios con TypeScript
- **Backend**: Validación de datos y permisos
- **Type Safety**: Interfaces estrictas para todas las entidades

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First */
sm: 640px    /* Small devices */
md: 768px    /* Medium devices */
lg: 1024px   /* Large devices */
xl: 1280px   /* Extra large devices */
2xl: 1536px  /* 2X large devices */
```

### Adaptaciones por Dispositivo
- **Mobile**: Sidebar colapsible, grid adaptativo
- **Tablet**: Layout híbrido, navegación optimizada
- **Desktop**: Layout completo, múltiples columnas

## ⚙️ Configuración

### Variables de Entorno
```bash
VITE_API_URL=https://localhost:7049/api
VITE_APP_NAME=Señor Arroz
VITE_APP_VERSION=0.0.0
```

### Vite Configuration
```typescript
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  esbuild: { target: 'es2020' }
})
```

### TypeScript Configuration
- **Strict Mode**: Habilitado para type safety
- **Path Mapping**: Alias `@` para `src/`
- **Vue SFC**: Soporte completo para `.vue` files

## 🧪 Testing Strategy

### Testing Stack
- **Unit Tests**: Vitest + Vue Test Utils
- **Component Tests**: Testing componentes aislados
- **Integration Tests**: Testing flujos completos
- **E2E Tests**: (Pendiente) Playwright o Cypress

### Test Structure
```
tests/
├── unit/           # Unit tests
├── components/     # Component tests
├── integration/    # Integration tests
└── fixtures/       # Test data
```

## 🚀 Build y Deployment

### Build Process
```bash
# Development
npm run dev          # Vite dev server

# Production
npm run build        # Build optimizado
npm run preview      # Preview del build
```

### Build Output
- **Code Splitting**: Automático por rutas
- **Tree Shaking**: Eliminación de código no usado
- **Minification**: CSS y JS optimizados
- **Source Maps**: Para debugging en producción

## 📊 Performance

### Optimizaciones
- **Lazy Loading**: Rutas y componentes
- **Virtual Scrolling**: Para listas grandes
- **Memoization**: Computed properties
- **Bundle Splitting**: Separación por features

### Monitoring
- **Bundle Size**: Análisis con Vite Bundle Analyzer
- **Performance**: Core Web Vitals
- **Errors**: Global error handling

---

**Próximos pasos**: Ver [Development Guide](./development.md) para setup y convenciones de desarrollo.
