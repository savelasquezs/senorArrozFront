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
- **Cabecera en `/kitchen`**: La franja con estado de conexión (SignalR), permiso de notificaciones del navegador, activación de sonido TTS y botón «Actualizar» se muestra **solo** al usuario con rol **Kitchen**. Quien entre con **Admin** o **Superadmin** sigue pudiendo usar el módulo según la matriz, pero sin esa barra en cabecera.
- **Modo combinado (solo UI)**: El interruptor «Modo combinado» va en la **misma franja que las pestañas** (solo con *Pedidos activos* seleccionado) para ahorrar altura. Se ocultan *Seleccionar todos* / *Limpiar*; la selección es por toque en las tarjetas. Se muestran juntos *Tomado* y *En preparación* en un solo bloque, agrupados por la categoría del primer ítem de cada pedido. La **fuente de verdad** del estado del pedido sigue siendo la API/BD. «Marcar como listo» en este modo, al confirmar, aplica consecutivamente las mismas transiciones que el flujo en dos pasos: *Tomado* → *En preparación* → *Listo* si aplica, o solo *Listo* si el pedido ya estaba *En preparación*. La preferencia se guarda en `localStorage` (`senorarroz.kitchen.combinedMode`). Los eventos en tiempo real (SignalR) y el refresco de listado se comportan igual que en el modo de dos secciones.
- **Nombre corto de producto en cocina (pantalla y comanda)**: Misma lógica en `KitchenProductNameFormatter` (API / tickets) y `formatKitchenProductDisplayName` en `useKitchenProductDisplayName.ts` (vue cocina). Reglas, en orden de aplicación razonable:
  - Se omiten como conectores o relleno: `arroz`, `con`, `de`, `unidades` (comparación **sin tildes** en minúsculas).
  - Frase fija `a la francesa` (tolerar `francésa` / typo `fransesa`): se quita.
  - `chicharron` / `chicharrón` (y variantes) en cualquier parte de un token: se sustituye por `chich` (p. ej. compuesto *Combochicharrón* → *Combochich*).
  - Secuencia `ropa` + `vieja` (dos palabras) → una palabra: `ropa`.
  - Si en el **mismo** nombre de producto aparecen `Súper` y `Familiar` (cada una como token), se elimina `Familiar` y `Súper` pasa a `super` (p. ej. *… Súper Familiar* → … **super** …).
  - Si el nombre contiene el tamaño `Súper` (token `super` tras normalizar), `super` se muestra **al inicio** del nombre corto (lectura en cocina: tamaño primero; p. ej. *Arroz ropa vieja con chicharrón Súper* → *super ropa chich*).
  - Postproceso en la cadena mostrada: “número + gr” (con o sin espacio) pasa a “número + g” (p. ej. *500 gr* → *500g*); un token *x* seguido de dígitos (*x5*, *X10*) pasa a *x 5*, *x 10* (separar cantidad de la *x*).
- Si tras todas las reglas no quedara ningún token, se conserva el nombre original (trim) para no dejar el ítem en blanco (p. ej. solo *arroz con*).

#### Deliveryman
- **Pedidos listos**: Solo ve pedidos en estado "Ready" y los suyos propios
- **Estados**: Puede cambiar a "OnTheWay" o revertir entrega (máximo 3 horas)
- **Historial**: Ve historial de sus pedidos entregados y abonos
- **Pedidos en curso**: Vista de los pedidos en ruta de entrega
- **Geolocalización**: Vista con Google Maps de pedidos "OnTheWay" asignados
- **Entrega automática**: Opción de marcar como entregado al estar a 20m o menos del destino 
- **Push FCM “pedido listo” (`order_ready`)**: Solo reciben el push los domiciliarios activos de la sucursal que ese día calendario (**America/Bogota**) tienen al menos un pedido con instante de **asignación** incluido en `orders.status_times` (clave preferente `delivery_man_assigned`, guardada en cada asignación/reasignación; si falta en datos antiguos se usa como respaldo `ontheway` / `on_the_way`), que **no** tengan liquidación total del día (`deliveryman_day_states.blocked` para esa fecha), y que **no** estén “ocupados” con algún pedido en estado **OnTheWay** en esa sucursal. SignalR (`OrderReady` en el grupo de delivery de la sucursal) no cambia con esta regla.

