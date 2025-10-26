# Guía de Componentes - Señor Arroz

## 🎯 Filosofía de Componentes

Los componentes siguen una arquitectura modular y reutilizable, con separación clara entre componentes base (UI), de layout y de funcionalidad específica.

## 🧱 Componentes Base (UI)

### BaseButton
Botón reutilizable con múltiples variantes y estados.

```vue
<BaseButton 
  variant="primary" 
  size="md" 
  :loading="isLoading"
  @click="handleClick"
>
  Guardar Pedido
</BaseButton>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'`
- `size`: `'sm' | 'md' | 'lg'`
- `loading`: `boolean`
- `disabled`: `boolean`
- `fullWidth`: `boolean`
- `icon`: Componente de icono
- `rightIcon`: Componente de icono derecho

**Variantes de Color:**
- `primary`: Emerald (verde principal)
- `secondary`: Gray con borde
- `danger`: Red para acciones destructivas
- `success`: Green para confirmaciones
- `outline`: Borde emerald, fondo transparente
- `ghost`: Sin borde, solo hover

### BaseInput
Input con validación y estados visuales.

```vue
<BaseInput
  v-model="email"
  type="email"
  label="Correo Electrónico"
  placeholder="usuario@ejemplo.com"
  :required="true"
  :error="emailError"
  hint="Ingresa tu correo electrónico"
/>
```

**Props:**
- `modelValue`: `string | number | null`
- `type`: `string` (text, email, password, number, etc.)
- `label`: `string`
- `placeholder`: `string`
- `required`: `boolean`
- `disabled`: `boolean`
- `error`: `string`
- `hint`: `string`
- `minlength` / `maxlength`: `number`

**Slots:**
- `icon`: Icono izquierdo
- `prepend`: Contenido antes del input
- `append`: Contenido después del input

### BaseCard
Contenedor con sombra y bordes redondeados.

```vue
<BaseCard class="p-6">
  <h3 class="text-lg font-semibold mb-4">Título</h3>
  <p>Contenido de la tarjeta</p>
</BaseCard>
```

**Variantes:**
- Por defecto: Fondo blanco, sombra sutil
- `elevated`: Sombra más pronunciada
- `bordered`: Borde visible

### BaseDialog
Modal/Dialog con overlay y animaciones.

```vue
<BaseDialog 
  :open="showDialog"
  @close="showDialog = false"
  title="Confirmar Acción"
>
  <p>¿Estás seguro de que quieres continuar?</p>
  <template #footer>
    <BaseButton variant="outline" @click="showDialog = false">Cancelar</BaseButton>
    <BaseButton variant="danger" @click="confirmAction">Confirmar</BaseButton>
  </template>
</BaseDialog>
```

**Props:**
- `open`: `boolean`
- `title`: `string`
- `size`: `'sm' | 'md' | 'lg' | 'xl'`

**Slots:**
- `default`: Contenido principal
- `footer`: Botones de acción

### BaseLoading
Spinner de carga con mensaje opcional.

```vue
<BaseLoading text="Cargando productos..." />
```

**Props:**
- `text`: `string`
- `size`: `'sm' | 'md' | 'lg'`

### BaseAlert
Alertas y notificaciones.

```vue
<BaseAlert 
  type="error" 
  title="Error de Validación"
  message="Por favor revisa los campos marcados"
  :dismissible="true"
/>
```

**Props:**
- `type`: `'success' | 'error' | 'warning' | 'info'`
- `title`: `string`
- `message`: `string`
- `dismissible`: `boolean`

### BaseToast
Sistema de toasts globales.

```typescript
// Uso programático
const { success, error, warning, info } = useToast()

success('Pedido creado', 3000, 'El pedido se ha guardado correctamente')
error('Error de conexión', 'No se pudo conectar con el servidor')
```

**Variantes:**
- `success`: Verde con icono de check
- `error`: Rojo con icono de error
- `warning`: Amarillo con icono de advertencia
- `info`: Azul con icono de información

### BaseSelect
Select con búsqueda dinámica y opción de creación.

```vue
<BaseSelect
  v-model="selectedProduct"
  :options="productOptions"
  label="Seleccionar Producto"
  placeholder="Buscar producto..."
  :searchable="true"
  :creatable="true"
  @create="handleCreateProduct"
/>
```

**Props:**
- `modelValue`: `any`
- `options`: `Array<{value, label, disabled?}>`
- `searchable`: `boolean`
- `creatable`: `boolean`
- `multiple`: `boolean`
- `clearable`: `boolean`

