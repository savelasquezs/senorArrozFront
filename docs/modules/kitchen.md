# Módulo de Cocina

## Overview

El módulo de Cocina permite a usuarios con rol `Kitchen`, `Admin` o `Superadmin` gestionar pedidos en estado de preparación en tiempo real. Utiliza SignalR para actualizaciones instantáneas, texto a voz (TTS) para notificaciones de nuevos pedidos, y un sistema de tarjetas seleccionables con colores basados en tiempo transcurrido.

## Arquitectura

### Responsabilidades
- **Lectura**: Consulta `ordersDataStore` para listar pedidos `taken` y `in_preparation`
- **Mutaciones**: Usa `ordersDataStore.updateStatus()` para cambios de estado; NO hace llamadas directas a API
- **Updates optimistas**: Actualización local inmediata; el store sincroniza con backend
- **Contexto**: Pedidos en preparación; vista de "listos" para reimpresión

### Límites

**Dentro del módulo:**
- Manejo de transiciones de estado de pedidos (taken → in_preparation → ready)
- Componentes de visualización y selección de pedidos
- Sistema de TTS para notificaciones
- Actualización vía stores

**Fuera del módulo:**
- No crea ni elimina pedidos
- No gestiona clientes o direcciones
- No modifica detalles de productos del pedido
- Solo lee datos desde stores

## Fuentes de Datos

### Pinia Stores Utilizados
- `useOrdersDataStore()`: Única fuente de datos
  - `fetch()`: Cargar lista de pedidos con filtros
  - `fetchById()`: Obtener detalles completos de un pedido
  - `updateStatus()`: Cambiar estado del pedido (incluye optimistic update)

**Importante**: El módulo NO llama directamente a `orderApi`. Todas las operaciones pasan por el store.

### Update Optimista
El store implementa optimistic updates automáticamente:
```typescript
// En ordersDataStore.updateStatus()
if (list.value) {
    const index = list.value.items.findIndex(item => item.id === id)
    if (index !== -1) {
        list.value.items[index] = {
            ...list.value.items[index],
            status,  // Actualización inmediata
            statusDisplayName: getOrderStatusDisplayName(status),
            updatedAt: response.updatedAt
        }
    }
}
```

## Real-Time Updates (SignalR)

### Configuración
- **Hub URL**: `http://localhost:5257/hubs/orders`
- **Autenticación**: JWT desde `localStorage.getItem('auth_token')`
- **Auto-reconnect**: 3 segundos de delay
- **Composable**: `useSignalR()` en `src/composables/useSignalR.ts`

### Eventos Manejados

#### 1. `NewOrder` - Nuevo pedido
```typescript
on('NewOrder', handleNewOrder)
```
- Se dispara cuando se crea un pedido con status `taken` o se actualiza a `taken`
- Acciones:
  - Recarga la lista de pedidos
  - Reproduce TTS con productos del pedido (si `soundEnabled`)
  - Formato: "Nuevo pedido número 40: dos ropa vieja y una coca cola litro y medio"

#### 2. `ReservationReady` - Reserva próxima
```typescript
on('ReservationReady', handleReservationReady)
```
- Se dispara cuando una reservación está próxima
- Acciones: Recarga la lista de pedidos

### Conexión
```typescript
const { isConnected, on } = useSignalR(SIGNALR_HUB_URL)

onMounted(() => {
    on('NewOrder', handleNewOrder)
    on('ReservationReady', handleReservationReady)
})
```

## Componentes

### 1. KitchenView.vue
**Props**: Ninguna (usa stores internamente)

**Funcionalidad:**
- Layout principal con tabs (Activos / Listos)
- Maneja conexión SignalR y eventos
- Coordina actualizaciones en tiempo real
- Sistema de sonido con toggle

**Estado Local:**
- `activeTab`: 'active' | 'ready'
- `soundEnabled`: boolean
- `showConfirmModal`: boolean
- `ordersToConfirm`: OrderListItem[]
- `orderItemsMap`: Map<number, OrderDetailItem[]>

**Métodos:**
- `loadOrders()`: Carga lista desde store
- `loadOrderDetails()`: Carga detalles de cada pedido
- `handleNewOrder()`: Maneja evento SignalR de nuevo pedido
- `handleChangeStatus()`: Coordina cambio de estado
- `toggleSound()`: Activa/desactiva TTS

### 2. OrderCard.vue
**Props:**
- `order`: OrderListItem
- `orderItems`: OrderDetailItem[]
- `isSelected`: boolean