## Zona horaria y fechas de negocio

- **Persistencia**: Los instantes (`CreatedAt`, `ReservedFor`, etc.) se guardan y comparan como **UTC** en base de datos y en la API (timestamptz).
- **Día operativo y “hoy”**: Cualquier regla de negocio que dependa del **día calendario** (mismo día que la creación, “solo hoy”, filtros por fecha de operación, liquidaciones, rangos por defecto cuando el usuario no envía fechas) usa el calendario de **America/Bogotá** (Colombia, UTC−5 fijo salvo cambio normativo).
- **Backend**: Centralizar en `ColombiaTimeHelper` (`SenorArroz.Application`): conversión a fecha calendario Colombia, rangos UTC por día(s) en Colombia (`GetColombiaCalendarDateRangeUtc`), `IsColombiaTodayFromUtc`, `IsSameColombiaCalendarDay`, etc. **No** usar `_clock.UtcNow.Date` ni `timestampUtc.Date` para definir “hoy” o “mismo día” de negocio.
- **Frontend**: Para mostrar o enviar fechas de negocio usar `America/Bogotá` (p. ej. `Intl` con `timeZone: 'America/Bogota'`, utilidades en `src/utils/colombiaDate.ts` / `DateTimeService`).
- **Evitar**: Tomar solo `toISOString().slice(0, 10)` sin zona Bogotá para “hoy”; mezclar el calendario del reloj del PC del usuario con reglas que deben ser siempre Colombia.
- **Gestión de domiciliarios y liquidación (filtro por fecha)**: En el resumen diario, el detalle por domiciliario, la liquidación del día, el listado paginado del modal de pedidos y la nómina/insights que suman domicilio por período, los pedidos **entregados** se filtran por el **instante en que se marcó entregado** (`status_times.delivered` en base de datos, en UTC), dentro del rango del día o período elegido. **No** se usa para ese filtro la fecha de creación del pedido ni `reserved_for`. Si aplica liquidación parcial en el día, el recorte “después de la última liquidación” se aplica **después** sobre ese conjunto (misma lógica de ciclo que ya existía).
- **Quién aparece en gestión de domiciliarios (`daily-overview`)**: domiciliarios con al menos un pedido **Delivered** cuya entrega cae en el período seleccionado **o** al menos un pedido **OnTheWay** (delivery u onsite) con domiciliario asignado. Las cifras de cuadre en la tarjeta pueden seguir usando el ciclo de liquidación parcial.
- **Cadenas solo fecha (`YYYY-MM-DD`)**: Cuando el front envía o muestra solo fecha sin hora, ese valor corresponde al **día calendario en `America/Bogota`**, no al día local del navegador del usuario.
- **Instantes ISO**: Los timestamps completos (`createdAt`, `reservedFor`, etc.) son instantes en el tiempo; el backend y el front los serializan típicamente en **ISO 8601 (UTC)**. La zona de Bogotá se usa para decidir **qué día calendario** agrupa un evento en reportes y filtros por fecha.
- **Texto visible en UI**: Listados, tablas, dashboard y modales que muestran fechas u horas deben usar los formateadores centralizados del front (`defaultBusinessCalendar` / `useFormatting`), alineados a la **misma** zona IANA que el calendario operativo (`America/Bogota`), salvo excepciones puntuales documentadas en código.
- **Horario de verano**: Colombia **no** aplica horario de verano; el offset efectivo respecto a UTC es **UTC−05:00** (coherente con el "UTC−5 fijo" indicado arriba, salvo cambio normativo).
- **Extensión futura**: Si una sucursal definiera otra zona horaria en configuración, las mismas reglas aplicarían usando ese identificador IANA en el núcleo de fechas del front; hoy el valor fijo es `America/Bogota`.

