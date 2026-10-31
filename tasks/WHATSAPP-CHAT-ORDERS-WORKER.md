# WhatsApp: bandeja multiasesor, pedidos integrados y procesamiento independiente

Fecha: 2026-10-30.
Estado: etapas 0 y 1 en curso; contratos documentados e infraestructura implementada en rama aislada, con validación técnica de esta entrega completada; cierre operativo pendiente. Este archivo es el plan transversal de frontend y backend.

## Objetivo

Atender las líneas global y de sucursales desde una bandeja compartida, tomar y soltar conversaciones, completar pedidos sin salir del chat y conservar la toma de pedidos entre sucursales. Separar el procesamiento de WhatsApp del proceso HTTP principal para administrar sus recursos, recuperación y despliegue de forma independiente.

## Decisiones aprobadas

- Mantener una API principal de negocio y extraer un ejecutable/servicio worker de WhatsApp, preferentemente dentro de la solución C# existente. La primera entrega no incorpora otra API pública completa de chats.
- Mantener un único motor de clientes, cotización, pedidos, beneficios, pagos, inventario, cocina e impresión. El worker no implementa un segundo motor comercial.
- Mantener PostgreSQL como fuente de verdad y primera opción para trabajo persistente y outbox; no añadir un broker o una segunda base de datos sin una necesidad comprobada.
- Reutilizar los componentes, helpers y composables del POS. Separar el núcleo del editor de su presentación y del pedido activo global; evitar copiar OrderSidebar.
- Guardar los borradores manuales en el servidor. El almacenamiento del navegador será una ayuda de recuperación, no la autoridad compartida.
- Conservar el número global por API y habilitar coexistencia oficial App Business + Cloud API en los números de sucursal elegibles. La conexión de cada línea debe validarse; la configuración actual no acredita coexistencia.

## Reglas que deben conservarse

1. Línea de WhatsApp, asesor, sucursal de trabajo/origen, enrutamiento de la conversación y sucursal de preparación del pedido son conceptos distintos.
2. Un cajero de Santander puede conservar la conversación y tomar el pedido para otra sucursal autorizada. El número propio de una sucursal tampoco obliga a preparar allí todos sus pedidos.
3. OriginBranchId se determina en el servidor desde la sucursal de trabajo. BranchId define preparación, inventario, rutas, impresión, venta y cobro. No se cambia la sucursal global del usuario para tomar un pedido remoto.
4. Cambiar el destino del borrador no transfiere la conversación ni libera al asesor. Una transferencia explícita del enrutamiento del chat conserva sus reglas actuales; ambas acciones deben tener contratos distintos.
5. Una conversación puede conservar pedidos históricos de diferentes sucursales. El destino pertenece a cada pedido; no se fija para siempre desde el chat.
6. Una transferencia de atención o de enrutamiento no modifica silenciosamente la sucursal de un pedido ya confirmado. Su traslado utiliza el flujo existente de gestión de pedidos.
7. Permisos por tenant, rol, conversación y pedido se validan en el servidor. La toma entre sucursales no concede acceso general a caja, bancos, usuarios, GPS ni conversaciones ajenas.
8. Transferir el chat no cambia el número remitente. Un cliente que escribe a dos líneas tiene conversaciones distintas y puede compartir su identidad comercial autorizada.
9. Cambiar de chat, cerrar una pestaña o perder conexión no libera automáticamente la atención. Soltar, transferir, cerrar y devolver a IA son acciones independientes.
10. Estado de atención, progreso del pedido, mensajes no leídos y necesidad de respuesta se calculan por separado. Leer no equivale a atender.
11. Pedido tomado exige un pedido confirmado por el servidor. Crear el pedido y entregar su confirmación por WhatsApp son resultados independientes.
12. Laboratorio, sandbox y evaluaciones permanecen aislados. Este plan no convierte sus cambios locales o resultados históricos en comportamiento productivo validado.

## Base identificada y puntos de entrada

Trabajo de etapas 0/1: backend en C:/Users/LENOVO/Documents/ChatGPT/Señor arroz real/.work/whatsapp-api y frontend/plan en C:/Users/LENOVO/Documents/ChatGPT/Señor arroz real/.work/whatsapp-front. Ambos usan feat/whatsapp-worker-stage01 desde origin/main. El checkout C:/Users/LENOVO/source/repos/SenorArroz/senorArrozAPI contiene el laboratorio y no debe usarse para editar esta implementación.

