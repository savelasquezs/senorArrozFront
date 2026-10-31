# Reglas de Negocio - Señor Arroz

## Asignación y cierre de rutas

- Caja, administración y superadministración asignan y reasignan desde Pedidos. El backend retira primero las rutas anteriores ya resueltas o vacías, con auditoría, sin exigir una toma desde la app. Las rutas con entregas pendientes se conservan.
- Una ruta cierra por regreso GPS después de haber salido, por iniciar otra ruta o por cierre de sesión, comprobando antes que no queden entregas pendientes. Un cierre no marca pedidos como entregados ni modifica cancelaciones.
- Si hay pendientes, el servidor rechaza iniciar otra ruta o cerrar sesión hasta entregarlos o reasignarlos. La web conserva las credenciales y muestra el motivo; solo navega al login después de la confirmación del servidor.

## Integración Rappi

- El servidor determina el ambiente; la configuración muestra Sandbox o Producción y conserva tiendas e historial separados por ambiente. No se ingresan credenciales OAuth desde el navegador.
- Cada tienda usa los identificadores entregados por Rappi. Se publica al padre seleccionado y las hijas heredan el menú. Los identificadores de tiendas con historial no se reemplazan desde el formulario.
- La bandeja Rappi pagina pedidos y muestra diagnóstico y reintento de READY únicamente cuando el servidor lo permite. Producción requiere autorización configurada en el backend.
- READY conserva un máximo de tres solicitudes por pedido. Un resultado incierto se muestra como Revisar en Rappi y no habilita reenvío; el reintento explícito de un rechazo confirmado conserva el contador y requiere presupuesto disponible.
- Los eventos fallidos se consultan sin payload ni contenido privado del proveedor. Solo se reintentan las operaciones que el backend declara recuperables; los reclamos legados y publicaciones ambiguas requieren revisión específica.

## Navegación y contexto de trabajo

- Las pantallas autenticadas comparten una sola cabecera, menú, control de almuerzo y conexiones globales durante la navegación. Cambiar de usuario, rol o contexto global de sucursal reinicia esa shell; la renovación del token de la misma identidad no la reinicia.
- Los ajustes visuales de cada pantalla (sin tarjeta o sin acceso rápido a pedidos) pertenecen a su ruta. Las rutas públicas conservan su presentación independiente.
- Navegar no fuerza la consulta de promociones ni integraciones. Guardar una promoción invalida su caché; el estado de integraciones se actualiza por contexto y periódicamente mientras la página está visible y en línea.
- El catálogo POS es independiente de búsquedas administrativas y completa todas sus páginas. Los productos de inventario estricto con disponibilidad pendiente no se pueden agregar; el fallo permite reintentar sin presentar stock desconocido como ilimitado. Catálogo vacío solo significa una respuesta válida sin productos.
- Agregar productos desde el detalle utiliza ese catálogo completo y sus categorías al abrir el selector, incluso entrando directamente al pedido. La disponibilidad corresponde a la sucursal del pedido; cargar o reintentar el selector no guarda cambios en el pedido. Carga, error recuperable y resultado vacío se muestran como estados distintos.
- El selector de productos del detalle comparte catálogo, agrupaciones, tarjetas, stock y filas editables con el POS. Su selección y filtros son locales: no crean pestañas, no cambian el borrador activo ni resuelven promociones del POS. Admite varias líneas y confirma un lote hacia la edición local; solo «Guardar cambios» persiste el pedido. Los productos ya incluidos permanecen identificados y su cantidad se edita en el detalle. Cancelar o vaciar una selección exige descartarla explícitamente; los errores y conflictos conservan la selección. El modal de escritorio conserva el ancho del sidebar y permite desplazamiento solo en las listas, con filtros, total y acciones visibles.
- En caja, el esperado se puede consultar antes de completar opciones bancarias y préstamos. El cierre permanece bloqueado mientras termina esa validación o si alguna lectura necesaria falla; actualizar permite recuperarla sin interpretar valores desconocidos como cero.

## Revisión de seguimiento de domiciliarios

- Los mapas consumen las estadías agrupadas entregadas por el API y ocultan por defecto sus puntos GPS centrales.
- La representación usa círculo amarillo semitransparente, marcador central con duración `mm:ss`/`hh:mm:ss` y detalle interactivo con contexto de sucursal y pedidos.
- Cada estadía muestra todos los destinos de su ruta aunque los pedidos no estén entregados; si no hay paradas en esa ruta, muestra los destinos de la ruta inmediatamente anterior del mismo domiciliario y sucursal.
- Cuando una estadía activa está en el extremo vivo del rango, el contador avanza cada segundo y el API se refresca silenciosamente cada 30 segundos. Un rango histórico no se refresca automáticamente.

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
| Cancelar pedidos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver todos los pedidos | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Gestión de Clientes** | | | | | |
| Crear clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editar clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Gestión Financiera** | | | | | |
| Gestión de bancos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestión de apps | ✅ | ✅ | ❌ | ❌ | ❌ |
| Liquidar apps | ✅ | ✅ | ❌ | ❌ | ❌ |
| Confirmar transferencias | ✅ | ✅ | ✅ | ❌ | ❌ |
| Desconfirmar transferencias | ✅ | ✅ | ❌ | ❌ | ❌ |
| Movimientos banco↔banco / banco↔efectivo | ✅ | ✅ | ✅ | ❌ | ❌ |
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
- **Pagos bancarios**: Puede verificar transferencias pendientes de su sucursal, pero no revertir una verificación
- **Movimientos bancarios**: Desde el cuadre puede consultar y registrar movimientos banco↔banco o banco↔efectivo de su sucursal