## 🍽️ Sistema de Pedidos

### Tipos de Pedido

#### Onsite (En el local)
- **Cliente**: Opcional
- **Dirección**: No aplica
- **Delivery Fee**: No aplica. En el **borrador del POS**, al pasar a onsite el monto de envío se pone en **0**; al volver a **delivery** se reajusta a la tarifa de la **dirección** si ya está seleccionada. Las **reservas** no cambian el envío solo por el selector de tipo.
- **guestName**: Campo opcional
- **Fidelización**: Se aplica si se asigna cliente
- **Status inicial**: `'taken'`

#### Delivery (A domicilio)
- **Cliente**: Obligatorio
- **Dirección**: Obligatoria (seleccionar de las direcciones del cliente)
- **guestName**: Obligatorio (auto-completado con nombre del cliente, editable)
- **Delivery Fee**: Obligatorio (basado en la dirección seleccionada)
- **Validación**: No se puede crear sin cliente, dirección y guestName
- **Status inicial**: `'taken'`
- **Nota**: guestName permite especificar quién recibe (puede ser familiar o conocido)

#### Reservation (Reservación)
- **Cliente**: Opcional
- **Dirección**: Opcional en creación (reserva en local). Si el usuario **selecciona** una dirección del cliente, el front debe enviar `addressId` y `delivery_fee` coherentes con esa dirección al crear el pedido, para persistir el dato y permitir pasar el pedido a domicilio sin perder la ubicación.
- **Nota**: Una reserva con fecha programada que nace desde el flujo **Delivery + “para más tarde”** sigue exigiendo dirección como en Delivery.
- **guestName**: Obligatorio (auto-completado con nombre del cliente si existe, editable)
- **Fecha/Hora**: Campo `reservedFor` obligatorio
- **Validación**: No se puede crear sin fecha/hora y guestName
- **Status inicial**: `'taken'`
- **Contabilidad**: Se suma en las ventas del día de entrega (no de creación)
- **Validación**: No se puede crear sin fecha/hora de entrega
- **Reserva → en preparación (cocina)**: al pasar de `taken` a `in_preparation`, el backend puede fijar el tipo final (`delivery` si hay `address_id`, `onsite` si no). Las **líneas del pedido** deben conservarse; ese paso no debe borrar ni reemplazar productos.
- **Cambio manual de tipo (reserva → domicilio o en el local)**: si el pedido ya tenía `reserved_for` y `prepare_at`, deben **conservarse** (mismo horario de entrega y de aparición en cocina), salvo que en ese mismo flujo el usuario edite esas fechas.

### Totales al crear pedido (API)

- En la creación del pedido, el servidor **recalcula** `subtotal`, `discount_total` y `total` a partir de las líneas (`order_details`) y el `delivery_fee`, para que coincidan con la suma de líneas. Las validaciones posteriores (por ejemplo **efectivo en tienda** frente al remanente `total − bancos − apps`) usan ese total coherente y no dependen de que el cliente envíe `total` en el cuerpo del JSON.

### Domicilio gratis (borrador POS)

- **Tope por sucursal**: `branch.max_free_delivery_discount` (COP, por defecto 3000). Configurable en ficha de sucursal.
- **Presupuesto de descuento**: `min(delivery_fee, max_free_delivery_discount)` cuando el usuario activa «Domicilio gratis» en el borrador.
- **Alcance de tipo**: aplica en pedidos **delivery** y en **reserva con dirección** (`address_id`); al pasar a **onsite** se desactiva el flag y se limpia el reparto.
- **Reparto**: el presupuesto se reparte en **partes enteras COP** entre las líneas de producto de forma equitativa, respetando que el descuento por línea no supere `cantidad × precio_unitario − descuento_manual` en esa línea (sin subtotales negativos). La suma del descuento repartido coincide exactamente con el presupuesto (salvo si la suma de capacidades de líneas es menor que el presupuesto, en cuyo caso se descuenta solo hasta esa suma).
- **Persistencia API**: el precio unitario no se altera; en cada línea se envía `discount` = descuento manual + descuento de domicilio gratis (un solo campo en `order_details`).
- **Persistencia EF**: esos tres campos deben **persistirse y leerse** en el modelo EF como valores de aplicación (no como “solo generados por BD ignorados tras guardar”). Si la entidad `Order` quedara con `total = 0` en memoria justo después del insert, el tope de efectivo en tienda sería 0 y fallaría la validación aunque el cliente enviara un monto parcial correcto. En PostgreSQL pueden seguir existiendo triggers que recalculan totales al cambiar líneas; deben ser coherentes con la misma fórmula.