| Área | Puntos de entrada |
|---|---|
| Pantalla y bandejas | src/views/WhatsAppView.vue, src/utils/whatsappInbox.ts |
| Estado, contratos y solicitudes | src/store/whatsapp.ts, src/types/whatsapp.ts, src/services/MainAPI/whatsappApi.ts |
| Borradores y editor POS | src/store/ordersDrafts.ts, src/components/orders/OrderSidebar.vue, src/components/orders/OrderProductCatalog.vue |
| Lógica reutilizable | src/composables/useOrderSubmission.ts, useOrderValidation.ts, useOrderItems.ts y helpers de pedidos |
| Confirmaciones | src/composables/useWhatsAppOrderConfirmation.ts y acción de envío en OrderSidebar.vue |
| Entrada HTTP y atención | SenorArroz.API/Controllers/WhatsAppController.cs, SenorArroz.Domain/Services/WhatsAppAttentionService.cs |
| Procesamiento y eventos | SenorArroz.API/Services/WhatsAppAiWorkQueue.cs, WhatsAppAutomaticMessageSender.cs, WhatsAppNotificationService.cs, WhatsAppCommerceFlowService.cs, SenorArroz.API/Hubs/WhatsAppHub.cs |
| Pedidos y persistencia | SenorArroz.Application/Features/Orders/Commands/CreateOrderHandler.cs, WhatsAppConversation.cs y configuraciones EF relacionadas |
| Reglas y esquema | docs/BUSINESS_RULES.md, docs/PROJECT_MAP.md, docs/DATABASE_MAP.md, docs/MULTITENANT_PLAN.md, local-init-completo.sql |

La revisión previa ejecutó siete archivos de pruebas del frontend: 41 pruebas aprobadas. Es una referencia de la base actual, no una validación de las funciones de este plan.

## Etapa 0 — Contratos, permisos y línea base

Dependencias: ninguna.

- [ ] Verificar el estado actual de main, despliegues y esquemas; identificar trabajo local de laboratorio para no mezclarlo con esta implementación.
- [x] Documentar la matriz de acceso: canal central, canal de sucursal, cola sin sede, responsable asignado, supervisor y pedidos originados para otra sede.
- [x] Revisar los controles que hoy vinculan BranchId del pedido a OperationalBranchId del chat o a la línea y documentar su adaptación acotada. Implementarla junto al borrador versionado en etapa 4; no retirar controles sin ese recurso autorizado.
- [x] Definir contratos separados para destino del borrador, transferencia del chat, transferencia de asesor y traslado de un pedido confirmado. Resolver la diferencia con la regla actual que libera al asesor al transferir el enrutamiento.
- [x] Definir una sesión comercial con un borrador activo inicial por conversación, versiones y una clave de confirmación estable; permitir múltiples pedidos históricos.
- [x] Definir cómo comparten o entregan el borrador la IA, el Flow y el asesor. La confirmación de un mismo intento comercial debe materializar como máximo un pedido, cualquiera que sea su origen.
- [x] Inventariar tareas externas y herramientas comerciales que ejecuta hoy WhatsApp. Separar cuáles van al worker y cuáles deben invocar el motor de negocio de la API principal.
- [ ] Medir CPU, memoria, conexiones y consultas PostgreSQL, latencia p50/p95, tamaño de respuestas, backlog y volumen real de mensajes/asesores. Registrar condiciones y carga de prueba.
- [ ] Acordar presupuestos de rendimiento reproducibles para cambio de chat, primera carga, webhook y propagación en tiempo real; registrar línea base antes de fijar objetivos definitivos.

Criterio de salida: contratos y matriz documentados; escenario Santander → otra sede cubierto para línea central y línea de sucursal; línea base con evidencia medible.

## Etapa 1 — Trabajo persistente y extracción del worker

Dependencias: etapa 0.

