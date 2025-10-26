# Recomendaciones Profesionales - Señor Arroz

## 🎯 Objetivo

Este documento contiene recomendaciones de arquitectura y mejores prácticas para elevar el nivel profesional del proyecto, con énfasis en mejoras aplicables de inmediato para el desarrollo del **módulo de cocina**.

---

## 🚀 Mejoras Prioritarias para Módulo de Cocina

### 1. Feature Flags (Banderas de Funcionalidad)

#### ¿Qué son?

Los Feature Flags son interruptores que permiten activar/desactivar funcionalidades sin necesidad de redesplegar código.

#### ¿Cómo funcionan?

```typescript
// src/config/features.ts
export const FEATURES = {
    // Módulos principales
    ENABLE_KITCHEN_MODULE: import.meta.env.VITE_ENABLE_KITCHEN === 'true',
    ENABLE_DELIVERY_MODULE: import.meta.env.VITE_ENABLE_DELIVERY === 'true',
    ENABLE_CASH_REGISTER: import.meta.env.VITE_ENABLE_CASH_REGISTER === 'true',
    
    // Configuraciones
    MAX_DRAFT_ORDERS: parseInt(import.meta.env.VITE_MAX_DRAFT_ORDERS || '10'),
    ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
    ENABLE_SOUND_ALERTS: import.meta.env.VITE_ENABLE_SOUND_ALERTS === 'true',
    
    // Features experimentales
    ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',
    ENABLE_ADVANCED_FILTERS: import.meta.env.VITE_ENABLE_ADVANCED_FILTERS === 'true',
} as const

// Tipo para autocompletado
export type FeatureFlag = keyof typeof FEATURES
```

#### Configuración en `.env`

```bash
# .env.development
VITE_ENABLE_KITCHEN=true
VITE_ENABLE_DELIVERY=true
VITE_ENABLE_CASH_REGISTER=false
VITE_MAX_DRAFT_ORDERS=10
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_SOUND_ALERTS=true

# .env.production
VITE_ENABLE_KITCHEN=true
VITE_ENABLE_DELIVERY=true
VITE_ENABLE_CASH_REGISTER=true
VITE_MAX_DRAFT_ORDERS=5
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_SOUND_ALERTS=false
```

#### Uso en Componentes

```vue
<template>
    <div>
        <!-- Módulo de cocina solo si está habilitado -->
        <router-link 
            v-if="FEATURES.ENABLE_KITCHEN_MODULE" 
            to="/kitchen"
        >
            Cocina
        </router-link>
        
        <!-- Notificaciones sonoras opcionales -->
        <button 
            v-if="FEATURES.ENABLE_SOUND_ALERTS"
            @click="playSound()"
        >
            🔔 Alerta Sonora
        </button>
    </div>
</template>

<script setup lang="ts">
import { FEATURES } from '@/config/features'
</script>
```

#### Uso en Router

```typescript
// src/router/index.ts
import { FEATURES } from '@/config/features'

const routes = [
    // ... otras rutas
    
    // Rutas condicionales
    ...(FEATURES.ENABLE_KITCHEN_MODULE ? [{
        path: '/kitchen',
        name: 'Kitchen',
        component: () => import('@/views/Kitchen/KitchenDashboard.vue'),
        meta: { requiresAuth: true, roles: ['KITCHEN', 'ADMIN', 'SUPERADMIN'] }
    }] : []),
    
    ...(FEATURES.ENABLE_DELIVERY_MODULE ? [{
        path: '/delivery',
        name: 'Delivery',
        component: () => import('@/views/Delivery/DeliveryDashboard.vue'),
        meta: { requiresAuth: true, roles: ['DELIVERYMAN', 'ADMIN', 'SUPERADMIN'] }
    }] : []),
]
```

#### Uso en Lógica de Negocio

```typescript
// src/composables/useOrderNotifications.ts
import { FEATURES } from '@/config/features'

export function useOrderNotifications() {
    const playSound = () => {
        if (!FEATURES.ENABLE_SOUND_ALERTS) return
        
        const audio = new Audio('/sounds/new-order.mp3')
        audio.play()
    }
    
    const showNotification = (title: string, body: string) => {
        if (!FEATURES.ENABLE_NOTIFICATIONS) return
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body })
        }
    }
    
    return { playSound, showNotification }
}
```

#### Beneficios