### Mensaje copiable al cliente (borrador POS)

El botón **Copiar mensaje** en el resumen de ítems del borrador genera un texto listo para pegar (p. ej. WhatsApp) según el tipo y la programación.

- **Ventana de tiempo (configurable por sucursal)**: en `branch` se guardan `pos_copy_eta_minutes` (mínimo, por defecto 30) y `pos_copy_eta_range_minutes` (margen al tope, por defecto 15). El texto mostrado es `"{mínimo}-{mínimo+margen} min"` (p. ej. 30+15 → `30-45 min`); si el margen es 0, solo `"{mínimo} min"`. Editable en ficha de sucursal (Admin o Superadmin). Aplica a recogida inmediata, entrega inmediata a domicilio y variantes con promo **domicilio gratis**; no altera frases con hora o fecha concretas.

- **En el local (`onsite`)**: total, ventana aproximada de recogida usando el texto de sucursal si el pedido no es «para más tarde»; si es «para más tarde» y hay hora de entrega (`reservedFor`), se usa **«a las {hora}»** en su lugar. Cierre: **reclamar a nombre de** `guestName` si está informado; si no, se indica identificarse al recoger.
- **Domicilio (`delivery`)** — mismo criterio de costos y promoción **domicilio gratis** que antes (ver arriba): con **entrega inmediata** (sin «para más tarde») el cierre usa la ventana configurada (**«llega en {texto}»**); con **para más tarde** y `reservedFor`, el cierre pasa a **«allá estaremos entonces a las {hora}»** (misma estructura en todas las variantes con promo: sin promo, domi gratis, o remanente de envío con «pesitos»).
- **Reserva con entrega a domicilio** (`reservation` y dirección): mismo bloque de domicilio y promociones, pero el cierre de entrega usa **fecha y hora** de `reservedFor`: **«allá estaremos entonces el {fecha} a las {hora}»**.
- **Reserva sin entrega a domicilio** (sin dirección): total, fecha/hora del evento (`reservedFor`); si aún no hay fecha en el borrador, solo el total y la línea de **reclamar a nombre** / identificación, alineada con `guestName`.

Los formatos de fecha/hora usan el calendario de negocio del front (`useFormatting` / zona de negocio), coherentes con el resto del POS.

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