- [x] Diseñar trabajo persistente y outbox reutilizando lo existente donde corresponda. Guardar evento/trabajo de forma atómica; confirmar el webhook después de su aceptación durable.
- [ ] Mantener validación de firma, resolución segura de canal/tenant y límites de entrada en la API. Mover procesamiento prolongado, multimedia, sincronización, IA y envíos fuera de la solicitud HTTP.
- [x] Implementar reclamación de trabajos en PostgreSQL con exclusión entre procesos, vencimiento recuperable, intentos limitados, próximo intento e incidencias que requieran intervención.
- [ ] Mantener orden y exclusión por conversación, conservando concurrencia acotada entre conversaciones. Resolver tenant desde datos persistidos y ejecutar cada trabajo en su contexto autorizado.
- [ ] Definir claves únicas por evento, mensaje, acción automática y sesión comercial; tolerar reentregas y caídas entre persistencia y notificación.
- [x] Crear el ejecutable worker y configuración por rol de proceso. Evitar que API y worker ejecuten accidentalmente los mismos consumidores al desplegar o retroceder versiones.
- [x] Migrar las herramientas comerciales que lo requieran a un contrato interno autenticado de la API principal, reutilizando los handlers existentes. Conservar actor, sucursal de origen, permisos e idempotencia; no aceptar ese contexto desde datos públicos de Meta.
- [x] Revalidar modo de atención y generación/versión antes de despachar una respuesta automática; descartar trabajo invalidado por una toma humana.
- [x] Comunicar los cambios del worker a la API mediante eventos persistidos. La API emite SignalR a grupos autorizados; un IHubContext dentro del worker por sí solo no alcanza a los clientes conectados a otro proceso.
- [x] Definir entrega de eventos para la réplica actual y reconciliación por cursor. Antes de habilitar varias réplicas HTTP, asegurar fanout a todas las conexiones; una cola de consumidores competidores no sustituye broadcast.
- [x] Mantener recuperación después de reinicios y envío de resultado incierto: conciliar antes de repetir acciones que Meta pudo haber aceptado.
- [ ] Añadir métricas de edad del trabajo, profundidad de cola, duración, reintentos y errores sin contenido sensible en logs.

Criterio de salida: API y worker arrancan por separado; reiniciar el worker no reinicia la API; el trabajo durable se recupera; se conservan orden, aislamiento, eventos y ausencia de duplicados en pruebas de caída/reentrega.

## Etapa 2 — Coexistencia y múltiples líneas

Dependencias: etapas 0 y 1. Si faltan permisos externos de Meta, avanzar en las etapas independientes usando transporte de prueba.

- [ ] Verificar propiedad, elegibilidad y permisos de la aplicación o proveedor para conectar una línea Business existente mediante coexistencia oficial.
- [ ] Implementar la conexión guiada y diagnóstico por línea: pendiente, conectada, sincronizando, degradada o desconectada. Conservar el canal global API existente.
- [ ] Procesar los eventos oficiales aplicables de mensajes del celular, historial y contactos, incluidos smb_message_echoes, history y smb_app_state_sync, según el contrato vigente verificado al implementar.
- [ ] Separar mensajes históricos de mensajes nuevos: importar historial no debe disparar IA, ausencia, avisos ni pedidos nuevos.
- [ ] Deduplicar por canal e identidad del mensaje. No fusionar conversaciones de números distintos ni atribuir un mensaje del celular a un empleado sin evidencia.
- [ ] Identificar intervenciones desde la app Business, notificar al responsable y aplicar la política de pausa de automatización. La exclusividad del sistema no bloquea el envío desde el celular.
- [ ] Mostrar ventana de atención y plantillas disponibles según reglas vigentes de Meta; obtener su estado desde el servidor.
- [ ] Validar multimedia, límites de sincronización, recuperación de desconexión y requisitos operativos con una línea piloto.

Criterio de salida: mensajes de entrada, salida por API y salida desde el celular aparecen correctamente en el mismo canal; historial sin efectos comerciales; limitaciones reales registradas.

## Etapa 3 — Atención multiasesor y bandejas

Dependencias: etapas 0 y 1.