## 🏗️ Componentes de Layout

### MainLayout
Layout principal con sidebar y top navigation.

```vue
<MainLayout :no-card="true">
  <Orders />
</MainLayout>
```

**Props:**
- `no-card`: `boolean` - Remueve el wrapper de card blanco
- `page-title`: `string` - Título de la página

### Sidebar
Navegación lateral con menús por rol.

**Características:**
- Colapsible en mobile
- Menús dinámicos según rol de usuario
- Indicadores de página activa
- Iconos consistentes con Heroicons

### TopNavigation
Barra superior con información del usuario.

**Elementos:**
- Toggle del sidebar (mobile)
- Breadcrumbs de navegación
- Menú de usuario (perfil, logout)
- Indicadores de estado

### Breadcrumbs
Navegación de rutas jerárquica.

```vue
<Breadcrumbs :items="breadcrumbItems" />
```

## 🍽️ Componentes de Funcionalidad

### ProductCard
Componente minimalista para mostrar productos individuales.

**Ubicación:** `src/components/orders/products/ProductCard.vue`

```vue
<ProductCard 
  :product="product"
  variant="default"
  @add-to-order="onAddToOrder"
/>
```

**Props:**
- `product`: `Product` - Datos del producto
- `variant`: `'default' | 'compact'` - Estilo del card

**Características:**
- **Diseño minimalista**: Solo nombre, precio y stock (sin imagen)
- **Click para agregar**: Click en cualquier parte de la card agrega el producto
- **Hover effect**: Background `emerald-50` y borde `emerald-500` al pasar el mouse
- **Stock ilimitado**: Productos de categoría "arroces" nunca están deshabilitados por stock
- **Cursor adaptativo**: `not-allowed` para productos sin stock
- **Responsive**: Se adapta al tamaño del contenedor

**Events:**
- `@add-to-order` - Emitido cuando se hace click en la card (incluye el producto)

### ProductStock
Sub-componente para mostrar estado de stock con soporte de stock ilimitado.

**Ubicación:** `src/components/orders/products/ProductStock.vue`

```vue
<ProductStock 
  :stock="product.stock"
  :has-unlimited-stock="isArrozCategory"
/>
```

**Props:**
- `stock`: `number` - Cantidad en stock
- `hasUnlimitedStock`: `boolean` - Si el producto tiene stock ilimitado

**Estados:**
- Stock > 50%: Badge verde "Disponible"
- Stock 20-50%: Badge amarillo "Bajo stock"
- Stock < 20%: Badge rojo "Agotado"
- Stock ilimitado: Badge verde "Disponible" (siempre)

**Estados:**
- **Disponible**: Verde con check
- **Bajo stock**: Amarillo con advertencia
- **Sin stock**: Rojo con X

### ProductGrid
Grid responsive optimizado que utiliza ProductCard.

```vue
<ProductGrid 
  :products="products"
  :loading="isLoading"
  @product-click="onProductClick"
  @product-add="onProductAdd"
/>
```

**Props:**
- `products`: `Product[]` - Lista de productos
- `loading`: `boolean` - Estado de carga
- `columns`: `number` - Número de columnas (opcional)

**Características:**
- Grid responsive (2-5 columnas según pantalla)
- Skeleton loading durante carga
- Empty state cuando no hay productos
- Integración perfecta con ProductCard

### ProductCardSkeleton
Skeleton loading para ProductCard.

```vue
<ProductCardSkeleton />
```

**Características:**
- Animación de shimmer
- Mismo tamaño que ProductCard
- Usado durante estados de carga

### ProductSearch
Sistema completo de búsqueda y filtros.

```vue
<ProductSearch 
  :products="products"
  :categories="categories"
  @search="onSearch"
  @filter="onFilter"
/>
```

**Props:**
- `products`: `Product[]` - Lista de productos para búsqueda
- `categories`: `ProductCategory[]` - Categorías disponibles
- `placeholder`: `string` - Placeholder del input
- `showFilters`: `boolean` - Mostrar panel de filtros

**Funcionalidades:**
- Búsqueda en tiempo real con debounce
- Filtros por categoría, precio y stock
- Autocompletado con sugerencias
- Historial de búsquedas persistente
- Filtros activos con chips removibles

#### Sub-componentes de ProductSearch:

**SearchInput**: Input de búsqueda con autocompletado
**FilterToggle**: Botón para mostrar/ocultar filtros
**ActiveFilters**: Chips de filtros activos
**FilterPanel**: Panel expandible de filtros
**SearchHistory**: Historial de búsquedas

### ProductsGrid (Legacy)
Grid de productos con filtros y búsqueda (legacy - usar ProductGrid).

```vue
<ProductsGrid 
  :products="filteredProducts"
  @product-click="addToOrder"
/>
```

**Nota**: Este componente está marcado como legacy. Usar `ProductGrid` + `ProductSearch` para nuevas implementaciones.

### CategoriesBar
Barra de categorías clickeables.

```vue
<CategoriesBar 
  :categories="categories"
  :products-count="products.length"
  @category-selected="onCategorySelected"
/>
```

**Características:**
- Chips clickeables
- Indicación visual de categoría activa
- Contador de productos por categoría
- Filtrado automático

### OrderSidebar
Sidebar principal para gestión de pedidos con sistema de tabs y validación completa.

**Ubicación:** `src/components/orders/OrderSidebar.vue`

```vue
<OrderSidebar />
```

**Características:**
- **Sistema de tabs**: Múltiples pedidos activos simultáneos
- **Validación completa**: Feedback visual en tiempo real
- **Tooltip dinámico**: Muestra requisitos faltantes en botón enviar
- **Toasts secuenciales**: Mensajes detallados de errores de validación
- **Auto-guardado**: Persistencia en localStorage
- **Ancho fijo**: Sidebar con ancho consistente

**Estructura del Sidebar:**

1. **OrderTabs**: Tabs horizontales con botón "+" para crear nuevo
2. **OrderHeader**: 
   - Select de tipo de pedido (onsite/delivery/reservation)
   - Input de guestName (obligatorio para delivery/reservation)
   - Auto-completado con nombre del cliente
3. **CustomerSection**: 
   - Búsqueda de cliente por teléfono
   - Selector de dirección (si es delivery)
   - Modal de detalle del cliente
4. **OrderItemList**: 
   - Lista de productos en el pedido
   - Actualización de cantidad (+/-)
   - Eliminación de productos
5. **PaymentSelector**: 
   - Gestión de pagos con validación
   - Cálculo de efectivo
6. **Totales y Envío**: 
   - Subtotal, descuentos, total
   - Botón "Enviar Pedido" con tooltip dinámico
   - Solo un botón (se removió "Guardar")

**Validaciones Implementadas:**
- Al menos 1 producto en el pedido
- Cliente obligatorio para delivery
- Dirección obligatoria para delivery
- guestName obligatorio para delivery/reservation
- Fecha/hora obligatoria para reservation
- Suma de pagos ≤ total del pedido

**Feedback Visual:**
- Botón deshabilitado si faltan requisitos
- Tooltip con mensaje específico de lo que falta
- Toasts secuenciales explicando cada error
- Colores de estado (rojo para errores, verde para éxito)

### CustomerSelector
Selector de clientes por teléfono.

```vue
<CustomerSelector 
  v-model="selectedCustomer"
  :required="orderType === 'delivery'"
  @customer-selected="onCustomerSelected"
  @create-customer="showCreateCustomerDialog"
/>
```

**Características:**
- Búsqueda por teléfono
- Modal para crear cliente nuevo
- Validación de campos requeridos
- Auto-completado

### AddressSelector
Selector de direcciones del cliente.

```vue
<AddressSelector 
  v-model="selectedAddress"
  :customer-id="selectedCustomer?.id"
  :required="orderType === 'delivery'"
  @address-selected="onAddressSelected"
  @create-address="showCreateAddressDialog"
/>
```

**Características:**
- Lista de direcciones del cliente
- Indicador de dirección principal
- Modal para crear dirección nueva
- Integración con Google Maps

### PaymentSelector
Selector de métodos de pago con validación de monto máximo.

**Ubicación:** `src/components/orders/payments/PaymentSelector.vue`

```vue
<PaymentSelector 
  :order="draftOrder"
  :apps="availableApps"
  :banks="availableBanks"
/>
```

**Props:**
- `order`: `DraftOrder` - Pedido actual con totales y pagos
- `apps`: `App[]` - Apps de pago disponibles
- `banks`: `Bank[]` - Bancos disponibles