#### Kitchen
- **Notas por producto**: se muestran bajo su línea en pedidos activos y listos. Voz y notificaciones identifican cada nota por el nombre completo y la cantidad del producto, incluyendo pedidos nuevos, reservas, traslados y productos agregados o sustituidos. El producto se nombra una sola vez por línea y la nota se lee inmediatamente después, antes del siguiente producto. Las notas generales se anuncian por separado. Las ediciones anuncian si una nota se agregó, cambió o eliminó, nombrando su producto una sola vez; leen la indicación vigente hasta 400 caracteres por nota y no repiten notas eliminadas. Se conservan permisos, visibilidad por estado/horario y activación manual de voz.
- **Vista simplificada**: Solo ve pedidos en preparación
- **Estado limitado**: Solo puede cambiar pedidos a "Ready"
- **Filtrado**: Pedidos desaparecen de su vista al pasarlos a "Ready"
- **Cabecera en `/kitchen`**: Kitchen, Admin y Superadmin disponen del estado de conexión, activación de voz y Actualizar junto a las vistas. El único botón de voz identifica si está activa; no se duplica con un aviso permanente. Los errores de reproducción o sincronización permanecen visibles y permiten reintentar. Las pestañas se acomodan en dos columnas en móvil y envuelven en pantallas mayores, sin desplazamiento horizontal. Los estados vacíos usan textos breves con acentos correctos.
- **Modo combinado (solo UI)**: El interruptor «Modo combinado» va en la **misma franja que las pestañas** (solo con *Pedidos activos* seleccionado) para ahorrar altura. Se ocultan *Seleccionar todos* / *Limpiar*; la selección es por toque en las tarjetas. Se muestran juntos *Tomado* y *En preparación* en un solo bloque, agrupados por la categoría del primer ítem de cada pedido. La **fuente de verdad** del estado del pedido sigue siendo la API/BD. «Marcar como listo» en este modo, al confirmar, aplica consecutivamente las mismas transiciones que el flujo en dos pasos: *Tomado* → *En preparación* → *Listo* si aplica, o solo *Listo* si el pedido ya estaba *En preparación*. La preferencia se guarda en `localStorage` (`senorarroz.kitchen.combinedMode`). Los eventos en tiempo real (SignalR) y el refresco de listado se comportan igual que en el modo de dos secciones.
- **Impresión automática por sucursal**: En Configuración → Impresión, Admin y Superadmin eligen entre imprimir cuando Cocina marque el pedido como listo (`whenMarkedReady`, valor predeterminado) o al crear el pedido (`whenOrderCreated`). La opción incluye pedidos manuales y Rappi; las reservas futuras esperan hasta su hora de preparación. No afecta reimpresiones manuales ni pruebas de impresión.
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

- El acceso al portal web está bloqueado por defecto. Solo Superadmin puede habilitarlo o revocarlo individualmente desde la tabla de usuarios; una revocación se aplica en la siguiente solicitud web.
- Superadmin, Admin y Cashier conservan su acceso web; Kitchen requiere WebAccessEnabled. Esta autorización excepcional no sustituye el control de versión de la app Flutter.
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

- En `/orders`, un pedido en estado entregado muestra un indicador pequeño `Auto` cuando la entrega fue completada automáticamente por GPS según la auditoría del backend.

### Tipos de Pedido

#### Sucursal operativa del borrador

- Admin, Cajero y Superadmin pueden tomar un pedido para cualquier sucursal activa del mismo tenant sin cambiar `authStore.branchId` ni el contexto global de sucursal.
- `DraftOrder.workspaceBranchId` conserva la partición visual donde se abrió el tab; `DraftOrder.branchId` es independiente por borrador y determina la sucursal que prepara, cobra y despacha el pedido.
- La selección de sucursal que prepara y despacha está centralizada en el texto clickeable **Atender desde otra sucursal** del `OrderSidebar`, debajo del tipo de pedido. Aplica a `onsite`, `delivery` y `reservation`, incluso sin cliente ni dirección.
- La selección de sucursal no cambia la sucursal de sesión, el JWT ni `branchContext`; solo actualiza el borrador activo.
- Si la dirección existente no tiene cobertura en el nuevo destino, se limpia y debe seleccionarse una dirección cubierta. En recogidas `onsite` siempre se limpia dirección y el domicilio queda en 0.
- Cambiar la sucursal operativa recalcula el domicilio, invalida beneficios y medios de pago dependientes de sucursal, recarga configuración POS, bancos y apps, recalcula totales y persiste únicamente el borrador actual.
- Los formularios de dirección abiertos desde Pedidos no ofrecen un segundo selector de sucursal: usan el destino elegido en `OrderSidebar`; si una dirección solo está cubierta por otra sede, se pide cambiar la sucursal desde el panel. En el módulo independiente de Clientes permanece el selector de servicio de direcciones.
- `Customer.BranchId` conserva la sucursal legacy de origen del cliente y no cambia por la sucursal que atiende una dirección.
- Si el teléfono ingresado pertenece a un cliente existente de otra sucursal, el alta reutiliza ese cliente, conserva la dirección nueva y cambia únicamente el borrador actual a la sucursal que presta el servicio. La dirección exacta recién enviada tiene prioridad frente a otras direcciones cubiertas por esa sucursal.

#### Onsite (En el local)
- **Cliente**: Opcional
- **Dirección**: No aplica
- **Delivery Fee**: No aplica. Al pasar a onsite se eliminan dirección y costo de envío; al volver a delivery se debe elegir una dirección con cobertura en la sucursal seleccionada. Las reservas no cambian el envío solo por el selector de tipo.
- **guestName**: Obligatorio para recogidas de otra sucursal, incluso sin cliente registrado; opcional en pedidos onsite locales como antes.
- **Fidelización**: Se aplica si se asigna cliente
- **Status inicial**: `'taken'`

#### Delivery (A domicilio)

- **Tarifa en el detalle**: Admin y Superadmin pueden editar el domicilio de pedidos `delivery` y reservas con dirección desde un único editor en el resumen de Productos. Se guarda explícitamente, admite $0 y conserva horarios y abonos cuando solo cambia la tarifa. El modal de cliente conserva sus permisos existentes y también admite la tarifa de reservas con dirección. Las reservas sin dirección no muestran editor de domicilio. La navegación entre secciones conserva las ediciones locales; editar productos bloquea temporalmente el editor de tarifa.
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
- **Programación en POS y detalle**: la reserva se prepara y entrega en la misma fecha de negocio. Ambos flujos reutilizan `OrderScheduleFields`: una fecha común, hora de preparación y hora de entrega. Cambiar preparación propone entrega una hora después; la entrega admite ajuste manual y conserva el mínimo existente de 40 minutos. La sugerencia nunca pasa silenciosamente al día siguiente. El API conserva los dos instantes UTC `prepareAt` y `reservedFor`.

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
- **Producto gratis por beneficio**: si el borrador contiene una línea de regalo agregada por promo diaria, fidelización o código promocional, al mensaje anterior se añade el producto gratis y la pregunta **«¿Deseas algo de tomar?»**. No se infiere el beneficio solamente por tener precio cero.
- **Descuento porcentual por beneficio**: si la promo diaria, fidelización o código aplica un porcentaje, el mensaje comienza con **«Hoy tienes {porcentaje}% de descuento»**, informa el valor final —domicilio incluido cuando aplica— como **«en total pagas {total}»** y conserva el tiempo o fecha de entrega correspondiente.
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

Admin y Superadmin pueden cambiar un pedido desde cualquier estado hacia cualquier otro estado. Para pasar a `CANCELLED` se conserva el flujo de cancelación con motivo y gestión de pagos asociados.

