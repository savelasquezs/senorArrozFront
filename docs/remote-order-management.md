# Gestión de pedidos enviados a otras sucursales

- En Pedidos se reutiliza `OrdersTable` y el detalle existente. Las pestañas `Pedidos de {sucursal}` contienen solo pedidos cuyo origen inmutable es el espacio de trabajo actual y cuyo destino es esa sucursal; nunca todos sus pedidos.
- `remoteOnly` y `branchId` son filtros; la API deriva el origen de la sesión y valida cada recurso. No cambiar `authStore.branchId`, `branchContext` ni sus catálogos compartidos al abrir una pestaña remota.
- Clientes, productos, precios, pagos, abonos, estados, cancelaciones y asignaciones conservan las restricciones de rol, fecha, integración y estado de los pedidos normales. Inventario, medios de pago, tarifa y cola de impresión pertenecen a la sucursal destino.
- Opciones de operación, impresión y seguimiento se consultan mediante el ID del pedido autorizado. El mapa reutilizado recibe solo el pedido y su domiciliario/ruta actual; no se abre la gestión financiera de domiciliarios de otra sede.
- Las mutaciones envían `X-Order-Id` y `X-Order-Version` del objeto que el operador está editando. Un 409 conserva el formulario y solicita actualizar; no reintentar con una versión nueva a escondidas. Las versiones de respuesta actualizan únicamente ese objeto.
- Las notificaciones invalidan la lista de origen sin suscribir al usuario a toda la sede destino. Si hay un formulario abierto se pospone la recarga; el detalle informa que cambió sin descartar lo escrito. Reconexión y regreso a la pestaña solicitan sincronización.
- La verificación por pedido está disponible. Las acciones masivas de todo un banco y los consolidados que afectan otros pedidos no se ejecutan desde una pestaña remota.
- La procedencia de pedidos anteriores al cambio es desconocida: no se infiere usando la sucursal actual de quien los tomó. Esos pedidos siguen accesibles desde su destino, pero no aparecen como enviados.

Despliegue coordinado: primero aplicar `SenorArroz.Infrastructure/Scripts/add_remote_order_management.sql` con usuario de mantenimiento, luego publicar el backend y finalmente este frontend. Este PR no ejecuta el SQL ni despliega.

## Componentes reutilizados

`OrdersList.vue` conserva la tabla y los modales existentes; el contexto de consulta es local a la vista. `OrderManagementApi` obtiene pestañas y opciones por recurso. `OrderTrackingDialog.vue` reutiliza `DeliveryMap` con consultas de un solo pedido, actualizaciones cada 30 segundos solo mientras está abierto/visible/en línea y limpieza al cerrarlo. `useOrderManagementUpdates` escucha invalidaciones del grupo de origen ya autorizado. `orderMutationConfig` liga cada escritura al ID/versión del formulario, sin caché global de versiones ni cambio de sucursal.