**Características:**
- **Diseño minimalista**: Padding reducido, iconos compactos
- **Validación de monto máximo**: Suma de pagos ≤ total del pedido
- **Efectivo automático**: Calcula diferencia entre total y suma de pagos
- **App payments**: Máximo 1 por pedido
- **Bank payments**: Múltiples permitidos
- **Alerta de sobrepago**: Background rojo cuando suma > total
- **Deshabilitado inteligente**: No permite agregar pagos si efectivo es 0
- **Edición inline**: Editar montos directamente en la lista

**Computed Properties:**
- `cashAmount`: Monto en efectivo (total - suma de pagos)
- `maxPaymentAmount`: Monto máximo para agregar nuevo pago
- `canAddPayments`: Si se pueden agregar más pagos
- `hasOverpayment`: Si hay sobrepago
- `overpaymentAmount`: Monto del sobrepago

**Validaciones:**
- No permitir monto mayor al restante
- Actualización en tiempo real del efectivo
- Feedback visual inmediato

### TotalsPanel
Panel de totales y descuentos.

```vue
<TotalsPanel 
  :subtotal="subtotal"
  :delivery-fee="deliveryFee"
  :discount="discount"
  :total="total"
/>
```

**Elementos:**
- Subtotal de productos
- Delivery fee (si aplica)
- Descuentos aplicados
- Total final
- Desglose de pagos

## 🗺️ Componentes de Geolocalización

### DeliveryMap
Mapa de Google Maps para domiciliarios con pedidos en ruta.

```vue
<DeliveryMap 
  :orders="onTheWayOrders"
  :user-location="userLocation"
  :is-tracking="isTracking"
  @location-update="onLocationUpdate"
  @order-deliver="onOrderDeliver"
  @start-navigation="onStartNavigation"
/>
```

**Props:**
- `orders`: Array de pedidos en estado "OnTheWay"
- `userLocation`: Ubicación actual del domiciliario
- `isTracking`: Estado del tracking de ubicación
- `deliveryRadius`: Radio en metros para mostrar botón de entrega (default: 20)

**Events:**
- `location-update`: Nueva ubicación del domiciliario
- `order-deliver`: Confirmar entrega de pedido
- `start-navigation`: Iniciar navegación a destino

**Características:**
- Marcadores para pedidos en ruta
- Marcador de ubicación del domiciliario
- Cálculo de distancia en tiempo real
- Botón de entrega automática a 20m o menos
- Integración con navegación GPS

### LocationTracker
Componente para manejar geolocalización del domiciliario.

```vue
<LocationTracker 
  :enabled="isTracking"
  :update-interval="5000"
  @location-update="onLocationUpdate"
  @permission-denied="onPermissionDenied"
  @location-error="onLocationError"
/>
```

**Props:**
- `enabled`: Habilitar/deshabilitar tracking
- `updateInterval`: Intervalo de actualización en ms (default: 5000)
- `highAccuracy`: Usar GPS de alta precisión (default: true)

**Events:**
- `location-update`: Nueva ubicación detectada
- `permission-denied`: Permisos de ubicación denegados
- `location-error`: Error en obtención de ubicación

### DeliveryOrderCard
Tarjeta de pedido en ruta para el mapa.

```vue
<DeliveryOrderCard 
  :order="order"
  :distance="distance"
  :can-deliver="canDeliver"
  @deliver="onDeliver"
  @navigate="onNavigate"
  @call-customer="onCallCustomer"
/>
```

**Props:**
- `order`: Pedido en estado "OnTheWay"
- `distance`: Distancia en metros al destino
- `canDeliver`: Si está dentro del radio de entrega

**Características:**
- Información del pedido (cliente, dirección, total)
- Indicador de distancia
- Botón de entrega (cuando está cerca)
- Botón de navegación GPS
- Botón de llamada al cliente

## 🎨 Patrones de Diseño

### Estructura de Componentes
```vue
<template>
  <!-- HTML semántico con clases Tailwind -->
  <div class="component-wrapper">
    <!-- Contenido -->
  </div>
</template>

<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@/store/storeName'

// 2. Props y Emits
interface Props {
  // Props tipadas
}
const props = defineProps<Props>()

const emit = defineEmits<{
  // Events tipados
}>()

// 3. Composables y Stores
const store = useStore()

// 4. Estado reactivo
const isLoading = ref(false)
const error = ref<string | null>(null)

// 5. Computed properties
const computedValue = computed(() => {
  // Lógica computada
})

// 6. Métodos
const handleAction = async () => {
  // Lógica del componente
}

// 7. Lifecycle
onMounted(() => {
  // Inicialización
})
</script>

<style scoped>
/* Estilos adicionales si es necesario */
.component-wrapper {
  /* Custom styles */
}
</style>
```