- [ ] Sustituir la clasificación ambigua por vistas Libres, Míos, Equipo y Cerrados. Sin sede operativa es un filtro de enrutamiento separado.
- [ ] Implementar toma atómica y versionada en PostgreSQL. Dos asesores que toman simultáneamente obtienen un único responsable; el otro recibe conflicto con el estado actualizado.
- [ ] Eliminar la reasignación implícita al enviar mensajes. Verificar responsabilidad y permisos también en respuestas rápidas, menú, multimedia, cambios de cliente y acciones comerciales.
- [ ] Implementar Soltar, Transferir asesor, Transferir enrutamiento, Cerrar, Reabrir y Devolver a IA con autorización, auditoría y eventos diferenciados.
- [ ] Dar lectura o supervisión según permisos sin permitir edición paralela del borrador. Una toma forzada autorizada debe ser explícita y auditable.
- [ ] Modelar necesidad de respuesta humana con independencia de UnreadCount y de los marcadores de lectura individuales o compartidos definidos en la etapa 0.
- [ ] Notificar al responsable y grupos anteriores/nuevos sin seguir entregando contenido a usuarios que perdieron acceso.
- [ ] Preservar selección, filtros y atención al cambiar de chat, perder conexión o volver a la aplicación.

Criterio de salida: pruebas simultáneas de dos asesores; toma, liberación y transferencia sin apropiación silenciosa ni pérdida de acceso legítimo al pedido remoto.

## Etapa 4 — Borrador comercial compartido y pedidos entre sucursales

Dependencias: etapas 0, 1 y 3.

- [ ] Persistir el borrador completo por sesión/conversación: cliente, destino, modalidad, dirección, productos, indicaciones, beneficios, programación, pagos y datos de facturación cuando correspondan.
- [ ] Guardar automáticamente con versión; rechazar escrituras obsoletas y evitar que una respuesta tardía sobrescriba otro chat. Mostrar guardado pendiente, guardado correcto y conflicto.
- [ ] Conservar el borrador al transferir o soltar; no aplicar el límite de cinco pestañas del POS al número de conversaciones con borrador.
- [ ] Aplicar selección de sucursal de preparación sin transferir chat ni asesor. Revalidar catálogo, precios, disponibilidad, cobertura, domicilio, beneficios y medios de pago del destino; explicar cambios antes de confirmar.
- [ ] Reutilizar clientes por tenant, CustomerPhone y AddressBranch; evitar resolver identidad o cobertura únicamente por la sucursal de origen del cliente.
- [ ] Confirmar mediante el motor existente, validando permisos, versión, responsable y clave comercial compartida dentro de la operación transaccional. Doble clic, timeout o confirmación concurrente de IA/Flow/asesor deben devolver el mismo resultado comercial.
- [ ] Conservar OriginBranchId y BranchId y todas las reglas de cocina, impresión, inventario y cobro en destino. No mover dinero ni modificar el contexto global del cajero.
- [ ] Actualizar el estado comercial y vincular el pedido confirmado antes de encolar su mensaje. Diferenciar resumen previo de confirmación real; retirar el texto de pedido confirmado sobre borradores.
- [ ] Mostrar Pedido tomado · número de pedido aunque el mensaje de confirmación esté pendiente o falle; reintentar el envío sin crear otro pedido.
- [ ] Reutilizar gestión remota con versiones del pedido confirmado; un conflicto no se resuelve reenviando silenciosamente con una versión nueva.
- [ ] Definir continuidad tras cierre, cancelación y nuevo pedido; conservar historial sin reutilizar la clave de un pedido anterior.

Criterio de salida: cajero de Santander toma desde cualquiera de sus líneas autorizadas un pedido para otra sede; mantiene el chat, cambia de conversación y recupera el borrador; confirmación única y operación comercial en destino verificadas.

## Etapa 5 — Editor integrado y experiencia de atención

Dependencias: etapas 3 y 4; etapa 2 para pruebas reales de coexistencia.