1. **Despliegue Seguro:** Desplegar código sin activar la funcionalidad
2. **Testing en Producción:** Habilitar para usuarios específicos (A/B testing)
3. **Rollback Instantáneo:** Desactivar sin redeploy si hay problemas
4. **Desarrollo Paralelo:** Equipos trabajan en features sin bloquear releases
5. **Configuración por Ambiente:** Diferentes configs en dev/staging/prod

#### Ejemplo para Módulo de Cocina

```typescript
// src/views/Kitchen/KitchenDashboard.vue
<template>
    <div v-if="FEATURES.ENABLE_KITCHEN_MODULE">
        <h1>Dashboard de Cocina</h1>
        
        <!-- Notificaciones sonoras opcionales -->
        <div v-if="FEATURES.ENABLE_SOUND_ALERTS">
            <label>
                <input type="checkbox" v-model="soundEnabled" />
                Alertas sonoras
            </label>
        </div>
        
        <!-- Lista de pedidos -->
        <KitchenOrdersList />
    </div>
    <div v-else>
        <p>Módulo de cocina no disponible</p>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FEATURES } from '@/config/features'
import { useOrderNotifications } from '@/composables/useOrderNotifications'

const { playSound, showNotification } = useOrderNotifications()
const soundEnabled = ref(FEATURES.ENABLE_SOUND_ALERTS)

onMounted(() => {
    // Escuchar nuevos pedidos
    // Si llega un nuevo pedido y soundEnabled está activo
    if (soundEnabled.value) {
        playSound()
    }
})
</script>
```

---

### 2. Services para Lógica de Negocio

#### ¿Qué son?

Los Services son clases o módulos que encapsulan lógica de negocio compleja, separándola de componentes y stores.

#### ¿Por qué usarlos?

**Problema actual:**
```vue
<!-- Lógica mezclada en componente -->
<script setup lang="ts">
const canChangeStatus = (order: Order, newStatus: OrderStatus) => {
    if (userRole === 'KITCHEN') {
        if (order.status === 'taken' && newStatus === 'in_preparation') return true
        if (order.status === 'in_preparation' && newStatus === 'ready') return true
        return false
    }
    if (userRole === 'ADMIN') {
        // ... más lógica compleja
    }
    // ... más casos
}
</script>
```

**Solución con Services:**
```typescript
// src/services/domain/OrderService.ts
export class OrderService {
    /**
     * Valida si un usuario puede cambiar el estado de un pedido
     */
    static canChangeStatus(
        order: Order, 
        newStatus: OrderStatus, 
        userRole: UserRole
    ): boolean {
        // Lógica centralizada y testeable
        const statusFlow = this.getStatusFlow(order.type)
        const currentIndex = statusFlow.indexOf(order.status)
        const newIndex = statusFlow.indexOf(newStatus)
        
        if (currentIndex === -1 || newIndex === -1) return false
        
        // Validar permisos por rol
        return this.hasPermissionForStatus(userRole, newStatus)
    }
    
    /**
     * Obtiene el flujo de estados según tipo de pedido
     */
    static getStatusFlow(orderType: OrderType): OrderStatus[] {
        const baseFlow: OrderStatus[] = ['taken', 'in_preparation', 'ready']
        
        if (orderType === 'delivery') {
            return [...baseFlow, 'on_the_way', 'delivered']
        }
        
        if (orderType === 'onsite') {
            return [...baseFlow, 'delivered']
        }
        
        return [...baseFlow, 'delivered']
    }
    
    /**
     * Valida permisos de rol para un estado
     */
    static hasPermissionForStatus(
        userRole: UserRole, 
        status: OrderStatus
    ): boolean {
        const permissions: Record<UserRole, OrderStatus[]> = {
            'KITCHEN': ['in_preparation', 'ready'],
            'CASHIER': ['taken', 'delivered', 'cancelled'],
            'DELIVERYMAN': ['on_the_way', 'delivered'],
            'ADMIN': ['taken', 'in_preparation', 'ready', 'on_the_way', 'delivered', 'cancelled'],
            'SUPERADMIN': ['taken', 'in_preparation', 'ready', 'on_the_way', 'delivered', 'cancelled'],
        }
        
        return permissions[userRole]?.includes(status) || false
    }
    
    /**
     * Calcula el total de un pedido
     */
    static calculateTotal(items: OrderItem[], deliveryFee: number = 0): number {
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
        return subtotal + deliveryFee
    }
    
    /**
     * Valida si un pedido puede ser cancelado
     */
    static canBeCancelled(order: Order): boolean {
        const nonCancellableStatuses: OrderStatus[] = ['delivered', 'cancelled']
        return !nonCancellableStatuses.includes(order.status)
    }
    
    /**
     * Obtiene el siguiente estado posible
     */
    static getNextStatus(order: Order): OrderStatus | null {
        const flow = this.getStatusFlow(order.type)
        const currentIndex = flow.indexOf(order.status)
        
        if (currentIndex === -1 || currentIndex === flow.length - 1) {
            return null
        }
        
        return flow[currentIndex + 1]
    }
}
```