#### Efectivo cobrado en tienda (`paid_in_store_cash`)
- **Quién puede marcar, ajustar monto o quitar**: Admin, Superadmin y Cajero (misma autorización que el endpoint `PUT /orders/{id}/paid-in-store-cash`).
- **Remanente y UI**: El remanente “en efectivo” antes de marcar cobro en tienda es `max(0, total − Σ bancos − Σ apps)` (misma función `orderCashToCollect` que el selector de pagos en borrador). Solo si ese remanente es **> 0** se ofrece marcar cobro en tienda (listado rápido, borrador sidebar, pestaña Pagos en detalle). Si transferencias/apps **cubren** el total, no se muestra esa opción. Si ya hay cobro en tienda registrado, el panel sigue visible para ver monto, editar o quitar. Los pagos banco/app adicionales siguen la regla complementaria: solo mientras el remanente tras efectivo en tienda sea > 0 (`canAddPayments` / `cashAmount` en borrador).
- **Invariante**: Σ pagos banco + Σ pagos app + monto efectivo en tienda ≤ total del pedido (el monto en tienda se valida entre 1 y el remanente permitido cuando se envía explícitamente). Si el usuario **solo** activa el flag (p. ej. checkbox) sin enviar `paidInStoreCashAmount` en el payload del store, se **conserva** un monto numérico ya fijado en el borrador (re-clamp al remanente); si no había monto fijado, se usa el remanente implícito (puede ser 0 si no queda pendiente).
- **Listado de pedidos**: En la columna Pagos se listan todos los medios registrados: transferencias, apps y, si aplica, una fila compacta de efectivo en tienda (monto, editar, quitar) **junto** con los electrónicos cuando el pedido combina ambos. Si no hay pagos electrónicos y tampoco está marcado cobro en tienda, se muestran atajos de transferencia rápida y el botón «Pagó?» cuando el remanente lo permite; si ya hay electrónicos y aún queda remanente, solo el atajo «Pagó?». Si solo hay efectivo en tienda (sin electrónicos), no se muestran atajos de transferencia rápida. Quitar el marcador de cobro en tienda vuelve a habilitar los atajos de transferencia en el caso sin electrónicos.
- **Detalle del pedido y borrador (sidebar)**: Con permisos de edición de pagos, el mismo patrón (monto, editar, quitar) aplica en la pestaña Pagos del detalle y en el borrador del sidebar; al crear el pedido se puede enviar un monto explícito de efectivo en tienda si se ajustó en el borrador.
- **Domiciliario / valor a cobrar**: El efectivo a cobrar en entrega es el remanente del total menos bancos, apps y el monto registrado como cobrado en tienda (si el flag está activo).

### Reglas de Liquidación

#### Liquidación de Apps
1. **Múltiples apps**: Se pueden liquidar múltiples app_payments juntos
2. **Bank payment**: Al marcar como `isSettled` se crea un `bank_payment` con ese valor
3. **Filtrado**: Apps se pueden filtrar por fecha y estado para liquidación masiva
4. **Resumen**: Admin y Superadmin ven resumen del dinero que debe tener cada banco/app

#### Gastos
- **Efectivo puro**: Si no hay `expense_bank_payment` → 100% efectivo
- **Movimientos internos**: Entre bancos y caja-bancos usando `bank_payment` (income) y `expense_bank_payment` (outcome)

### Cuadre de caja (total esperado global)
- **Fórmula esperada**: `(C0 + B0 + L0 + A0) + ventas del período − gastos del período + Σ abonos de reserva (en el período por `ReceivedAt`) cuyo **día de entrega/programación del pedido** en calendario Colombia no es hoy (`PrepareAt` si existe; si no, `CreatedAt`)`, donde `C0+B0+L0+A0` es la apertura del último cierre: efectivo contado + saldos reales por banco (incluye cuentas operativas, apps y caja mayor según bancos configurados) + snapshot de préstamos informales + **snapshot de apps pendientes por liquidar** (`A0`, JSON por app guardado en el cierre anterior). Si el cierre anterior no tenía snapshot de apps, `A0 = 0`. Los abonos siguen reflejándose en el esperado por banco; la suma al global ajusta el total esperado cuando la entrega de la reserva no cae en el día actual (CO).
- **Total contado al cerrar** (debe coincidir con el esperado): efectivo físico (`closingCash`) + suma de saldos reales por banco del cuadre + **suma actual de pagos vía app no liquidados** (pedidos entregados) + préstamos informales activos (`L1`). Los bancos incluyen la fila de caja mayor efectivo cuando aplique. El **pendiente en apps** no es un campo aparte que el usuario edita: se toma del sistema en el momento del cierre y se persiste como snapshot para `A0` del siguiente período.
- El esperado **no** “dobla” préstamos: el snapshot `L0` en apertura ya fija la parte de préstamos reconocida al cierre anterior; al cerrar se comparan préstamos activos actuales con el esperado global según la misma fórmula anterior. El API sigue devolviendo `informalLoansActiveTotal` y el desglose de apps pendientes para la UI.

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