- [ ] Extraer el núcleo reutilizable del editor para recibir un identificador de borrador explícito. Mantener el POS funcionando con sus pestañas sin acoplar el chat a currentTabId.
- [ ] Crear el panel compacto de pedido usando catálogo, líneas, cliente/dirección, pagos, beneficios, programación y validación existentes. Extraer lógica compartida a helpers/composables cuando corresponda.
- [ ] Implementar tres columnas ajustables en escritorio y navegación conversación/pedido en pantallas pequeñas; conservar mensajes y edición al alternar.
- [ ] Mostrar línea remitente, responsable, sucursal de atención y sucursal que prepara. Dar especial visibilidad al pedido para otra sucursal.
- [ ] Mantener total y Confirmar pedido visibles, indicando requisitos faltantes sin sacar al asesor del chat.
- [ ] Conservar borrador de mensaje y adjuntos por conversación para evitar envíos al contacto equivocado al cambiar de chat. Capturar destinatario e identificador antes de cualquier operación asíncrona.
- [ ] Mantener respuestas rápidas, multimedia y menú; incluir notas internas diferenciadas que nunca se envíen a Meta como mensajes al cliente.
- [ ] Mostrar distintivos comerciales: Sin iniciar, En proceso, Esperando cliente, Pedido tomado y Sin venta/Cancelado. No convertir todas las consultas informativas en ventas pendientes.
- [ ] Agrupar Requieren acción, Esperando cliente y Gestionados. Los pedidos por completar permanecen arriba de los gestionados; una nueva pregunta sobre un pedido tomado vuelve a requerir atención sin crear un borrador automáticamente.
- [ ] Preservar scroll al cargar historial y ofrecer Nuevos mensajes cuando el asesor no esté al final. Mostrar errores recuperables y estados de conexión/guardado.

Criterio de salida: completar un pedido con todas las opciones aplicables sin abandonar el chat; cambiar entre dos conversaciones sin mezclar cliente, mensaje, adjuntos, sucursal, productos o pagos; regresión del POS aprobada.

## Etapa 6 — Rendimiento y validación integral

Dependencias: etapas 1 a 5 para aceptación completa. Medir y corregir durante cada etapa, no solo al final.

- [ ] Reemplazar el corte actual de 200 conversaciones por paginación con cursor y orden estable. Aplicar permisos, prioridad y filtros en el servidor antes del límite; un pendiente antiguo debe seguir siendo accesible.
- [ ] Optimizar proyecciones e índices a partir de consultas medidas. Evitar N+1 al mostrar responsables, último mensaje, borrador y pedido asociado.
- [ ] Usar eventos incrementales y una conexión compartida por hub; reconciliar al reconectar. Mantener fallback condicionado por visibilidad, actividad y estado de conexión.
- [ ] Limitar caché de conversaciones y mensajes; cancelar solicitudes obsoletas y deduplicar carga. Virtualizar cuando la medición lo justifique.
- [ ] Cargar miniaturas y multimedia bajo demanda, reservar dimensiones y conservar el proveedor de almacenamiento vigente salvo necesidad documentada.
- [ ] Ejecutar pruebas de integración PostgreSQL para toma simultánea, versiones, reclamación de trabajo, aislamiento, doble confirmación y recuperación tras caída.
- [ ] Probar con dos asesores/navegadores: cambio de destino, transferencia, envío concurrente, pérdida de red, respuesta tardía y reentrega del mismo evento.
- [ ] Probar convivencia de IA, Flow, celular y asesor sobre una misma sesión sin confirmaciones comerciales duplicadas ni mensajes automáticos obsoletos.
- [ ] Probar acceso denegado entre tenants, sucursales sin autorización y usuarios que perdieron la asignación, tanto por HTTP como por eventos.
- [ ] Medir con la carga acordada el p95 del POS junto con el del chat, CPU/RAM, conexiones, bloqueo SQL, edad de cola y propagación de eventos. Comparar contra la línea base y los presupuestos de la etapa 0.
- [ ] Ejecutar checks requeridos de frontend y backend, build y pruebas funcionales afectadas. Registrar comandos, ambiente, resultados y limitaciones; no reutilizar cifras históricas como evidencia nueva.

Criterio de salida: matriz funcional aprobada con evidencia, sin duplicados en los escenarios de concurrencia y sin regresión material del POS bajo la carga acordada.

## Etapa 7 — Despliegue gradual y recuperación

Dependencias: etapas anteriores aprobadas técnicamente; disponibilidad de la línea piloto.