### Convenciones de Naming
- **Componentes**: PascalCase (`BaseButton.vue`)
- **Props**: camelCase (`isLoading`, `userRole`)
- **Events**: kebab-case (`@user-selected`)
- **CSS Classes**: Tailwind utilities
- **CSS Variables**: kebab-case (`--primary-color`)

### Props y Events
```typescript
// Props con defaults y validación
interface Props {
  variant: 'primary' | 'secondary' | 'danger'
  size: 'sm' | 'md' | 'lg'
  disabled: boolean
  loading: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false
})

// Events tipados
const emit = defineEmits<{
  click: [event: MouseEvent]
  change: [value: string]
  submit: [data: FormData]
}>()
```

## 🔧 Composición y Reutilización

### Composables
```typescript
// useToast.ts
export const useToast = () => {
  const addToast = (toast: Toast) => { /* ... */ }
  const success = (title: string, message?: string) => { /* ... */ }
  const error = (title: string, message?: string) => { /* ... */ }
  
  return { addToast, success, error }
}
```

### Slots y Render Props
```vue
<!-- Componente con slots flexibles -->
<BaseCard>
  <template #header>
    <h3>Título Personalizado</h3>
  </template>
  
  <template #content>
    <p>Contenido personalizado</p>
  </template>
  
  <template #footer>
    <BaseButton>Acción</BaseButton>
  </template>
</BaseCard>
```

## 📱 Responsive Design

### Breakpoints en Componentes
```vue
<template>
  <!-- Grid responsive -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <!-- Productos -->
  </div>
  
  <!-- Sidebar responsive -->
  <div class="hidden lg:block w-64">
    <!-- Sidebar desktop -->
  </div>
  <div class="lg:hidden fixed inset-0 z-50">
    <!-- Sidebar mobile -->
  </div>
</template>
```

### Adaptaciones por Dispositivo
- **Mobile**: Stack vertical, botones grandes, navegación simplificada
- **Tablet**: Layout híbrido, grid adaptativo
- **Desktop**: Layout completo, múltiples columnas

## 🗄️ Stores y Composables Relacionados

### ProductSearch Store
Store de Pinia para manejar estado de búsqueda y filtros.

```typescript
// src/store/productSearch.ts
export const useProductSearchStore = defineStore('productSearch', () => {
  // Estado de búsqueda
  const searchState = ref({
    query: '',
    suggestions: [] as Product[],
    history: [] as string[],
    showSuggestions: false
  })

  // Estado de filtros
  const filterState = ref({
    category: null as number | null,
    minPrice: null as number | null,
    maxPrice: null as number | null,
    stockFilter: 'all' as 'all' | 'available' | 'out_of_stock',
    expanded: false
  })

  // Acciones principales
  const setSearchQuery = (query: string) => {
    searchState.value.query = query
  }

  const searchWithDebounce = (callback: Function, debounceMs: number = 300) => {
    // Implementación de debounce
  }

  const clearFilters = () => {
    filterState.value = {
      category: null,
      minPrice: null,
      maxPrice: null,
      stockFilter: 'all',
      expanded: false
    }
  }

  return {
    searchState,
    filterState,
    setSearchQuery,
    searchWithDebounce,
    clearFilters
  }
})
```

### useFormatting Composable
Composable para funciones de formateo reutilizables.

```typescript
// src/composables/useFormatting.ts
export const useFormatting = () => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('es-CO').format(num)
  }

  const formatDate = (date: string | Date): string => {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text
  }

  return {
    formatCurrency,
    formatNumber,
    formatDate,
    truncateText
  }
}
```

## 🧪 Testing de Componentes

### Estructura de Tests
```typescript
// src/components/orders/__tests__/ProductCard.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductCard from '../ProductCard.vue'

describe('ProductCard', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    wrapper = mount(ProductCard, {
      props: {
        product: mockProduct,
        showStock: true,
        variant: 'default'
      }
    })
  })

  it('renders product information correctly', () => {
    expect(wrapper.text()).toContain(mockProduct.name)
    expect(wrapper.text()).toContain(mockProduct.price)
  })

  it('emits product-click event when clicked', async () => {
    await wrapper.trigger('click')
    expect(wrapper.emitted('product-click')).toBeTruthy()
  })
})
```