1. **TAKEN → IN_PREPARATION**: Solo Admin, Kitchen
2. **IN_PREPARATION → READY**: Solo Kitchen
3. **READY → ON_THE_WAY**: Solo Deliveryman, Admin
4. **ON_THE_WAY → DELIVERED**: Solo Deliveryman, Admin
5. **Cualquier estado → CANCELLED**: Admin, Superadmin y Cajero (requiere motivo)
- **Reserva con horario** (`prepare_at` y `reserved_for`): Admin/Superadmin/Cajero pueden cancelar según las reglas vigentes de `CancelOrderHandler`; POS: `useOrderPermissions.canCancel`.

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
- **Permisos de edición (banco/app, montos)**: Admin, Superadmin y Cajero pueden modificar pagos del pedido cuando el **día calendario en Colombia** coincide con el de **`createdAt`** **o**, si existe, con el de **`prepareAt`** (caso típico: reserva registrada días antes y pago el día de preparación). Superadmin no tiene esa limitación. Backend: `OrderBusinessRulesService.CanModifyPayments`; POS: `useOrderPermissions.canEditPayments`.

#### Efectivo cobrado en tienda (`paid_in_store_cash`)
- **Quién puede marcar, ajustar monto o quitar**: Admin, Superadmin y Cajero (misma autorización que el endpoint `PUT /orders/{id}/paid-in-store-cash`).
- **Remanente y UI**: El remanente “en efectivo” antes de marcar cobro en tienda es `max(0, total − Σ bancos − Σ apps)` (misma función `orderCashToCollect` que el selector de pagos en borrador). Solo si ese remanente es **> 0** se ofrece marcar cobro en tienda (listado rápido, borrador sidebar, pestaña Pagos en detalle). Si transferencias/apps **cubren** el total, no se muestra esa opción. Si ya hay cobro en tienda registrado, el panel sigue visible para ver monto, editar o quitar. Los pagos banco/app adicionales siguen la regla complementaria: solo mientras el remanente tras efectivo en tienda sea > 0 (`canAddPayments` / `cashAmount` en borrador).
- **Invariante**: Σ pagos banco + Σ pagos app + monto efectivo en tienda ≤ total del pedido (el monto en tienda se valida entre 1 y el remanente permitido cuando se envía explícitamente). Si el usuario **solo** activa el flag (p. ej. checkbox) sin enviar `paidInStoreCashAmount` en el payload del store, se **conserva** un monto numérico ya fijado en el borrador (re-clamp al remanente); si no había monto fijado, se usa el remanente implícito (puede ser 0 si no queda pendiente).
- **Listado de pedidos**: En la columna Pagos se listan todos los medios registrados: transferencias, apps y, si aplica, una fila compacta de efectivo en tienda (monto, editar, quitar) **junto** con los electrónicos cuando el pedido combina ambos. Mientras exista remanente y no se haya registrado efectivo en tienda, se mantienen disponibles el botón «Pagó?» y todos los atajos de transferencia rápida, aunque ya existan pagos bancarios o por app. Cada nueva transferencia rápida propone como monto el saldo pendiente (`total − Σ bancos − Σ apps`). Si solo hay efectivo en tienda, no se muestran atajos de transferencia rápida; al quitar ese registro vuelven a habilitarse mientras exista saldo.
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
- **Cajero en gastos**: Puede entrar al módulo, crear comprobantes, crear nuevos conceptos del catálogo de gastos y ver el historial. Solo puede **editar** comprobantes cuyo `createdAt` caiga en el **día calendario actual de `America/Bogota`**. Únicamente Admin y Superadmin pueden editar/eliminar conceptos o eliminar comprobantes.
- **Cajero y barrios**: Puede crear barrios desde el selector de dirección para su propia sucursal. Editar o eliminar barrios sigue reservado a Admin y Superadmin.
- **Promoción del día**: El cajero puede establecer la promoción del día cuando no exista una activa para la fecha actual en Colombia. Si ya existe, solo puede modificarla o desactivarla cuando él mismo sea su creador; en los demás casos la ve en modo lectura. El modal no permite escoger fechas: aplica automáticamente la ventana de hoy entre las 05:00 y las 23:59:59 de Colombia. Las fechas permanecen en el contrato para una futura programación de promociones.
- **Productos de la promoción**: El selector de regalo muestra solo productos activos de la categoría compartida `Regalos`; los descuentos específicos muestran productos activos del catálogo compartido. El modal carga todas sus páginas al abrir, sin depender de la lista administrativa. Distingue carga, error con reintento y catálogo sin regalos; solo permite guardar una configuración válida y conserva el formulario ante errores. Productos y categorías se comparten entre las sucursales del mismo negocio y el backend no puede rechazarlos por la sucursal asociada históricamente a su categoría. Si no existen regalos, el selector queda vacío y no ofrece productos de otras categorías.
- **IVA en gastos**: El IVA 19 % puede marcarse para todas las líneas desde el atajo global o individualmente por fila. El total de IVA y de la factura solo usa las líneas seleccionadas y la elección se conserva al editar.
- **Auditoría monetaria**: En pedidos y gastos solo se auditan eventos con impacto monetario o de caja. En pedidos se conservan cancelación y eliminación; las modificaciones de líneas se consolidan por edición y solo aparecen como merma si el total final disminuyó. El detalle informa hora Colombia, usuario, productos sustituidos y cantidades modificadas. Al eliminar una factura de gasto completa (`ExpenseHeader`), el trigger conserva antes del borrado en cascada el proveedor, domiciliario, total, IVA, notas, líneas, pagos bancarios y el abono vinculado. El abono `ExpenseOffset` propio de esa factura se elimina atómicamente y el snapshot completo aparece en el correo de auditoría del cierre.
- **Alertas en la auditoría diaria**: Solo se incluyen GPS apagado, permiso de ubicación retirado y permanencias que requieren revisión, incluidas las pendientes de clasificación administrativa. Falta de comunicación, ubicaciones offline sincronizadas y jornada posterior al cierre siguen visibles en Alertas de seguimiento, pero no se envían en el resumen diario.
- **Disparo de auditoría**: El resumen monetario se envía desde el cuadre de caja solo una vez por sucursal y día calendario Colombia. Lo reciben el Admin activo de la sucursal y los Superadmin activos. Admin y Superadmin lo consultan en el historial de cuadres; Cashier no.

- **Listado de gastos (`/expenseheaders`)**: Los filtros por rango de fechas, proveedor, banco, categorÃ­a y texto de nombre del gasto se aplican en servidor; la paginaciÃ³n y el total reflejan ese conjunto filtrado.
- **LÃ­neas filtradas**: Si el filtro incluye categorÃ­a o texto de nombre de gasto, cada factura devuelve solo las `expenseDetails` que coinciden para que la grilla no muestre lÃ­neas fuera del criterio.
- **Debounce**: Los filtros escritos del listado de gastos usan debounce corto (~300 ms); selects, fechas y orden consultan inmediatamente.