### Reglas de Stock

#### Stock Ilimitado para Arroces
- **Categoría especial**: Productos cuya categoría contiene la palabra "arroz" (case-insensitive)
- **Stock siempre disponible**: Se consideran con stock ilimitado independientemente del valor en `stock`
- **UI adaptada**: ProductCard y ProductStock muestran "Disponible" siempre
- **No deshabilitados**: Nunca se deshabilitan por falta de stock
- **Lógica**: `product.category.name.toLowerCase().includes('arroz')`

#### Stock Normal
- **Control estricto**: Otros productos respetan el stock registrado
- **Estados visuales**: Disponible (verde), Bajo stock (amarillo), Agotado (rojo)
- **Deshabilitado**: Productos con stock 0 no se pueden agregar al pedido

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

### Reglas de Validación de Pedidos

Validaciones implementadas antes de enviar un pedido al backend:

#### Validaciones Generales
- **Al menos 1 producto**: El pedido debe tener al menos un producto
- **Suma de pagos**: Suma de pagos (app + bank) debe ser ≤ total del pedido
- **Status inicial**: Todos los pedidos nuevos se crean con `status: 'taken'`

#### Validaciones por Tipo de Pedido

**Onsite:**
- Al menos 1 producto

**Delivery:**
- Al menos 1 producto
- Cliente obligatorio
- Dirección obligatoria
- guestName obligatorio (auto-completado con nombre del cliente, editable)

**Reservation:**
- Al menos 1 producto
- Fecha y hora obligatorias (`reservedFor`)
- guestName obligatorio (auto-completado con nombre del cliente si existe, editable)

#### Feedback de Validación
- **Botón deshabilitado**: Si faltan requisitos
- **Tooltip dinámico**: Muestra el primer requisito que falta
- **Toasts secuenciales**: Lista todos los errores al intentar enviar
- **Colores de estado**: Rojo para errores, verde para éxito

### Validaciones Técnicas
- **Frontend**: Validación de formularios antes de envío (composable `useOrderValidation`)
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
- **Privacidad**: Ubicación disponible para admin, superadmin y domiciliario.

### Estados de Ubicación
- **Tracking activo**: Seguimiento en tiempo real de la ubicación
- **Tracking pausado**: Pausa del seguimiento (modo ahorro de batería)
- **Sin permisos**: Estado cuando no se han otorgado permisos de ubicación
- **Error de ubicación**: Manejo de errores de GPS/red

### App móvil domiciliarios (Flutter)

- **Pestaña «En preparación»**: muestra pedidos **delivery** con estado **Tomado** o **En preparación** (unión de dos consultas a `POST /orders/search` con el mismo criterio de tipo/estado que el resto del sistema; sin duplicados; si un id figurara en ambas listas, prevalece **En preparación**). **No** se aplica la regla de «Reservas hoy» de cocina (esa exclusión es solo para `type === reservation` en la web). El orden de la lista y de los bloques por barrio sigue la **ancla de urgencia** del repartidor: `prepareAt`, si no existe hora de `taken` en `statusTimes`, y si no `createdAt` (coherente con el semáforo en pantalla), de más a menos urgente.

### Listado de pedidos (/orders)

- **Filtros en servidor**: Estado, tipo, rango de fechas (día operativo Colombia vía API), banco con pago, app con pago, total por prefijo de dígitos y texto de búsqueda (cliente, teléfonos, invitado, notas, id) se aplican en `POST /orders/search`; la paginación y el total reflejan ese conjunto filtrado.
- **App (pagos)**: Igual que el filtro por banco: se elige una app; opcionalmente “solo app no liquidados” restringe a pedidos con al menos un `AppPayment` no liquidado (`is_setted = false`), y si hay app elegida solo cuentan líneas de esa app.
- **Debounce**: Los campos de texto que disparan la búsqueda (búsqueda y total por dígitos) usan un retardo corto (~300 ms) para no saturar el API; selects y fechas disparan la petición al cambiar.

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