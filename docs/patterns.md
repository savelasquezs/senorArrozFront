# Patrones de Arquitectura - Señor Arroz

## 📐 Filosofía de Diseño

Este documento describe los patrones de arquitectura establecidos en el proyecto para mantener consistencia, escalabilidad y mantenibilidad del código.

## 🏗️ Arquitectura de Componentes por Tamaño

### 1. Componentes Pequeños (Atoms)

**Definición:** Componentes básicos reutilizables sin lógica de negocio.

**Características:**
- Props tipados con TypeScript
- Emits simples y directos
- No acceden a stores
- Totalmente agnósticos del dominio
- Altamente reutilizables

**Ejemplos:**
- `BaseButton`, `BaseInput`, `BaseCard`, `BaseBadge`
- `BaseDialog`, `BaseLoading`, `BaseToast`
- `PhoneNumberItem`

**Patrón de uso:**
```vue
<template>
    <BaseButton 
        variant="primary" 
        size="md" 
        :loading="isLoading"
        @click="handleClick"
    >
        Guardar
    </BaseButton>
</template>

<script setup lang="ts">
interface Props {
    variant?: 'primary' | 'secondary' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false
})

const emit = defineEmits<{
    click: []
}>()
</script>
```

### 2. Componentes Medianos (Molecules)

**Definición:** Componentes reutilizables con lógica de presentación específica.

**Características:**
- Pueden usar stores para lectura
- Lógica de presentación (formateo, validación simple)
- Emiten datos estructurados
- Reutilizables en múltiples contextos

**Ejemplos:**
- `CustomerSelector`, `ProductCard`, `AddressSelector`
- `NeighborhoodSearch`, `ProductSearch`
- `OrderStatusBadge`, `OrderTypeBadge`

**Patrón de uso:**
```vue
<template>
    <div class="customer-selector">
        <BaseInput 
            v-model="searchQuery" 
            placeholder="Buscar por teléfono..."
            @input="handleSearch"
        />
        
        <div v-if="searchResults.length > 0">
            <div 
                v-for="customer in searchResults" 
                :key="customer.id"
                @click="selectCustomer(customer)"
            >
                {{ customer.name }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCustomersStore } from '@/store/customers'
import type { Customer } from '@/types/customer'

const emit = defineEmits<{
    'customer-selected': [customer: Customer]
}>()

const customersStore = useCustomersStore()
const searchQuery = ref('')
const searchResults = ref<Customer[]>([])

const handleSearch = () => {
    const query = searchQuery.value.toLowerCase()
    searchResults.value = customersStore.list?.items.filter(c => 
        c.name.toLowerCase().includes(query)
    ) || []
}

const selectCustomer = (customer: Customer) => {
    emit('customer-selected', customer)
    searchQuery.value = ''
    searchResults.value = []
}
</script>
```

### 3. Componentes Autónomos (Organisms)

**Definición:** Componentes auto-suficientes que manejan su propio estado y deciden cuándo actualizar stores vs. emitir eventos.

**Características:**
- Prop `mode` para comportamiento condicional
- Acceso completo a stores
- Lógica de negocio encapsulada
- Deciden cuándo emitir vs. actualizar directamente
- Reducen cadenas de eventos

**Ejemplos:**
- `CustomerSection` (modo draft/persisted)
- `PersistedPaymentSelector`
- Modales autónomos: `EditCustomerModal`, `SelectAddressModal`, `EditOrderTypeModal`

