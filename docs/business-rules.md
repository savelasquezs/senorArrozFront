# Reglas de Negocio - Señor Arroz

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

### Matriz de Permisos Detallada

| Funcionalidad | Superadmin | Admin | Cajero | Cocina | Domiciliario |
|---------------|------------|-------|--------|--------|--------------|
| **Dashboard** | | | | | |
| Dashboard Global | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard Sucursal | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Gestión de Usuarios** | | | | | |
| Crear usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Gestión de Productos** | | | | | |
| Crear productos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar productos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver productos | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Gestión de Pedidos** | | | | | |
| Crear pedidos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editar pedidos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cancelar pedidos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver todos los pedidos | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Gestión de Clientes** | | | | | |
| Crear clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editar clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Gestión Financiera** | | | | | |
| Gestión de bancos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestión de apps | ✅ | ✅ | ❌ | ❌ | ❌ |
| Liquidar apps | ✅ | ✅ | ❌ | ❌ | ❌ |
| Confirmar transferencias | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Módulo de Cocina** | | | | | |
| Ver pedidos en preparación | ✅ | ✅ | ❌ | ✅ | ❌ |
| Cambiar estado a "Ready" | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Módulo de Domicilios** | | | | | |
| Ver pedidos listos | ✅ | ✅ | ❌ | ❌ | ✅ |
| Tomar pedidos para entrega | ✅ | ✅ | ❌ | ❌ | ✅ |
| Cambiar estado a "On The Way" | ✅ | ✅ | ❌ | ❌ | ✅ |
| Marcar como entregado | ✅ | ✅ | ❌ | ❌ | ✅ |
| Ver historial de entregas | ✅ | ✅ | ❌ | ❌ | ✅ |

### Reglas Específicas por Rol

#### Superadmin
- **Acceso total**: Puede ver y modificar datos de todas las sucursales
- **Gestión global**: Dashboard con métricas de todas las sucursales
- **Configuración**: Único que puede crear/editar sucursales
- **Limitación**: Solo puede existir 1 superadmin en el sistema

#### Admin
- **Acceso limitado**: Solo ve datos de su sucursal asignada
- **Gestión local**: Dashboard de su sucursal específica
- **Limitación**: Solo 1 admin por sucursal
- **Responsabilidades**: Gestión de productos, usuarios de su sucursal, liquidación de apps

#### Cashier
- **Operaciones diarias**: Crear pedidos, gestionar clientes
- **Asignación**: Puede asignar/desasignar domiciliarios solo para pedidos del mismo día
- **Abonos**: Crear abonos parciales y liquidaciones de domiciliarios
- **Caja**: Hacer cuadre de caja diario

#### Kitchen
- **Vista simplificada**: Solo ve pedidos en preparación
- **Estado limitado**: Solo puede cambiar pedidos a "Ready"
- **Filtrado**: Pedidos desaparecen de su vista al pasarlos a "Ready"

#### Deliveryman
- **Pedidos listos**: Solo ve pedidos en estado "Ready" y los suyos propios
- **Estados**: Puede cambiar a "OnTheWay" o revertir entrega (máximo 3 horas)
- **Historial**: Ve historial de sus pedidos entregados y abonos
- **Pedidos en curso**: Vista de los pedidos en ruta de entrega
- **Geolocalización**: Vista con Google Maps de pedidos "OnTheWay" asignados
- **Entrega automática**: Opción de marcar como entregado al estar a 20m o menos del destino 

## 🍽️ Sistema de Pedidos

### Tipos de Pedido

#### Onsite (En el local)
- **Cliente**: Opcional
- **Dirección**: No aplica
- **Delivery Fee**: No aplica
- **Guest Name**: Campo opcional si no se asigna cliente
- **Fidelización**: Se aplica si se asigna cliente

#### Delivery (A domicilio)
- **Cliente**: Obligatorio
- **Dirección**: Obligatoria (seleccionar de las direcciones del cliente)
- **Delivery Fee**: Obligatorio (basado en la dirección seleccionada)
- **Validación**: No se puede crear sin cliente y dirección