### Cuadre de caja (total esperado global)
- **Fórmula esperada**: `(C0 + B0 + L0 + A0) + ventas del período − gastos del período + Σ abonos de reserva (en el período por `ReceivedAt`) cuyo **día de entrega/programación del pedido** en calendario Colombia no es hoy (`PrepareAt` si existe; si no, `CreatedAt`)`, donde `C0+B0+L0+A0` es la apertura del último cierre: efectivo contado + saldos reales por banco (incluye cuentas operativas, apps y caja mayor según bancos configurados) + snapshot de préstamos informales + **snapshot de apps pendientes por liquidar** (`A0`, JSON por app guardado en el cierre anterior). Si el cierre anterior no tenía snapshot de apps, `A0 = 0`. Los abonos siguen reflejándose en el esperado por banco; la suma al global ajusta el total esperado cuando la entrega de la reserva no cae en el día actual (CO).
- **Total contado al cerrar** (debe coincidir con el esperado): efectivo físico (`closingCash`) + suma de saldos reales por banco del cuadre + **suma actual de pagos vía app no liquidados** (pedidos entregados) + préstamos informales activos (`L1`). Los bancos incluyen la fila de caja mayor efectivo cuando aplique. El **pendiente en apps** no es un campo aparte que el usuario edita: se toma del sistema en el momento del cierre y se persiste como snapshot para `A0` del siguiente período.
- El esperado **no** “dobla” préstamos: el snapshot `L0` en apertura ya fija la parte de préstamos reconocida al cierre anterior; al cerrar se comparan préstamos activos actuales con el esperado global según la misma fórmula anterior. El API sigue devolviendo `informalLoansActiveTotal` y el desglose de apps pendientes para la UI.
- Un préstamo sin banco es de efectivo y conserva la fórmula actual. Uno asociado a un banco normal activo descuenta su saldo pendiente del esperado de ese banco, sin crear movimientos ni modificar el saldo general de Bancos.
- Los abonos directos reducen el préstamo y recuperan el esperado del banco de origen. No generan movimientos de caja ni bancarios. Los abonos convertidos en gasto no recuperan ese esperado; la baja manual sí recupera el saldo restante.
- Cada cierre guarda por banco la deducción acumulada por préstamos para aplicar solo su variación en el período siguiente.
- Desde cada fila de banco puede abrirse el detalle de sus préstamos activos e históricos; los saldos en cero se identifican como `Liquidado` y las bajas con saldo como `Dado de baja`.
- Un abono puede registrarse como nuevo gasto. El total del comprobante se aplica al préstamo de forma atómica, sin pagos bancarios ni compras de inventario. Admin y Superadmin consultan el historial completo y el préstamo se inactiva al quedar en cero.

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

### Reservas con abonos o transferencias

- Al cancelar una reserva que tenga abonos (`reservationDeposits`) y/o transferencias bancarias (`bankPayments`), la UI debe mostrar confirmación indicando que también se eliminarán esos registros asociados.
- Al modificar una reserva desde los modales de edición de cliente/dirección o tipo/horario, si existen abonos y/o transferencias, la UI debe pedir confirmación antes de guardar.
- Si el usuario confirma la operación, el backend elimina todos los abonos de reserva y transferencias bancarias asociados al pedido.

## 🏪 Gestión de Sucursales

### Configuración de Sucursal
- **Única por sucursal**: Solo 1 admin por sucursal; cocina admite empleados personales y pantalla compartida
- **Impresoras**: Configuración inicial incluye impresoras
- **Reglas de fidelización**: Configurables por sucursal
- **Acceso**: Usuarios solo ven datos de su sucursal (excepto superadmin)

### Productos por Sucursal
- **Categorías**: Cada sucursal tiene sus propias categorías de productos
- **Stock**: Control de inventario por sucursal
- **Precios**: Precios dinámicos por sucursal
- **Activos**: Productos pueden activarse/desactivarse por sucursal
- **Pedidos web**: Cada categoría define explícitamente si se usa como arroz, combo, bebida, adición o si permanece oculta. Los productos públicos definen presentación y orden web; las fichas comerciales agrupan sus presentaciones.
- **Control editorial**: Una ficha vinculada a arroces o combos debe tener fotografía oficial y descripción antes de publicar el storefront.

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

### Rendimiento de domiciliarios

- El rendimiento de domiciliarios se presenta en la sección existente Dashboard → Domicilios, dentro de MainLayout y la sesión real de Admin/Superadmin. Usa el cliente autenticado habitual y los endpoints normales del dashboard; Admin conserva su sucursal y Superadmin puede filtrar el reporte. La sección se puede abrir con `/dashboard?section=domicilios`; cambiar de sección conserva el layout, filtros y conexiones, mientras que cambiar la sucursal de trabajo mantiene el reinicio de contexto habitual. En Domicilios la navegación existente se muestra compacta arriba y los filtros de fecha/sucursal se presentan una sola vez dentro del panel. La página de vista previa no es necesaria para usar esta sección.