### Patrones de Testing
- **Props**: Verificar que se renderizan correctamente
- **Events**: Confirmar que se emiten con datos correctos
- **States**: Probar diferentes estados visuales
- **Interactions**: Simular clicks, hover, etc.
- **Accessibility**: Verificar ARIA labels y roles

---

## 🎯 Componentes Autónomos Recientes

### CustomerSection

Selector de cliente con modo draft/persisted que maneja su propio estado.

**Props:**
```typescript
interface Props {
    orderType: 'onsite' | 'delivery' | 'reservation'
    selectedCustomer?: Customer | null
    selectedAddress?: CustomerAddress | null
    mode?: 'draft' | 'persisted'
    showTypeSelector?: boolean
}
```

**Comportamiento por modo:**
- **draft**: Actualiza `ordersDraftsStore` directamente, auto-completa guestName, auto-selecciona dirección
- **persisted**: Emite eventos para validación externa en modales

**Uso:**
```vue
<!-- En OrderSidebar (draft) -->
<CustomerSection 
    :selected-customer="customer"
    :selected-address="address"
    :order-type="orderType"
    mode="draft"
    @view-customer-detail="handleViewDetail"
/>

<!-- En EditCustomerModal (persisted) -->
<CustomerSection 
    :selected-customer="customer"
    :selected-address="address"
    :order-type="orderType"
    :show-type-selector="false"
    mode="persisted"
    @customer-selected="handleCustomerSelected"
    @address-selected="handleAddressSelected"
/>
```

### PersistedPaymentSelector

Gestión completa de pagos con CRUD, verificación y liquidación.

**Props:**
```typescript
interface Props {
    order: OrderDetailView
}
```

**Funcionalidades:**
- CRUD de app payments y bank payments
- Verificación de bank payments
- Liquidación de app payments
- Auto-ajuste de pagos al cambiar total del pedido
- Validación de monto máximo
- Maneja todo internamente, solo emite `@updated`

**Uso:**
```vue
<PersistedPaymentSelector 
    :order="order"
    @updated="handlePaymentsUpdated"
/>
```

### Modales Autónomos

#### EditCustomerModal

Modal para editar cliente y dirección de un pedido existente.

**Características:**
- Maneja API calls internamente
- Validación de campos requeridos según tipo de pedido
- Auto-completado de delivery fee desde dirección
- Actualización optimista del store
- Emite solo `@updated` con pedido actualizado

**Uso:**
```vue
<EditCustomerModal 
    :open="showModal"
    :order="selectedOrder"
    @close="showModal = false"
    @updated="handleUpdated"
/>
```

#### SelectAddressModal

Modal para seleccionar/editar dirección y delivery fee.

**Características:**
- Selector de dirección del cliente
- Edición de delivery fee
- Auto-completado desde dirección seleccionada
- Validación interna
- Actualización optimista

**Uso:**
```vue
<SelectAddressModal 
    :open="showModal"
    :order="selectedOrder"
    @close="showModal = false"
    @updated="handleUpdated"
/>
```

#### EditOrderTypeModal

Modal para cambiar tipo de pedido con validaciones.

**Características:**
- Cambio de tipo (onsite/delivery/reservation)
- Validación de campos requeridos por tipo
- Limpieza de campos no aplicables
- Actualización optimista

**Uso:**
```vue
<EditOrderTypeModal 
    :open="showModal"
    :order="selectedOrder"
    @close="showModal = false"
    @updated="handleUpdated"
/>
```

### Patrón de Prellenado: CustomerForm

Formulario de cliente con prellenado desde búsqueda.

**Props:**
```typescript
interface Props {
    customer?: Customer | null
    initialPhone?: string  // Prellenar desde búsqueda
}
```

**Uso:**
```vue
<!-- Usuario buscó "3001234567" y no se encontró -->
<CustomerForm 
    :initial-phone="searchQuery"
    @submit="handleCreate"
/>
```

El formulario prellenará automáticamente el campo `phone1` con el valor buscado.

---

## 📚 Referencias

- [Patrones de Arquitectura](./patterns.md) - Patrones detallados de componentes
- [Recomendaciones](./recommendations.md) - Feature Flags y Services
- [Business Rules](./business-rules.md) - Lógica de negocio
- [Development Guide](./development.md) - Convenciones de desarrollo