#### Reservation (Reservación)
- **Cliente**: Obligatorio
- **Dirección**: Obligatoria (si es delivery)
- **Fecha/Hora**: Campo `reservedFor` obligatorio
- **Contabilidad**: Se suma en las ventas del día de entrega (no de creación)
- **Validación**: No se puede crear sin fecha/hora de entrega

### Estados del Pedido

```typescript
enum OrderStatus {
  TAKEN = 'taken',                    // Tomado por el sistema
  IN_PREPARATION = 'in_preparation',  // En preparación en cocina
  READY = 'ready',                    // Listo para entrega/retiro
  ON_THE_WAY = 'on_the_way',         // En camino (delivery)
  DELIVERED = 'delivered',            // Entregado al cliente
  CANCELLED = 'cancelled'             // Cancelado
}
```

### Flujo de Estados

```
TAKEN → IN_PREPARATION → READY → ON_THE_WAY → DELIVERED
  ↓           ↓            ↓         ↓
CANCELLED  CANCELLED   CANCELLED  CANCELLED
```

### Reglas de Transición de Estados

1. **TAKEN → IN_PREPARATION**: Solo Admin, Kitchen
2. **IN_PREPARATION → READY**: Solo Kitchen
3. **READY → ON_THE_WAY**: Solo Deliveryman, Admin
4. **ON_THE_WAY → DELIVERED**: Solo Deliveryman, Admin
5. **Cualquier estado → CANCELLED**: Solo Admin, Superadmin (requiere motivo)

## 💰 Sistema de Pagos

### Tipos de Pago

#### App Payments
- **Limitación**: Máximo 1 app payment por pedido
- **Apps permitidas**: Rappi, Uber Eats, DiDi Food, etc.
- **Registro obligatorio**: Debe existir en tabla `app_payment`
- **Liquidación**: Se puede marcar como `isSettled` para crear `bank_payment`

#### Bank Payments
- **Limitación**: Múltiples bank payments permitidos por pedido
- **Tipos**: Transferencias bancarias, PSE, Nequi, etc.
- **Confirmación**: Admin puede confirmar transferencias
- **Validación**: Backend valida que no existan más de 1 app_payment por order_id

#### Efectivo
- **Cálculo**: Diferencia no cubierta por apps/bancos
- **Registro**: Se considera automáticamente como efectivo
- **Validación**: Suma de pagos ≤ total del pedido

### Reglas de Liquidación

#### Liquidación de Apps
1. **Múltiples apps**: Se pueden liquidar múltiples app_payments juntos
2. **Bank payment**: Al marcar como `isSettled` se crea un `bank_payment` con ese valor
3. **Filtrado**: Apps se pueden filtrar por fecha y estado para liquidación masiva
4. **Resumen**: Admin y Superadmin ven resumen del dinero que debe tener cada banco/app

#### Gastos
- **Efectivo puro**: Si no hay `expense_bank_payment` → 100% efectivo
- **Movimientos internos**: Entre bancos y caja-bancos usando `bank_payment` (income) y `expense_bank_payment` (outcome)

## 👤 Gestión de Clientes

### Registro de Clientes
- **Identificación**: Teléfono como campo principal
- **Campos obligatorios**: Nombre, teléfono principal
- **Campos opcionales**: Teléfono secundario
- **Sucursal**: Cliente pertenece a una sucursal específica

### Direcciones de Clientes
- **Múltiples direcciones**: Un cliente puede tener varias direcciones
- **Dirección principal**: Una dirección marcada como principal
- **Delivery fee**: Cada dirección tiene su propio fee de domicilio
- **Información adicional**: Barrio, coordenadas GPS, información extra

### Fidelización
- **Aplicación**: Se aplica según `loyalty_rule` al momento de crear el pedido
- **Condiciones**: Solo se aplica si se asigna cliente al pedido
- **Cancelación**: Pedidos cancelados no suman puntos de fidelización

## 🏪 Gestión de Sucursales

### Configuración de Sucursal
- **Única por sucursal**: Solo 1 admin y 1 cocina por sucursal
- **Impresoras**: Configuración inicial incluye impresoras
- **Reglas de fidelización**: Configurables por sucursal
- **Acceso**: Usuarios solo ven datos de su sucursal (excepto superadmin)