#### Uso en Componentes

```vue
<script setup lang="ts">
import { OrderService } from '@/services/domain/OrderService'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()

const handleChangeStatus = async (order: Order, newStatus: OrderStatus) => {
    // Usar service para validación
    if (!OrderService.canChangeStatus(order, newStatus, authStore.userRole)) {
        showError('No tienes permisos para cambiar a este estado')
        return
    }
    
    // Proceder con el cambio
    await orderApi.updateStatus(order.id, newStatus)
}

const nextStatus = computed(() => {
    return OrderService.getNextStatus(currentOrder.value)
})
</script>
```

#### Estructura de Services Recomendada

```
src/services/
├── domain/              # Lógica de negocio pura
│   ├── OrderService.ts
│   ├── PaymentService.ts
│   ├── CustomerService.ts
│   └── KitchenService.ts
├── MainAPI/             # Servicios de API (ya existente)
│   ├── orderApi.ts
│   ├── customerApi.ts
│   └── ...
└── utils/               # Utilidades generales
    ├── formatters.ts
    ├── validators.ts
    └── calculators.ts
```

#### Service para Módulo de Cocina

```typescript
// src/services/domain/KitchenService.ts
export class KitchenService {
    /**
     * Filtra pedidos visibles para cocina
     */
    static getKitchenOrders(orders: Order[]): Order[] {
        const kitchenStatuses: OrderStatus[] = ['taken', 'in_preparation', 'ready']
        return orders.filter(order => kitchenStatuses.includes(order.status))
    }
    
    /**
     * Agrupa pedidos por prioridad
     */
    static groupByPriority(orders: Order[]): {
        urgent: Order[]
        normal: Order[]
        ready: Order[]
    } {
        const now = new Date()
        
        return {
            urgent: orders.filter(o => {
                const createdAt = new Date(o.createdAt)
                const minutesElapsed = (now.getTime() - createdAt.getTime()) / 1000 / 60
                return o.status === 'taken' && minutesElapsed > 15
            }),
            normal: orders.filter(o => o.status === 'in_preparation'),
            ready: orders.filter(o => o.status === 'ready')
        }
    }
    
    /**
     * Calcula tiempo de preparación estimado
     */
    static estimatePreparationTime(items: OrderItem[]): number {
        // Lógica de estimación basada en productos
        const baseTime = 10 // minutos base
        const timePerItem = 3 // minutos por producto
        
        return baseTime + (items.length * timePerItem)
    }
    
    /**
     * Valida si cocina puede marcar como listo
     */
    static canMarkAsReady(order: Order): boolean {
        return order.status === 'in_preparation'
    }
    
    /**
     * Obtiene estadísticas de cocina
     */
    static getStatistics(orders: Order[]): {
        pending: number
        inProgress: number
        ready: number
        avgPreparationTime: number
    } {
        const kitchenOrders = this.getKitchenOrders(orders)
        
        return {
            pending: kitchenOrders.filter(o => o.status === 'taken').length,
            inProgress: kitchenOrders.filter(o => o.status === 'in_preparation').length,
            ready: kitchenOrders.filter(o => o.status === 'ready').length,
            avgPreparationTime: this.calculateAvgTime(kitchenOrders)
        }
    }
    
    private static calculateAvgTime(orders: Order[]): number {
        // Implementar cálculo de tiempo promedio
        return 0
    }
}
```

#### Beneficios

1. **Testeable:** Lógica pura fácil de testear
2. **Reutilizable:** Usar en componentes, stores, composables
3. **Mantenible:** Un solo lugar para cambiar lógica
4. **Documentable:** JSDoc para cada método
5. **Type-Safe:** TypeScript completo

---

## 🎯 Otras Mejoras Recomendadas

### 3. Error Boundary