- Domicilios muestra siete KPIs y siete gráficas de puntualidad, tiempos y capacidad. Sucursal y domiciliario filtran todo el bloque. Todos permite comparar el equipo o ver su evolución; uno muestra su historia.
- El filtro «Periodo» del encabezado permite elegir un rango completo y se sincroniza con el periodo global de Admin/Superadmin. Consulta nuevamente el API usando inicio y fin del día Colombia, preservando sucursal, domiciliario y exclusión de miércoles. El nuevo rango recalcula todo el bloque y sus comparaciones; respuestas de consultas anteriores no reemplazan la más reciente.
- La distribución de escritorio usa siete tarjetas en una fila y tres columnas de gráficas; etapas e historial tienen desplazamiento interno para mantener el resumen en una pantalla. En móvil el contenido fluye verticalmente. El mapa de la lista compacta se abre como vista previa flotante por hover/foco o en diálogo por clic/toque.
- Las siete gráficas permiten ampliarse en un diálogo con la misma información, filtros y referencia del resto del equipo. El detalle muestra descripciones completas y más espacio para etiquetas; incluye el desglose de etapas. Puede cerrarse con el botón, Escape o el fondo, devuelve el foco al botón de apertura y ocupa la pantalla en móvil.
- «Excluir miércoles» inicia activado por el cierre de ese día y puede desactivarse. Recalcula todo el bloque y la comparación anterior según calendario Colombia, sin ocultar pedidos del martes por tener timestamp UTC del miércoles.
- El desglose de etapas muestra promedios en minutos, tamaño de muestra y barras legibles. La salida registrada o, si falta, el primer En camino válido constituyen una salida real para separar espera y entrega; regreso va desde la última entrega hasta el regreso registrado. Omite rutas y filas sin fechas completas y ordenadas; una duración válida de cero se conserva.
- KPIs: entregados, rutas a tiempo, minutos por ruta, minutos por pedido, minutos/km (GPS o estimación), pedidos/ruta y entrega P90. Se muestran muestras y comparación con el periodo anterior equivalente; el cambio de SLA se expresa en puntos porcentuales.
- El volumen distingue pedidos asignados, entregados, En camino y otros pendientes (por ejemplo, un pedido asignado que volvió a preparación), y muestra el total de rutas separado en cerradas, en curso y con regreso pendiente. La lista incluye todos esos estados del periodo, incluidos regresos que no quedaron registrados aunque sus pedidos estén entregados. Una ruta sin regreso se puede consultar, pero no aporta duración completa, SLA, minutos/km, etapas ni pedidos por ruta cerrada. Los tiempos propios de sus pedidos entregados sí se conservan. La gráfica de volumen identifica explícitamente las rutas cerradas. Nunca se simula un regreso ni se suman pedidos pendientes al KPI de entregados.
- Sin un domiciliario seleccionado, el KPI de rutas a tiempo identifica al equipo completo; la gráfica de comparación identifica explícitamente que cada barra corresponde a un domiciliario. Ambos usan el mismo criterio de SLA sobre su respectiva muestra, sin promediar porcentajes de empleados.
- La misma tarjeta muestra el porcentaje de rutas con retraso como complemento del porcentaje a tiempo, con los mismos filtros y muestra de SLA. Los porcentajes visibles suman 100 % con el redondeo de presentación. Sin rutas evaluables o porcentaje disponible se omite la contraparte; nunca incluye rutas sin SLA.
- Solo con un domiciliario seleccionado, rutas a tiempo, minutos por ruta, minutos por pedido y minutos/km se comparan contra el promedio del equipo, con valor y diferencia absoluta (SLA en puntos porcentuales). Sus gráficas muestran al domiciliario y una línea punteada del equipo por fecha. La referencia excluye al seleccionado y respeta sucursal, fechas y exclusión de miércoles. Al seleccionar todos desaparece esa referencia; los demás KPIs conservan la comparación anterior.
- La referencia individual se identifica como «Resto del equipo». Si no hay muestras válidas de los demás, se muestra sin datos y sin comparación; nunca se usan las propias del seleccionado como respaldo.
- Salida física, reloj operativo del SLA y espera de despacho se distinguen. Sin evidencia se muestra «—» y no se conectan periodos sin datos. Los kilómetros planificados nunca se presentan como recorrido GPS real.
- Los regresos fuera de la jornada se marcan inconsistentes y no aportan duración de ruta, minutos/km ni etapas, en periodo actual/anterior, evolución y comparación del equipo. Se valida contra la jornada de la ruta o, en rutas antiguas sin vínculo, la jornada del mismo tenant, sucursal y domiciliario que contiene la salida. El regreso no puede superar el cierre real ni el límite de esa jornada. Sin jornada identificable, salida y cierre deben pertenecer al mismo día Colombia. Una jornada válida puede cruzar medianoche; no se descartan tiempos por un umbral arbitrario de duración. El historial y detalle conservan el cierre original, muestran la inconsistencia y no dibujan un regreso estimado sin confirmar. Los conteos de rutas, pedidos, tiempos propios de pedidos y SLA persistido se conservan; se publica la cantidad excluida y no se corrigen fechas en la base de datos.
- Duración por ruta incluye salida registrada → regreso o, si falta salida registrada, primer En camino válido de sus pedidos → regreso. La asignación pone los pedidos En camino y representa una salida real. Una sola serie y el KPI muestran la media de todas las muestras válidas, sin etiquetas ni conteos de referencia; comparación anterior y resto del equipo usan el mismo criterio. No altera GPS, SLA ni los tiempos propios de pedidos.
- Minutos/km usa GPS suficiente o, en su ausencia, distancia planificada de ida más regreso como estimación. La gráfica separa turquesa «GPS» y ámbar punteado «Estimación planificada», también al ampliar. El KPI usa el ratio agregado de las mismas rutas y muestra cuántas muestras son estimadas; la comparación del resto del equipo aplica el mismo criterio. El tiempo usa la salida real hasta el regreso. Distancias o tiempos incompletos no se convierten en cero; no se presentan estimaciones como GPS real.
- Tiempo por pedido y P90 usan las fechas propias del pedido `En camino → Entregado`, independientemente de las rutas, que conservan sus métricas propias. Una fecha ausente o un intervalo invertido no aporta muestra válida.
- Últimas rutas es una lista con paginación, vista previa por hover/foco en escritorio y detalle por clic/teclado/toque. Su botón de ampliación abre un diálogo con las mismas rutas filtradas: lista desplazable y paginación a la izquierda, recorrido, tiempos y pedidos de la ruta seleccionada a la derecha. Cambiar de ruta actualiza el detalle dentro del mismo diálogo; no abre diálogos anidados. En móvil se apilan lista y detalle. Reutiliza el detalle habitual, carga bajo demanda y conserva cierre con Escape y restauración de foco. El mapa conserva segmentos GPS respaldados, sin conectar huecos. Si no hay ningún segmento GPS, puede unir destinos con coordenadas y hora válidas por orden de entrega, incluyendo la sucursal cuando sus tiempos son compatibles. Este recorrido se identifica como estimado y usa línea punteada; no confirma calles, kilómetros ni velocidad. La numeración coincide entre mapa y lista. Las paradas sin hora o coordenadas suficientes permanecen visibles, fuera del trazado estimado.
- El diálogo de recorrido muestra el tiempo total desde la salida hasta el regreso. La salida usa `DepartedAtUtc` o, si falta, el primer En camino válido de sus pedidos. Ambos casos son salidas reales y se presentan con el mismo título. Cada pedido y su marcador usan siempre su propio `onTheWayAtUtc → deliveredAtUtc`, igual que gráficas, KPIs y P90, mostrando ambas horas. Sin En camino válido no se sustituye por la salida de ruta. No sobrescribe fechas guardadas ni modifica GPS o SLA. Fechas ausentes, inválidas o invertidas se muestran como no disponibles; cero es válido.
- En la estimación, la sucursal inicia el trayecto hacia la primera entrega incluso si falta la hora de salida; se declara como origen inferido y no se inventan horas ni duraciones. Las flechas por tramo y el itinerario `Sucursal → 1 → 2 → … → Sucursal` aclaran el sentido. Se omite un origen con hora registrada incompatible y el regreso exige una fecha compatible.
- El recorrido se carga bajo demanda, con caché acotada y protección ante respuestas de filtros anteriores. La vista previa local consulta una copia de Docker por un intermediario de lectura restringido a loopback y endpoints del dashboard; las credenciales permanecen en el proceso local, fuera del navegador. Los archivos de datos y de revisión quedan fuera de Git y de la compilación de producción.

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
- **Cliente con pedido en misma fecha (confirmación previa)**: Antes de enviar un pedido con cliente, si ya existe otro pedido del mismo cliente en la misma fecha calendario (zona `America/Bogota`), el sistema pide confirmación. Para la comparación se usa `prepareAt` cuando el pedido actual tiene `prepareAt`; en caso contrario se usa `createdAt`. Si el usuario cancela, no se crea el pedido.

#### Validaciones por Tipo de Pedido