### Productos por Sucursal
- **Categorías**: Cada sucursal tiene sus propias categorías de productos
- **Stock**: Control de inventario por sucursal
- **Precios**: Precios dinámicos por sucursal
- **Activos**: Productos pueden activarse/desactivarse por sucursal

## 📊 Reportes y Métricas

### Dashboard por Rol

#### Superadmin
- **Métricas globales**: Todas las sucursales
- **Comparativas**: Entre sucursales
- **Tendencias**: Evolución temporal
- **KPIs**: Ventas totales, productos más vendidos, etc.

#### Admin
- **Métricas de sucursal**: Solo su sucursal
- **Operativas**: Productos, ventas, pedidos
- **Financieras**: Liquidaciones, gastos
- **Usuarios**: Actividad de su equipo

#### Cashier
- **Reportes básicos**: Ventas  y gastos del dia
- **Pedidos**: Estado de pedidos activos
- **Caja**: Resumen de caja diaria

#### Deliveryman
- **Historial personal**: Pedidos entregados
- **Abonos**: Resumen de abonos y liquidaciones
- **Métricas**: Tiempo promedio de entrega, dinero ganado de domicilios(delivery fee de las ordenes) filtrado por fechas, graficas historicas de cantidad de pedidos entregados y dinero ganado por fechas

### KPIs Principales
- **Ventas**: Por sucursal, día, método de pago
- **Productos**: Más vendidos, stock bajo
- **Entregas**: Tiempo promedio, tasa de entrega exitosa
- **Cancelaciones**: Tasa de cancelación, motivos
- **Métodos de pago**: Distribución, apps más usadas

## 🔒 Reglas de Seguridad

### Autenticación
- **JWT**: Tokens con refresh automático
- **Sesiones**: Logout automático en token expirado
- **Roles**: Validación de permisos en cada acción

### Validaciones
- **Frontend**: Validación de formularios antes de envío
- **Backend**: Validación de datos y permisos
- **Tipos**: TypeScript para type safety en frontend

### Cancelaciones
- **Motivo obligatorio**: Cancelaciones requieren motivo
- **Auditoría**: Historial de cambios en pedidos
- **Permisos**: Solo Admin y Superadmin pueden cancelar

## 📍 Sistema de Geolocalización

### Funcionalidad para Domiciliarios
- **Vista de mapa**: Google Maps integrado mostrando ubicación del domiciliario
- **Pedidos en ruta**: Marcadores en el mapa para pedidos "OnTheWay" asignados
- **Geolocalización en tiempo real**: Tracking de la ubicación del domiciliario
- **Distancia de entrega**: Cálculo automático de distancia al destino
- **Entrega automática**: Botón de "Entregar" aparece al estar a 20m o menos
- **Navegación**: Integración con Google Maps para navegación GPS

### Reglas de Geolocalización
- **Permisos**: Solicitar permisos de ubicación al acceder al módulo
- **Precisión**: Usar GPS para mayor precisión en la ubicación
- **Batería**: Optimizar uso de batería con actualizaciones inteligentes
- **Offline**: Funcionalidad básica sin conexión (caché de mapas)
- **Privacidad**: Ubicación disponible para admin, superadmin y domicilirio.

### Estados de Ubicación
- **Tracking activo**: Seguimiento en tiempo real de la ubicación
- **Tracking pausado**: Pausa del seguimiento (modo ahorro de batería)
- **Sin permisos**: Estado cuando no se han otorgado permisos de ubicación
- **Error de ubicación**: Manejo de errores de GPS/red

## 📱 Reglas de UI/UX

### Navegación
- **Redirección por rol**: Cada rol tiene su dashboard específico
- **Protección de rutas**: Validación de permisos en router
- **Breadcrumbs**: Navegación jerárquica clara con nombres y no con ids(solo se permite id en caso de que no haya un nombre o su equivalente)

### Formularios
- **Validación en tiempo real**: Feedback inmediato al usuario
- **Campos obligatorios**: Marcados visualmente con asterisco
- **Mensajes de error**: Claros y específicos

### Responsive Design
- **Mobile first**: Diseño optimizado para móviles
- **Sidebar colapsible**: En dispositivos pequeños
- **Touch friendly**: Botones y elementos táctiles

---

**Próximos pasos**: Ver [API Reference](./api-reference.md) para implementación técnica de estas reglas.