- [ ] Actualizar BUSINESS_RULES, PROJECT_MAP, DATABASE_MAP y contratos conforme se implemente cada etapa. Conservar este checklist como seguimiento transversal.
- [ ] Preparar scripts SQL aditivos/idempotentes y actualizar local-init-completo.sql. Aplicar y verificar el esquema antes del código que lo necesita; seguir el procedimiento vigente del repositorio.
- [ ] Añadir configuración independiente de API y worker, límites de concurrencia, permisos mínimos y health checks separados de vida y preparación.
- [ ] Activar primero en desarrollo/pruebas con API y worker separados. Verificar que el worker real no use transporte local del laboratorio.
- [ ] Preparar corte coordinado de consumidores: detener o deshabilitar los anteriores, recuperar trabajos existentes y habilitar el worker sin doble procesamiento.
- [ ] Mantener flags por tenant/línea para bandeja, editor y coexistencia; la activación de la nueva pantalla no habilita por sí sola IA o Flows.
- [ ] Ejecutar piloto con una sucursal, un destino remoto y dos asesores; ampliar después al resto de sedes y al canal global según resultados.
- [ ] Verificar producción mediante estados y métricas, con pruebas comerciales en entorno controlado. No crear pedidos ni movimientos de caja de prueba sobre operación real sin alcance específico.
- [ ] Documentar rollback: desactivar nueva interfaz o pausar worker, conservar mensajes/borradores/trabajos, reasignar consumidores sin solapamiento y mantener conciliación de envíos inciertos. No eliminar esquema ni datos para retroceder.
- [ ] Registrar versiones desplegadas, salud, cola y resultados del piloto. Separar implementación local, publicación y validación productiva en el cierre de cada etapa.

Criterio de salida: piloto verificado y despliegue gradual con ruta de recuperación comprobada; atención y pedidos entre sucursales conservados.

## Orden de ejecución y seguimiento

0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Si la conexión de Meta está pendiente, continuar 3, 4 y 5 con transporte de prueba después de 1, dejando pendiente la aceptación real de 2.

Cada entrega debe registrar aquí cambios, pruebas, evidencia, riesgos pendientes y estado de publicación. No marcar una etapa completa únicamente porque compile o porque exista una pantalla.

| Etapa | Estado inicial | Evidencia para cerrar |
|---|---|---|
| 0. Contratos y línea base | En curso: contratos listos, medición parcial | Matriz, contratos y mediciones |
| 1. Persistencia y worker | En curso: base implementada; cierre pendiente | Dos procesos, recuperación, eventos y deduplicación |
| 2. Coexistencia | Pendiente | Línea piloto y sincronización real |
| 3. Atención multiasesor | Pendiente | Dos asesores y conflictos controlados |
| 4. Borradores y pedidos | Pendiente | Confirmación única y operación entre sedes |
| 5. Editor y UX | Pendiente | Pedido completo dentro del chat y regresión POS |
| 6. Rendimiento y validación | Pendiente | Carga reproducible y matriz integral |
| 7. Despliegue gradual | Pendiente | Versiones, piloto y recuperación |

## Mejoras posteriores, fuera de la primera entrega

- Evaluar autoasignación por disponibilidad/carga después de medir la toma manual.
- Evaluar una API independiente de conversaciones cuando existan necesidades demostradas de despliegue, clientes o escalado separados.
- Evaluar un broker/backplane adicional si PostgreSQL o el fanout entre múltiples réplicas dejan de cubrir los objetivos medidos.
- Evaluar edición colaborativa de un mismo borrador solo si aparece una necesidad operativa; inicialmente existe un responsable editor y supervisión autorizada.


## Avance de implementación — etapas 0 y 1