**Patrón de uso:**
```vue
<template>
    <div class="customer-section">
        <CustomerSelector @customer-selected="handleCustomerSelected" />
        
        <div v-if="selectedCustomer">
            <AddressSelector 
                :customer-id="selectedCustomer.id"
                @address-selected="handleAddressSelected"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrdersDataStore } from '@/store/ordersData'
import type { Customer, CustomerAddress } from '@/types/customer'

interface Props {
    mode?: 'draft' | 'persisted'
    selectedCustomer?: Customer | null
    selectedAddress?: CustomerAddress | null
}

const props = withDefaults(defineProps<Props>(), {
    mode: 'draft'
})

const emit = defineEmits<{
    'customer-selected': [customer: Customer | null]
    'address-selected': [address: CustomerAddress | null]
}>()

// Stores condicionales según modo
let ordersDraftsStore: ReturnType<typeof useOrdersDraftsStore> | null = null
let ordersDataStore: ReturnType<typeof useOrdersDataStore> | null = null

if (props.mode === 'draft') {
    ordersDraftsStore = useOrdersDraftsStore()
} else {
    ordersDataStore = useOrdersDataStore()
}

const handleCustomerSelected = (customer: Customer) => {
    if (props.mode === 'draft') {
        // Modo draft: actualizar store directamente
        ordersDraftsStore!.updateCustomer(customer)
        
        // Auto-completar guestName
        if (customer && customer.name) {
            const currentOrder = ordersDraftsStore!.currentOrder
            if (!currentOrder?.guestName?.trim()) {
                ordersDraftsStore!.updateGuestName(customer.name)
            }
        }
        
        // Auto-seleccionar dirección principal
        if (customer?.addresses?.length > 0) {
            const primaryAddress = customer.addresses.find(a => a.isPrimary)
            ordersDraftsStore!.updateAddress(primaryAddress || customer.addresses[0])
        }
    } else {
        // Modo persisted: emitir para validación externa
        emit('customer-selected', customer)
        
        // Auto-seleccionar dirección (el padre decide qué hacer)
        if (customer?.addresses?.length > 0) {
            const primaryAddress = customer.addresses.find(a => a.isPrimary)
            emit('address-selected', primaryAddress || customer.addresses[0])
        }
    }
}

const handleAddressSelected = (address: CustomerAddress | undefined) => {
    if (props.mode === 'draft') {
        ordersDraftsStore!.updateAddress(address || null)
    } else {
        emit('address-selected', address || null)
    }
}
</script>
```

**Cuándo usar componentes autónomos:**
1. El componente se usa en múltiples contextos con comportamientos diferentes
2. Queremos evitar cadenas largas de eventos (más de 2 niveles)
3. La lógica es compleja pero repetitiva entre contextos
4. Necesitamos encapsular decisiones de negocio

**Beneficios:**
- ✅ Menos código repetitivo en componentes padre
- ✅ Lógica encapsulada y testeable
- ✅ Reutilización real en múltiples contextos
- ✅ Menos props drilling
- ✅ Más fácil de mantener

## 🎭 Patrón de Modales Autónomos

### Concepto

Los modales autónomos manejan internamente toda su lógica (API calls, validación, estados) y solo emiten un evento `@updated` cuando hay cambios significativos.

### Estructura

```vue
<template>
    <BaseDialog :model-value="open" @update:model-value="handleClose">
        <form @submit.prevent="handleSave">
            <!-- Formulario con validación interna -->
            <BaseInput v-model="form.name" :error="errors.name" />
            
            <template #footer>
                <BaseButton variant="secondary" @click="handleClose">
                    Cancelar
                </BaseButton>
                <BaseButton 
                    variant="primary" 
                    :loading="saving"
                    :disabled="!isValid"
                    @click="handleSave"
                >
                    Guardar
                </BaseButton>
            </template>
        </form>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdersDataStore } from '@/store/ordersData'
import { useToast } from '@/composables/useToast'
import type { Order } from '@/types/order'

interface Props {
    open: boolean
    order: Order
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: [order?: Order]  // Emitir objeto actualizado
}>()

const ordersStore = useOrdersDataStore()
const { success, error: showError } = useToast()

const saving = ref(false)
const form = ref({ ...props.order })
const errors = ref({})

const isValid = computed(() => {
    // Validación interna
    return form.value.name.trim().length > 0
})

const handleSave = async () => {
    saving.value = true
    try {
        // 1. Llamar API
        const updated = await ordersStore.update(props.order.id, form.value)
        
        // 2. Actualización optimista ya se hizo en el store
        
        // 3. Notificar éxito
        success('Pedido actualizado')
        
        // 4. Emitir objeto actualizado
        emit('updated', updated)
        emit('close')
    } catch (err: any) {
        showError('Error al actualizar', err.message)
    } finally {
        saving.value = false
    }
}

const handleClose = () => {
    emit('close')
}
</script>
```

### Uso en el padre