**Emits:**
- `toggle-select`: [orderId: number]

**Funcionalidad:**
- Tarjeta completamente seleccionable (click en toda la card)
- Muestra #pedido, estado, tiempo total, tiempo en estado actual
- Cambio de color dinámico según tiempo transcurrido
- Actualización de tiempo cada segundo
- Icono según tipo de pedido (onsite/delivery/reservation)

**Colores (KitchenService.getCardColorClass):**
- Verde (< 50% del tiempo máximo)
- Amarillo (50-75%)
- Naranja (75-100%)
- Rojo (> 100%)

### 3. OrderCardGrid.vue
**Props:**
- `orders`: OrderListItem[]
- `orderItemsMap`: Map<number, OrderDetailItem[]>

**Emits:**
- `change-status`: [orderIds: number[], newStatus: OrderStatus]

**Funcionalidad:**
- Grid responsive (1/2/3/4 columnas según pantalla)
- Muestra pedidos separados por estado (Taken / En Preparación)
- Selección múltiple con botones "Seleccionar todos" / "Limpiar"
- Botones de acción condicionales según estado y permisos
- Usa `useOrderPermissions.canChangeStatus()` para validar

**Selección:**
- Set de IDs seleccionados
- Muestra contador de seleccionados
- Botones deshabilitados si no hay selección válida

### 4. ConfirmStatusChangeModal.vue
**Props:**
- `isOpen`: boolean
- `orders`: OrderListItem[]
- `orderItemsMap`: Map<number, OrderDetailItem[]>

**Emits:**
- `close`: []
- `updated`: []

**Funcionalidad:**
- Modal autónomo que maneja su propia actualización
- Llama directamente a `ordersDataStore.updateStatus()`
- Muestra preview de pedidos a confirmar
- Mensaje sobre impresión automática (placeholder)

**Importante**: Componente completamente autónomo, NO depende del padre para actualizar estado.

### 5. ReadyOrdersTable.vue
**Props:**
- `orders`: OrderListItem[]
- `orderItemsMap`: Map<number, OrderDetailItem[]>

**Emits:**
- `reprint`: [orderId: number]

**Funcionalidad:**
- Tabla de pedidos con status `ready`
- Muestra ID, productos, tiempo transcurrido
- Botón "Reimprimir" (placeholder para impresora)

## Reglas de UX

### Tarjetas Seleccionables
- Click en cualquier parte de la card para seleccionar
- Feedback visual: ring verde + escala 1.05 + sombra
- Check icon en esquina superior derecha
- NO hay checkbox visible

### Gradientes de Color por Tiempo
Límites de tiempo (constandes en `KitchenService`):
- **Taken**: Máximo 5 minutos
- **In Preparation**: Máximo 15 minutos
- **Ready**: Máximo 40 minutos (para domiciliarios, no cocina)

Los colores cambian de verde → amarillo → naranja → rojo según porcentaje de tiempo transcurrido.

### Separación por Estado
Los pedidos se muestran en secciones:
- **Tomado** (badge amarillo): Pedidos recién tomados
- **En Preparación** (badge azul): Pedidos siendo preparados
- **Listos** (tab separado): Pedidos listos para recoger

### Cambio de Estado en Lote
- Seleccionar múltiples pedidos
- Si todos pueden cambiar a mismo estado, se habilita el botón
- Cambio a `in_preparation`: directo
- Cambio a `ready`: requiere confirmación en modal

## Transiciones de Estado

### Flujos Permitidos
1. **taken → in_preparation**: Directo (click en botón)
2. **in_preparation → ready**: Con confirmación (modal)
3. **taken → ready**: POSIBLE pero debe pasar por in_preparation primero

### Validación
Usa `useOrderPermissions.canChangeStatus()`:
```typescript
const { canChangeStatus } = useOrderPermissions()
const canMove = canChangeStatus(order, newStatus)
```

### Stores
Todas las actualizaciones van a `ordersDataStore.updateStatus()`:
```typescript
await ordersStore.updateStatus(orderId, 'ready')
```

## Text-to-Speech (TTS)

### Activación
```typescript
const { speak } = useTextToSpeech()
```

### Cuándo Suena
Solo cuando:
- Nuevo pedido llega por SignalR (evento `NewOrder`)
- El pedido tiene status `taken`
- `soundEnabled` es `true`

### Formato del Mensaje
Generado por `KitchenService.generateOrderSpeechText()`:
```
"Nuevo pedido número 40: dos ropa vieja y una coca cola litro y medio"
```