**Onsite:**
- Al menos 1 producto
- Nombre de quien recoge obligatorio (`guestName`) solo cuando el destino de onsite es otra sucursal, haya o no cliente registrado

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
- **Permisos**: Admin, Superadmin y Cajero pueden cancelar. El Cajero queda limitado a pedidos de su propia sucursal.

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

- La aplicación se instala y actualiza exclusivamente desde Google Play.
- El backend valida versión, build y package de Flutter. Vue no consulta ni mantiene información de releases; sus enlaces solo abren la ficha oficial de Google Play.

- **Pestaña «En preparación»**: muestra pedidos **delivery** con estado **Tomado** o **En preparación** (unión de dos consultas a `POST /orders/search` con el mismo criterio de tipo/estado que el resto del sistema; sin duplicados; si un id figurara en ambas listas, prevalece **En preparación**). **No** se aplica la regla de «Reservas hoy» de cocina (esa exclusión es solo para `type === reservation` en la web). El orden de la lista y de los bloques por barrio sigue la **ancla de urgencia** del repartidor: `prepareAt`, si no existe hora de `taken` en `statusTimes`, y si no `createdAt` (coherente con el semáforo en pantalla), de más a menos urgente.

### Listado de pedidos (/orders)

- **Filtros en servidor**: Estado, tipo, rango de fechas (día operativo Colombia vía API), banco con pago, app con pago, total por prefijo de dígitos y texto de búsqueda (cliente, teléfonos, invitado, notas, id) se aplican en `POST /orders/search`; la paginación y el total reflejan ese conjunto filtrado.
- **Cola de verificación de transferencias**: En el modo de verificación, las transferencias pendientes se ordenan por monto ascendente y, al verificar una transferencia, la cola se actualiza localmente con una transición sin recargar los pedidos.
- **Catálogos de pago**: Los atajos bancarios y los filtros de bancos/apps usan las opciones completas de la sucursal cargadas en sus stores, independientemente de la página administrativa consultada. En pedidos de otra sede se conservan las opciones autorizadas del pedido destino.
- **App (pagos)**: Igual que el filtro por banco: se elige una app; opcionalmente “solo app no liquidados” restringe a pedidos con al menos un `AppPayment` no liquidado (`is_setted = false`), y si hay app elegida solo cuentan líneas de esa app.
- **Debounce**: Los campos de texto que disparan la búsqueda (búsqueda y total por dígitos) usan un retardo corto (~300 ms) para no saturar el API; selects y fechas disparan la petición al cambiar.
- **Pestaña Reservas**: Carga `150` registros por página y prioriza por `prepareAt` para mostrar primero las reservas que deben empezar a prepararse antes; el contenedor de tabla mantiene scroll interno con encabezado visible para no desbordar el viewport.

## 📱 Reglas de UI/UX

### OrderSidebar compacto

- En toma de pedidos, el catálogo y el contenido del sidebar tienen scroll independiente dentro del espacio disponible bajo la cabecera. Buscar o filtrar productos no cambia el tamaño del sidebar ni desplaza la página; sus pestañas, total y acciones permanecen visibles. La shell respeta la configuración visual de cada ruta sin agregar una tarjeta exterior al POS.
- El tipo de pedido usa tres opciones del mismo ancho y conserva la navegación nativa con teclado. Cliente, dirección, destinatario y productos permanecen arriba; la sucursal operativa se cambia desde un texto clickeable que muestra el destino cuando es otra sede y permite volver al origen. Conserva el mismo alcance por borrador y los reinicios vigentes al cambiar sucursal.
- Programación, pagos, facturación y notas se sitúan después de los productos. La programación se despliega inicialmente en reservas o pedidos para más tarde; plegarla no borra horarios. Pagos inicia plegado, muestra si hay registros y conserva sus editores al plegarse. El destinatario fiscal y la confirmación de emisión mantienen su comportamiento; bajar el acceso no activa facturas automáticamente.
- El total, copiar direcciones, copiar mensaje y Enviar pedido permanecen en el pie visible, fuera del scroll. Copiar direcciones conserva las condiciones existentes de disponibilidad y su formato de texto. Las notas generales usan el mismo modal que las notas de producto, con Guardar y Cancelar. Cambiar de pestaña cierra el editor sin trasladar el texto a otro pedido. Los campos de destinatario validan al perder el foco y mantienen los requisitos de envío.
- La tarjeta del cliente en `CustomerSection` comparte una fila para cambiar cliente, nombre clickeable que abre el detalle y teléfonos. `PhoneNumberItem` ofrece copiar, llamar y WhatsApp al pasar el puntero, enfocar con teclado o tocar el número; Escape cierra las acciones. Conserva el segundo teléfono y la validación vigente del acceso a WhatsApp. El cambio se aplica a todos los usos de la tarjeta compartida, sin duplicar esa interfaz en el sidebar.
- Las tarjetas compactas de cliente y dirección conservan teléfonos, acciones, tarifa, avisos de ubicación y selección entre todas las direcciones, sin selector adicional de sucursal. La dirección seleccionada usa una fila compartida: cambiar a la izquierda solo si hay varias, texto clickeable para editar, tarifa pequeña en color y cruz roja para quitar la selección; los textos largos conservan el contenido completo en el tooltip y en el formulario. En pantallas pequeñas catálogo y sidebar se apilan sin ancho horizontal adicional.
- En el sidebar, fidelidad se resume a la derecha de la sucursal (`5 entregas más → 5% dcto` o `Hoy → premio`), con el mensaje completo en el tooltip. Cliente y dirección se apilan sin el rótulo Dirección; Recibe/Recoge comparte línea con su campo y los productos omiten la cabecera de unidades y Limpiar. El conteo permanece en el pie fijo.

### Detalle de pedido compacto

- El aviso de pedido desactualizado exige una versión de gestión mayor para ese mismo pedido o un `ORDER_VERSION_CONFLICT` real. Volver a la pestaña, recuperar conexión o una falla de red no bastan: se comprueba la versión sin reemplazar el pedido ni sus borradores. Las notificaciones repetidas, antiguas o de otros pedidos no activan el aviso. Durante un guardado propio se espera su respuesta y el aviso desaparece si el snapshot ya incorpora la versión notificada. Los demás conflictos de negocio conservan su mensaje específico.