```vue
<template>
    <EditModal 
        :open="showModal"
        :order="selectedOrder"
        @close="showModal = false"
        @updated="handleUpdated"
    />
</template>

<script setup lang="ts">
import type { Order } from '@/types/order'

const handleUpdated = (updated?: Order) => {
    // El store ya se actualizó optimistamente
    // Solo necesitamos actualizar la lista local si es necesario
    if (updated) {
        const index = orders.value.findIndex(o => o.id === updated.id)
        if (index !== -1) {
            orders.value[index] = { ...orders.value[index], ...updated }
        }
    }
}
</script>
```

**Beneficios:**
- Padre solo maneja apertura/cierre y actualización final
- Modal encapsula toda la lógica compleja
- Fácil de testear de forma aislada
- Reutilizable en múltiples vistas

## 📝 Patrón de Prellenado de Formularios

### Concepto

Usar props `initial*` para prellenar formularios desde búsquedas o contexto externo.

### Implementación

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Customer } from '@/types/customer'

interface Props {
    customer?: Customer | null
    initialPhone?: string  // Para prellenar desde búsqueda
    initialName?: string   // Para prellenar desde contexto
}

const props = defineProps<Props>()

const form = ref({
    name: '',
    phone1: '',
    phone2: '',
    // ... otros campos
})

onMounted(() => {
    if (props.customer) {
        // Modo edición: cargar datos existentes
        form.value = {
            name: props.customer.name,
            phone1: props.customer.phone1,
            phone2: props.customer.phone2 || '',
        }
    } else {
        // Modo creación: prellenar con valores iniciales
        if (props.initialPhone) {
            form.value.phone1 = props.initialPhone
        }
        if (props.initialName) {
            form.value.name = props.initialName
        }
    }
})
</script>
```

### Uso

```vue
<template>
    <!-- Usuario buscó por teléfono "3001234567" y no se encontró -->
    <CustomerForm 
        :initial-phone="searchQuery"
        @submit="handleCreate"
    />
</template>
```

**Beneficios:**
- Mejor UX: usuario no reescribe lo que ya buscó
- Menos errores de digitación
- Flujo más rápido

## 🔄 Patrón de Reactividad Optimista

### Concepto

Después de mutaciones (CREATE, UPDATE, DELETE), actualizar el estado local inmediatamente sin recargar desde el servidor.

### Implementación

**CREATE:**
```typescript
const handleCreate = async (data: CreateDto) => {
    const created = await api.create(data)
    items.value.unshift(created)  // Agregar al inicio
    if (totalCount.value !== undefined) totalCount.value++
    // ❌ NO hacer: await fetchAll()
}
```

**UPDATE:**
```typescript
const handleUpdate = async (id: number, data: UpdateDto) => {
    const updated = await api.update(id, data)
    
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
        items.value[index] = { ...items.value[index], ...updated }
    }
    // ❌ NO hacer: await fetchAll()
}
```

**DELETE:**
```typescript
const handleDelete = async (id: number) => {
    await api.delete(id)
    items.value = items.value.filter(item => item.id !== id)
    if (totalCount.value !== undefined) totalCount.value--
    // ❌ NO hacer: await fetchAll()
}
```

### Cuándo SÍ recargar desde el servidor

- ✅ Cambios que afectan múltiples items
- ✅ Operaciones complejas que el backend calcula (totales, agregaciones)
- ✅ Al cambiar de página en paginación
- ✅ Al aplicar filtros nuevos
- ✅ Errores de sincronización detectados

**Beneficios:**
- ⚡ UI instantánea sin esperas de red
- 📉 Menos carga en el servidor
- 🎯 Mejor experiencia de usuario
- 🔄 Datos siempre sincronizados (el servidor devuelve el objeto actualizado)

## 🎯 Resumen de Decisiones

| Escenario | Patrón a usar |
|-----------|---------------|
| Botón simple | Componente Pequeño (Atom) |
| Selector con búsqueda | Componente Mediano (Molecule) |
| Sección usada en draft y persisted | Componente Autónomo con `mode` |
| Modal con validación compleja | Modal Autónomo |
| Formulario desde búsqueda | Prellenado con `initial*` |
| Después de CREATE/UPDATE/DELETE | Reactividad Optimista |

## 🎨 Patrón de Tarjetas Seleccionables

### Concepto

Tarjetas que son completamente seleccionables con feedback visual sin checkbox visible, usadas en selección múltiple.

### Ejemplo: OrderCard

```vue
<template>
    <div :class="[
        'relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer',
        colorClass,
        isSelected ? 'ring-4 ring-emerald-500 scale-105 shadow-xl' : 'hover:shadow-lg'
    ]" @click="$emit('toggle-select', order.id)">
        <div v-if="isSelected" class="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">
            <CheckIcon class="w-4 h-4 text-white" />
        </div>
        <!-- Contenido -->
    </div>