- Rama aislada en ambos repositorios: `feat/whatsapp-worker-stage01`.
- Bases remotas: backend `d4435e7`, frontend `e2d1087`. Checkouts de trabajo: `.work/whatsapp-api` y `.work/whatsapp-front` dentro del espacio de esta conversación.
- El checkout original del backend conserva su rama del laboratorio y sus cambios locales. No se copiaron esos cambios a esta rama ni se utilizaron sus bases para las pruebas.
- Contratos, matriz de permisos, inventario de responsabilidades, configuración y línea base parcial: `docs/WHATSAPP_PROCESSING_STAGE01.md` en la rama del backend.
- Se conserva `OriginBranchId`/`BranchId` y el motor de pedidos actual. Cambiar destino del borrador y transferir el enrutamiento del chat quedan expresamente separados en los contratos.
- Implementados: webhook validado con aceptación durable, particiones por línea/contacto, payload cifrado, deduplicación, reclamación PostgreSQL, concesiones con token, reintentos acotados y revisión de resultados inciertos.
- Implementados: ejecutable y Dockerfile del worker, modos Embedded/External, separación de consumidores, herramientas comerciales mediante API interna autenticada y relay SignalR con confirmación por réplica y revisión de grupos autorizados.
- Implementadas señales PostgreSQL LISTEN/NOTIFY para despertar trabajo después de persistir, con respaldo periódico. Las señales no son la fuente de verdad.
- El modo por defecto continúa Embedded. External y el SQL se probaron únicamente en contenedores desechables. No se activaron, ejecutaron ni desplegaron estos cambios en producción.
- SQL puntual: `SenorArroz.Infrastructure/Scripts/add_whatsapp_processing_worker.sql`. Se generó una copia aislada del inicializador completo en `.work/local-init-completo.sql`, con la ampliación agregada. El inicializador compartido original conserva su hash SHA256 `3761248AE7E213D616200D4391AD755E022FE062314BA2229F5880599C8818C4`.
- Verificaciones ya obtenidas durante el desarrollo: compilación de API/worker; 193 pruebas seleccionadas de WhatsApp; pruebas PostgreSQL de deduplicación, particiones, concesiones y aislamiento; prueba de procesos separados y reinicio del worker; prueba de entrega por réplica sin contenido a grupos revocados. La validación técnica final se completó y está registrada abajo; las etapas permanecen en curso por sus pendientes operativos y funcionales.

### Pendientes para cerrar estas etapas

- Completar la línea base operacional: consultas/conexiones SQL, p50/p95, volumen de asesores/mensajes y backlog en horario representativo. CPU/RAM de una hora ya registradas; no sustituyen esas mediciones.
- Validar presupuestos con carga reproducible. Los valores del documento técnico son objetivos iniciales, no resultados ni SLA productivo.
- Completar extracción de envíos manuales/plantillas y efectos externos que aún usan rutas actuales; conservar su contrato UX durante esa migración.
- Completar pruebas de orden cuando cambia la identidad teléfono/BSUID de un mismo contacto, y de confirmación comercial compartida entre IA/Flow/asesor al implementar la sesión de etapa 4.
- Completar métricas de profundidad de cola/reintentos, retención de eventos y ensayo prolongado de recuperación antes de habilitar External en producción.
- [x] Validación técnica final: SQL idempotente/RLS, regresiones entre sucursales y arranque independiente con la versión final de los binarios.
- Preparar el corte de consumidores y la revisión operativa de despliegue en la etapa 7. Esta entrega no declara las etapas 0/1 cerradas ni despliegue productivo completado.


### Verificación de la entrega inicial — 2026-10-31

| Comprobación | Resultado |
|---|---|
| Regresión general | 1420 aprobadas; 107 omitidas |
| PostgreSQL y procesos separados | 9 aprobadas; 0 omitidas |

- Compilación de la solución y ejecutable del worker sin errores. Los warnings observados corresponden a código previo, fuera de esta entrega.
- Las pruebas PostgreSQL incluyen deduplicación, exclusión y orden de particiones, recuperación de concesión, rechazo de un propietario vencido, dos tenants, entrega por réplica, grupos revocados y aplicación real del SQL dos veces sobre el esquema anterior.
- Se verifica que la API acepte trabajo con el worker apagado; que al arrancar procese el trabajo y encole IA inmediatamente, con el barrido de recuperación configurado a 300 segundos; y que reiniciarlo no duplique el mensaje ni detenga la API.
- Se verifica autenticación del contrato interno y límite de tamaño de solicitudes, sin usar cuentas o mensajes reales de WhatsApp.
- Las regresiones entre sucursales preservan control de versión y procedencia. Los handlers de creación/gestión de pedidos no se sustituyeron.
- Antes de producción: resolver los pendientes de cierre listados arriba, revisar grants de tabla/secuencia para el rol runtime, compatibilidad con el trabajo del laboratorio, retención y corte de consumidores. No hay despliegue productivo implícito en esta entrega.


Validacion adicional 2026-10-31: el ensayo de procesos separados tambien ejecuta una herramienta comercial autenticada en la API, rechaza una version de atencion obsoleta y confirma que el estado comercial del segundo tenant permanece intacto. La ampliacion de esta prueba paso 1/1. El paquete del worker se publico localmente en configuracion Release, sin errores; esto no es un despliegue de Railway.

Backend: commit 5d6da83 en feat/whatsapp-worker-stage01.