- Información, Productos y Pagos se muestran simultáneamente. En escritorio, cliente/entrega/programación ocupan una columna lateral y productos/importes/pagos la principal. En móvil se apilan y los accesos de sección desplazan sin desmontar contenido ni descartar borradores.
- El seguimiento muestra estados y horas en formato compacto; el historial de pedidos entregados/cancelados inicia plegado. Se conservan permisos y confirmaciones para cambiar estados.
- El seguimiento incluye una línea tenue de tiempos en minutos completos: preparación desde `prepareAt` válido si existe, o la marca Tomado, hasta Listo; entrega desde En camino hasta Entregado; total desde la misma referencia inicial hasta Entregado, incluyendo la espera para despacho. Si el pedido alcanzó Listo/Entregado antes de su hora programada, usa Tomado como referencia real. Si falta una marca, es inválida o el final sigue siendo anterior al inicio, muestra `—` en lugar de inventar una duración. En recogidas sin etapa En camino se omite el tiempo en entrega.
- Los horarios actuales y las notas existentes permanecen visibles. Cada sección tiene un lápiz que abre el mismo modal centrado con Guardar y Cancelar, mostrando las notas o los tres campos de programación según corresponda. Perder el foco no guarda; cancelar conserva los valores anteriores y vaciar las notas permite quitarlas. Un error conserva el borrador para reintentar. Guardar horarios mantiene la confirmación de cocina y Preparar ya conserva su confirmación. Los beneficios se despliegan al necesitarlos. Cambiar sucursal y Cancelar pedido se agrupan en Más acciones, conservando sus permisos y confirmaciones.
- Cada producto tiene un lápiz compacto para agregar, editar o borrar su nota en el modal compartido de notas, tanto en el detalle como en OrderSidebar. En el detalle conserva los permisos de edición de productos; durante una edición conjunta, la nota se incorpora al borrador hasta Guardar Cambios. En el sidebar se guarda en el borrador de su pestaña. Cancelar no modifica la nota y un error conserva el texto para reintentar. Editar notas no modifica cantidades, precios ni descuentos.
- Los productos omiten descripciones iguales al nombre y ocultan la columna de descuento manual cuando todas sus líneas están sin descuento manual, excepto durante edición. El porcentaje y su importe COP se muestran en una sola línea, con el importe en texto menor y atenuado. El domicilio gratis se muestra en su propia columna, con un importe por celda; solo las notas reales agregan una segunda línea al producto.
- La fila Descuentos mantiene el desglose `domi gratis · otros` junto al total, incluso si alguna parte es $0. Solo presenta los importes calculados con los datos guardados; no reactiva beneficios ni reclasifica descuentos al cambiar el tipo de pedido. Más acciones contiene Ver ubicación con la misma condición existente: pedido delivery en camino y usuario distinto de domiciliario. Cambiar sucursal y editar programación conservan sus restricciones por estado y rol.
- El descuento de producto se edita como porcentaje de `cantidad × precio unitario`, igual que en OrderSidebar, tanto en las líneas existentes como al agregar un producto. El API sigue recibiendo COP enteros. Cambiar cantidad o precio conserva el porcentaje; el reparto de domicilio gratis se mantiene separado y no permite subtotales negativos. Guardar sin tocar un porcentaje redondeado conserva el descuento monetario histórico exacto.
- Pagos inicia plegado y se puede desplegar y plegar sin desmontar sus editores; al plegar conserva visible el saldo por cobrar. Su resumen centra los bloques de bancos/apps, total y saldo. Conserva montos, verificación, liquidación y acciones autorizadas. Los bloques vacíos no reservan espacio; los controles para agregar pagos permanecen disponibles cuando corresponde. Facturación se accede desde Más acciones y conserva su panel de detalle, estados fiscales y confirmaciones.

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

## Facturación electrónica

- Al confirmar una factura desde el POS o el detalle, una tarjeta global y minimizable muestra el estado real y continúa al cambiar de pantalla, pedido o cliente. Solo las solicitudes iniciadas en esta sesión descargan automáticamente el PDF, una vez por seguimiento, después de la validación DIAN y de que el archivo esté disponible; un fallo de descarga permite reintentar sin emitir otro documento. Las reservas esperan la entrega. Cerrar o cambiar la sesión elimina el seguimiento y cancela sus descargas pendientes.
- El POS no muestra el botón flotante lateral de regreso a WhatsApp, aunque el navegador conserve una conversación previa. El acceso del menú y la barra superior continúa disponible.

- El detalle presenta las reglas de rechazo DIAN en líneas separadas. Reintentar una factura rechazada confirma el envío de datos corregidos con el mismo consecutivo; consultar una pendiente solo solicita reconciliación. El backend calcula el DV del NIT sin agregar requisitos al formulario.

- Más acciones → Factura electrónica despliega al pasar el puntero o al pulsarlo dos opciones: Datos de facturación y Enviar factura electrónica. Si faltan datos para una nueva factura, Enviar permanece deshabilitado y explica mediante tooltip que primero deben configurarse. Los documentos existentes conservan acceso a su avance, archivos y reenvío con el destinatario histórico, incluso si no hay un destinatario actual seleccionado o falla la disponibilidad de emisión. Crear una nueva factura abre productos, cantidades, descuentos, domicilio, pagos registrados y total antes de confirmar. Un pedido desactualizado bloquea la confirmación hasta recargarlo. El historial usa el snapshot fiscal, nunca importes actuales para representar documentos anteriores.
- El avance distingue solicitud, transmisión a Plemsi, validación DIAN y correo aceptado por el proveedor. Transmitir no confirma recepción DIAN; aceptar correo no confirma entrega al buzón. PDF/XML se descargan cuando el archivo oficial está disponible; una falla de correo no invalida la factura.

- Completar con datos DIAN lee `customerName` y `customerEmail` de Plemsi según el tipo y número indicados. Muestra el resultado junto al botón, conserva los valores manuales si no hay datos y descarta respuestas de otra identificación o cliente. La consulta no guarda destinatarios ni emite documentos.

- Si Plemsi devuelve el último consecutivo nulo, Superadmin puede confirmar expresamente un número disponible tras verificar DIAN y el proveedor anterior. La activación registra actor, fecha y respuesta. No permite reutilizar números conocidos ni omitir rango o vigencia; la numeración debe dedicarse al sistema.

- La indisponibilidad de facturación ofrece continuar con Solo pedido, sin emisión silenciosa. La activación vuelve a consultar Plemsi y valida resolución, prefijo, rango, vigencia y un consecutivo confirmado; no se infiere desde el inicio del rango.
- La emisión real requiere además ElectronicInvoicing__ProductionEnabled=true en el servidor; el valor por defecto es false. El detalle fiscal muestra el destinatario histórico del documento y el reenvío conserva ese correo.