```vue
<!-- src/components/ErrorBoundary.vue -->
<template>
    <div v-if="error" class="error-boundary p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 class="text-xl font-bold text-red-900 mb-2">
            ⚠️ Algo salió mal
        </h2>
        <p class="text-red-700 mb-4">{{ error.message }}</p>
        <div class="flex gap-2">
            <BaseButton variant="primary" @click="reset">
                Reintentar
            </BaseButton>
            <BaseButton variant="secondary" @click="goHome">
                Ir al inicio
            </BaseButton>
        </div>
    </div>
    <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const error = ref<Error | null>(null)

onErrorCaptured((err: Error) => {
    error.value = err
    console.error('[ErrorBoundary]', err)
    return false // Prevenir propagación
})

const reset = () => {
    error.value = null
}

const goHome = () => {
    error.value = null
    router.push('/')
}
</script>
```

**Uso:**
```vue
<ErrorBoundary>
    <KitchenDashboard />
</ErrorBoundary>
```

### 4. Logging Estructurado

```typescript
// src/utils/logger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
    [key: string]: any
}

class Logger {
    private isDev = import.meta.env.DEV
    
    info(message: string, context?: LogContext) {
        this.log('info', message, context)
    }
    
    warn(message: string, context?: LogContext) {
        this.log('warn', message, context)
    }
    
    error(message: string, error: Error, context?: LogContext) {
        this.log('error', message, { ...context, error: error.message, stack: error.stack })
    }
    
    debug(message: string, context?: LogContext) {
        if (this.isDev) {
            this.log('debug', message, context)
        }
    }
    
    private log(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString()
        const logData = {
            timestamp,
            level,
            message,
            ...context
        }
        
        if (this.isDev) {
            console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}] ${message}`, context)
        } else {
            // En producción: enviar a servicio de logging (Sentry, LogRocket, etc.)
            this.sendToLoggingService(logData)
        }
    }
    
    private sendToLoggingService(data: any) {
        // Implementar integración con servicio de logging
        // Ejemplo: Sentry.captureMessage(data.message, { extra: data })
    }
}

export const logger = new Logger()
```

**Uso:**
```typescript
import { logger } from '@/utils/logger'

// Info
logger.info('Pedido creado', { orderId: 123, total: 50000 })

// Error
try {
    await orderApi.create(data)
} catch (err) {
    logger.error('Error al crear pedido', err as Error, { data })
}

// Debug (solo en desarrollo)
logger.debug('Estado del store', { orders: ordersStore.list })
```

### 5. Path Aliases Adicionales

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@views': path.resolve(__dirname, './src/views'),
            '@stores': path.resolve(__dirname, './src/store'),
            '@types': path.resolve(__dirname, './src/types'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@composables': path.resolve(__dirname, './src/composables'),
            '@services': path.resolve(__dirname, './src/services'),
        }
    }
})
```

**Actualizar tsconfig.json:**
```json
{
    "compilerOptions": {
        "paths": {
            "@/*": ["./src/*"],
            "@components/*": ["./src/components/*"],
            "@views/*": ["./src/views/*"],
            "@stores/*": ["./src/store/*"],
            "@types/*": ["./src/types/*"],
            "@utils/*": ["./src/utils/*"],
            "@composables/*": ["./src/composables/*"],
            "@services/*": ["./src/services/*"]
        }
    }
}
```

---

## 📋 Checklist para Módulo de Cocina

### Antes de Empezar
- [ ] Crear `src/config/features.ts` con feature flags
- [ ] Agregar variables de entorno en `.env`
- [ ] Crear `src/services/domain/KitchenService.ts`
- [ ] Crear `src/services/domain/OrderService.ts`
- [ ] Configurar path aliases adicionales

### Durante el Desarrollo
- [ ] Usar `FEATURES.ENABLE_KITCHEN_MODULE` en rutas
- [ ] Usar `KitchenService` para lógica de negocio
- [ ] Usar `OrderService` para validaciones
- [ ] Implementar `ErrorBoundary` en vistas principales
- [ ] Usar `logger` para tracking de eventos
- [ ] Aplicar reactividad optimista en mutaciones
- [ ] Crear componentes autónomos cuando sea necesario

### Testing
- [ ] Tests unitarios para `KitchenService`
- [ ] Tests unitarios para `OrderService`
- [ ] Tests de integración para flujo completo
- [ ] Verificar con feature flag desactivado

---

## 🎓 Recursos Adicionales

- [docs/patterns.md](./patterns.md) - Patrones de arquitectura
- [docs/components.md](./components.md) - Guía de componentes
- [docs/development.md](./development.md) - Convenciones de desarrollo
- [.cursorrules](../.cursorrules) - Reglas para agentes IA