**Reglas:**
- Cantidad en español (una, dos, tres)
- Conectores "y" en último item si hay múltiples
- Formato: `cantidad producto`

### Toggle
Botón en esquina superior para activar/desactivar sonido.

## Impresión

### Estado Actual
Placeholder pendiente de implementar:
```typescript
console.log('TODO: Imprimir facturas para pedidos:', props.orders.map(o => o.id))
```

### Ubicación en Código
1. **ConfirmStatusChangeModal.vue** (línea ~60)
   - Al confirmar cambio a `ready`
   - Se imprimen TODOS los pedidos del modal

2. **ReadyOrdersTable.vue** (línea ~80)
   - Al hacer click en "Reimprimir"
   - Se imprime solo ese pedido

### Para Implementar
1. Decidir librería de impresión (React Native Print, @react-native-community/print)
2. Configurar impresora del dispositivo
3. Generar HTML de factura con datos del pedido
4. Llamar a API de impresión

## Puntos de Extensión

### Agregar Nuevo Evento SignalR
```typescript
// En KitchenView.vue
on('MiNuevoEvento', (data) => {
    console.log('Datos recibidos:', data)
    // Manejar evento
})
```

### Cambiar Tiempos Máximos
Editar constantes en `KitchenService.ts`:
```typescript
const KITCHEN_MAX_TAKEN_TIME = 5 * 60 * 1000 // 5 minutos
const KITCHEN_MAX_PREPARATION_TIME = 15 * 60 * 1000 // 15 minutos
```

### Agregar Vista de Domiciliarios
Usar mismos componentes (`OrderCard`, `OrderCardGrid`) pero:
- Filtrar pedidos con status `ready`
- Mostrar datos adicionales: dirección, barrio, número de items
- Permitir pasar a `on_the_way`

### Modificar Colores
Editar `KitchenService.getCardColorClass()`:
```typescript
static getCardColorClass(order: OrderListItem): string {
    const percentage = (elapsed / maxTime) * 100
    
    if (percentage < 50) return 'bg-green-50 border-green-400'
    if (percentage < 75) return 'bg-yellow-50 border-yellow-400'
    // ...
}
```

## Testing

### Unit Tests
1. **KitchenService**
   - `getElapsedTime()`: Calcula correctamente tiempo transcurrido
   - `getCardColorClass()`: Retorna color correcto según tiempo
   - `formatElapsedTime()`: Formatea minutos:segundos correctamente
   - `generateOrderSpeechText()`: Genera texto con conectores correctos

2. **useTextToSpeech**
   - `speak()`: Invoca SpeechSynthesis.speak con parámetros correctos
   - `cancel()`: Cancela síntesis activa
   - Maneja errores de navegadores sin soporte

### Integration Tests
1. **KitchenView con SignalR**
   - Mock de SignalR connection
   - Verificar que eventos disparan actualización de lista
   - Verificar que TTS se reproduce cuando llega nuevo pedido

2. **OrderCardGrid**
   - Verificar selección múltiple
   - Verificar que botones se habilitan/deshabilitan según permisos
   - Verificar emit de `change-status`

### E2E Tests
1. Flujo completo:
   - Usuario Kitchen abre `/kitchen`
   - Ve pedidos tomados
   - Selecciona múltiples
   - Cambia estado a in_preparation
   - Verifica actualización visual
   - Cambia a ready
   - Confirma en modal
   - Verifica que aparecen en tab "Listos"

2. Real-time:
   - Simula evento SignalR `NewOrder`
   - Verifica que nuevo pedido aparece
   - Verifica que suena TTS

### Mocking SignalR
```typescript
vi.mock('@microsoft/signalr', () => ({
    HubConnectionBuilder: {
        withUrl: () => ({
            withAutomaticReconnect: () => ({
                configureLogging: () => ({
                    build: () => mockConnection
                })
            })
        })
    }
}))
```

## Configuración Local

### Variables de Entorno
```bash
# SignalR Hub URL
VITE_SIGNALR_HUB_URL=http://localhost:5257/hubs/orders
```

### Desarrollo
1. Backend debe tener SignalR configurado
2. Hub debe estar en `/hubs/orders`
3. Backend debe emitir eventos: `NewOrder`, `ReservationReady`
4. Autenticación JWT debe funcionar

## Comandos Relacionados

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Test
npm run test
```

## Referencias

- [SignalR Documentation](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction)
- [Speech Synthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [Pinia Stores](./architecture.md#stores)
- [Componentes UI](./components.md)
- [Patrones](./patterns.md)