- Configuración y correo empresarial pertenecen al tenant, compartidos por sucursales y administrados por Superadmin. Plemsi es el primer proveedor; emisión real desactivada hasta completar y validar la cuenta.
- El directorio fiscal pertenece al negocio y se comparte entre sucursales. Un destinatario puede asociarse a varios clientes; cada cliente admite varios y un predeterminado. El modal compartido se abre desde el cliente, OrderSidebar y detalle del pedido. Guardar datos no emite facturas ni modifica documentos históricos.
- Sin datos fiscales completos, Enviar pedido conserva el flujo actual; con datos se sugiere y exige confirmación explícita. No hay emisión automática a consumidor final.
- Pedido y solicitud se guardan atómicamente. Las llamadas a Plemsi ocurren después del commit. Una falla fiscal no revierte un pedido creado. Reservas/programados emiten al entregarse.
- Emitida exige validación DIAN y CUFE/CUDE. Un timeout se reconcilia consultando el mismo consecutivo, nunca generando otro documento. El estado del correo es independiente.
- Solo Admin/Superadmin autorizan nota crédito total. La cancelación operativa puede dejar anulación fiscal pendiente. Una factura aceptada necesita nota crédito antes de corregir importes; los documentos impiden eliminar definitivamente el pedido.
- Se conserva tratamiento inicial sin IVA ni INC, importes persistidos y descuentos/domicilio. Los archivos fiscales se guardan privados bajo aislamiento tenant y se descargan con autorización de pedido.
- La aplicación entrega PDF personalizado y XML validado mediante Resend; Plemsi no envía correos. El correo del tenant recibe respuestas (Reply-To) y el remitente usa una dirección verificada del sistema. Se conserva la entrega histórica de Plemsi sin reenviarla automáticamente. El reenvío exige confirmación y se bloquea mientras esté en cola o por verificar.
- Detalles de instalación, endpoints y pruebas: docs/ELECTRONIC_INVOICING.md del backend.
- El PDF se representa desde el XML validado, con CUFE/CUDE y QR en todas sus páginas. Los documentos nuevos incorporan los descuentos en precios finales y omiten todas las líneas cuyo neto sea cero, conservándolas en el pedido; el domicilio permanece separado. Los documentos históricos mantienen sus importes y medio de pago del XML. El historial nuevo dispone de líneas fiscales congeladas; la vista previa del pedido sigue mostrando el descuento operativo antes de confirmar.
- El último paso distingue en cola, aceptado para envío, entregado, rebotado, demorado, no entregado, marcado como spam y por verificar. Solo muestra entrega/rebote con confirmación firmada de Resend del intento más reciente; entregado significa aceptación por el servidor del destinatario, no lectura. Muestra fecha y motivo reales del evento. Consulta automáticamente mientras espera confirmación de envíos recientes, pausa en segundo plano y se detiene al recibir un resultado terminal. Un resultado desconocido o una demora bloquean reenvío para evitar duplicados. La validación DIAN y los archivos permanecen disponibles aunque falle el correo; no se inventan confirmaciones históricas ni se vuelve a enviar para consultar estado.

## Almuerzos del personal

- Cada empleado registra salida y regreso con su contraseña personal; las horas oficiales son UTC del servidor. Un intervalo abierto determina el descanso, persiste entre sesiones y no se cierra automáticamente.
- Cocina admite varios empleados activos sin acceso web y cuentas de pantalla compartida con acceso web. Solo las primeras registran almuerzos, desde la pantalla de su sucursal. Se conservan IDs, gastos y nómina; no se reactivan ni convierten cuentas automáticamente.
- Una cuenta personal almorzando no puede realizar mutaciones operativas. Puede consultar, finalizar el almuerzo, mantener seguimiento/dispositivo/jornada y cerrar sesión. Admin/Superadmin no corrigen registros mientras su propio almuerzo esté abierto.
- Un domiciliario no puede iniciar almuerzo con pedidos pendientes ni recibir pedidos mientras almuerza. La disponibilidad y los avisos de pedidos lo excluyen; PostgreSQL serializa almuerzo/asignación por empleado incluso ante propuestas antiguas.
- El almuerzo no cierra la jornada ni suspende GPS: los puntos se conservan y sincronizan. Su intervalo se excluye del análisis de permanencias y no cuenta como silencio de comunicación. Al regresar rigen los requisitos GPS existentes de disponibilidad.
- Historial en el menú Almuerzos, por fecha Colombia y sucursal dentro del tenant. Cajero y Admin consultan su sucursal; Superadmin consulta la sucursal seleccionada. Cocina solo consulta sus empleados personales de hoy desde su pantalla. Solo Admin/Superadmin pueden corregir, con motivo, versión vigente y auditoría antes/después, sin solapamientos ni fechas futuras.
- Script aditivo e idempotente: SenorArroz.Infrastructure/Scripts/add_employee_lunch.sql, antes del backend y las interfaces. Sin cambios automáticos de nómina ni dependencia de facturación electrónica.

## Identidad visual de facturación
Las confirmaciones anteriores al webhook pueden consolidarse por mantenimiento únicamente tras comprobar ID, destinatario y documento en el panel autenticado de Resend. Se identifica el origen y se omite la fecha si no se conoce con precisión; no se simulan webhooks ni se reenvía el correo para consultar estado.
Superadmin configura logo y nombre comercial por tenant, compartidos entre sucursales y proveedores, sin desactivar la integración fiscal. PNG/JPG de máximo 500 KB, vista previa proporcional y confirmación de guardado. Cada versión se conserva para los documentos que la utilizaron. Las nuevas solicitudes requieren identidad. El PDF y correo muestran la identidad del restaurante y conservan razón social/NIT fiscales. Guardar identidad no emite ni reenvía documentos.

## Empresas y destinatarios compartidos
El modal busca por nombre comercial, razón social o identificación en el directorio del negocio. Un NIT nuevo se consulta en DIAN mediante Plemsi y completa los campos disponibles; se registra al guardar. No se inventa correo ni nombre comercial cuando el proveedor no los devuelve. Registros existentes se reutilizan sin consultar DIAN ni exigir proveedor activo. Buscar por NIT permite completar datos desde el mismo buscador; también se consulta al salir del campo NIT vacío de nombre, conservando la edición manual.

Recordar para el cliente guarda el perfil compartido y su asociación/predeterminado. Guardar en el negocio lo registra sin asociarlo. Solo para este pedido no guarda ni modifica perfiles. El destinatario seleccionado pertenece al borrador actual y cambiar de cliente elimina la selección anterior. Ediciones compartidas exigen confirmación, conservan la identificación y detectan versiones obsoletas; actualizan accesos abiertos y cachés de otros clientes sin cambiar sus predeterminados ni documentos históricos. Datos anteriores distintos para un mismo NIT se muestran para revisión.

El buscador de clientes y el listado admiten empresa/NIT y muestran las empresas asociadas, conservando el alcance de sucursal. El detalle compartido del cliente muestra Factura a junto a sus datos y permite reutilizar una empresa de otro empleado. Dirección fiscal y dirección de entrega son independientes. Las búsquedas paginadas usan espera de 250 ms y descartan respuestas antiguas, de modales cerrados o de otra sesión.

La disponibilidad del POS usa la sucursal operativa del borrador. La consulta forOrderCreation exige rol de gestión y sucursal activa del mismo tenant; el catálogo de productos compartido conserva sus recetas y se cruza con los saldos de esa sede. Las consultas administrativas conservan su alcance anterior.