</template>
```

**Características:**
- Click en toda la card para seleccionar
- Feedback visual: ring + escala + sombra
- Check icon en esquina (solo cuando seleccionado)
- NO hay checkbox visible

## 🔴 Patrón de Actualizaciones en Tiempo Real

### Concepto

Usar SignalR para actualizaciones en tiempo real sin polling constante.

### Estructura

```typescript
// Composable: useSignalR.ts
export function useSignalR(hubUrl: string) {
    const connection = ref<signalR.HubConnection | null>(null)
    const isConnected = ref(false)
    
    const connect = async () => {
        connection.value = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => localStorage.getItem('auth_token') || ''
            })
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: () => 3000
            })
            .build()
        
        await connection.value.start()
        isConnected.value = true
    }
    
    const on = (eventName: string, callback: (...args: any[]) => void) => {
        connection.value?.on(eventName, callback)
    }
    
    return { connection, isConnected, on, off }
}
```

**Uso:**
```typescript
// En el componente
const { isConnected, on } = useSignalR('http://localhost:5257/hubs/orders')

onMounted(() => {
    on('NewOrder', handleNewOrder)
    on('OrderReady', handleOrderReady)
})

const handleNewOrder = async (orderData: any) => {
    await loadOrders()  // Recargar lista
    // Opcional: TTS notification
    speak('Nuevo pedido recibido')
}
```

**Características:**
- Auto-reconnect cada 3 segundos
- Autenticación JWT automática
- Indicador visual de conexión
- Eventos tipados con TypeScript

**Beneficios:**
- ⚡ Actualizaciones instantáneas
- 📊 Menos carga del servidor (no polling)
- 🔄 Reconección automática
- 🎯 Mejor UX

## 🎤 Patrón de Notificaciones por Voz (TTS)

### Concepto

Usar SpeechSynthesis API para notificaciones por voz en contextos donde el usuario no está mirando la pantalla.

### Estructura

```typescript
// Composable: useTextToSpeech.ts
export function useTextToSpeech() {
    const isSupported = ref('speechSynthesis' in window)
    const isSpeaking = ref(false)
    
    const speak = (text: string, options?: { lang?: string; rate?: number }) => {
        if (!isSupported.value) return
        
        window.speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = options?.lang || 'es-ES'
        utterance.rate = options?.rate || 0.9
        
        utterance.onstart = () => { isSpeaking.value = true }
        utterance.onend = () => { isSpeaking.value = false }
        
        window.speechSynthesis.speak(utterance)
    }
    
    return { isSupported, isSpeaking, speak, cancel }
}
```

**Uso:**
```typescript
const { speak } = useTextToSpeech()

// Cuando llega nuevo pedido por SignalR
const handleNewOrder = async (orderData: any) => {
    const speechText = `Nuevo pedido número ${order.id}: dos ropa vieja y una coca cola litro y medio`
    speak(speechText)
}
```

**Reglas de formato:**
- Cantidad en español: "una", "dos", "tres"
- Conector "y" en último item si hay múltiples
- Formato: `cantidad producto`

**Toggle:**
```typescript
const soundEnabled = ref(true)

const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
}

// Condicional
if (soundEnabled.value) {
    speak(speechText)
}
```

## 📚 Referencias

- [docs/components.md](./components.md) - Guía completa de componentes
- [docs/development.md](./development.md) - Convenciones de desarrollo
- [docs/modules/kitchen.md](./modules/kitchen.md) - Módulo de cocina completo
- [.cursorrules](../.cursorrules) - Reglas para agentes IA

