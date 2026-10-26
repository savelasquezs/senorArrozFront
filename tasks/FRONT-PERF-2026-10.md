# FRONT-PERF-2026-10 — implementación integral

## Objetivo y autorización

Mejorar UX y rendimiento de todas las rutas y secciones Vue, con cambios API necesarios. Autorizado por el propietario el 26-oct-2026. Trabajo local aislado e integración completa antes de publicar. Preservar los checkouts originales y sus modificaciones. Flutter, Next.js y Print Agent mantienen compatibilidad; no forman parte del rediseño.

## Organización

- Worktrees: `.front-performance/frontend` y `.front-performance/api`.
- Integración: `perf/front-ux-integration` en cada repositorio independiente.
- Bloques: `perf/pXX-descripcion`; commits separados de implementación, regresiones y evidencia cuando corresponda.
- Dependientes parten de su requisito; independientes, de main. La integración reúne cambios verificados. Registrar SHA y condiciones de cada prueba.
- Aprovechar PR frontend 42/44/46 y API 62/64/68/70; no duplicar sus mecanismos. Conservar referencia de procedencia.
- Lecturas cancelables, contexto/generación antes de escribir, propietario único de lecturas compartidas. Sin reintentos globales de mutaciones ni autoridad de tenant en frontend.
- Filtros, página, scroll y borradores sobreviven navegación compatible. Una respuesta antigua no sustituye eventos ni ediciones recientes.

## Bloques y aceptación

| ID | Rama | Trabajo y aceptación | Estado |
|---|---|---|---|
| P00 | p00-baseline | Inventario completo, builds A/B, escenarios frío/caliente y trazas anonimizadas. Distinguir simulación, integración y producción. | En curso |
| P01 | p01-http-lifecycle | Preservar cancelación HTTP, compartir lecturas y descartar resultados/errores obsoletos. Dos consumidores no se cancelan entre sí. | Pendiente |
| P02 | p02-persistent-layout | Shell autenticada persistente; propietarios globales únicos; desmontaje por identidad/rol/contexto. Navegar no reinicia hubs. | Pendiente |
| P03 | p03-route-state | Identidad por recurso/contexto, queries en sitio y estado de listados. Back/forward y enlaces directos conservan contexto. | Pendiente |
| P04 | p04-build-recovery | Recuperación de chunks con salida visible, cooldown/storage/red, borradores y ruta destino. Prueba A→B sin bucles. | Pendiente |
| P05 | p05-pos | Catálogo POS separado del listado administrativo; skeleton/error reales; páginas completas; stock por contexto; auxiliares independientes. | Pendiente |
| P06 | p06-products | Listado/categorías paralelos, detalle/gráficos async, perfiles comerciales e invalidaciones. Sin Chart.js antes de abrir detalle. | Pendiente |
| P07 | p07-orders | Filas antes de opciones; proyección domiciliarios; cancelación EF; reservas existentes; detalle/ediciones sin pérdida. | Pendiente |
| P08 | p08-customers | Listado/búsqueda/detalle/direcciones/historial con generación; API 68; invalidación entre consumidores. | Pendiente |
| P09 | p09-drafts | Medir 1/5/20 borradores; retirar escrituras redundantes sin debilitar recuperación. Sin migración especulativa de storage. | Pendiente |
| P10 | p10-whatsapp-workspace | Integrar 46; bandeja y contexto independientes; A lento→B rápido; fallback serial visible/online. | Pendiente |
| P11 | p11-whatsapp-history | Cursor fecha/ID, 50 mensajes iniciales (máx. 100), páginas/scroll/realtime y medios acotados. Endpoint anterior compatible. | Pendiente |
| P12 | p12-whatsapp-settings | Plantillas y canal; quitar espera artificial 350 ms; promesas reales, abort/generación y cleanup. | Pendiente |
| P13 | p13-kitchen | Verificar batch/coalescencia/render, voz durable y estados. Sin anuncios ni transiciones duplicadas. | Pendiente |
| P14 | p14-delivery | Disponibles/asignados independientes, métricas/historial por demanda y eventos antes del snapshot. | Pendiente |
| P15 | p15-delivery-management | Ubicaciones/pedidos agrupados para mapa; resumen independiente; sin HTTP proporcional a empleados. | Pendiente |
| P16 | p16-tracking | Alertas/incidentes/playback bajo demanda; abort/contexto y timers visibles. Histórico no se refresca. | Pendiente |
| P17 | p17-inventory | Cargas por sección, metadata mínima, coalescencia, conteos/recetas/transferencias protegidos. | Pendiente |
| P18 | p18-expenses | Integrar 44/70; gastos/conceptos/proveedores/imputación. Última intención gana y lecturas no restauran borrados. | Pendiente |
| P19 | p19-dashboard | Retener última clave por sección, TTL 30 s, cleanup/cancelación oculta; mapas/detalles diferidos. | Pendiente |
| P20 | p20-branches | Ficha primero; usuarios/nómina/horarios/barrios/impresión/descuentos/fidelización/integraciones por sección. | Pendiente |
| P21 | p21-banks-apps | Ficha/movimientos/pagos independientes; paginación real, contexto y selección vigente tras mutaciones. | Pendiente |
| P22 | p22-cash | Esperado sin espera auxiliar; borradores conservados y cierre con todos los prerrequisitos frescos. | Pendiente |
| P23 | p23-workforce | Almuerzos/permisos/adjuntos/historial; no perder bloqueo ni avisos con shell persistente. | Pendiente |
| P24 | p24-invoicing | Destinatarios/configuración/progreso/archivos; polling visible serial; renovar token no borra identidad estable. | Pendiente |
| P25 | p25-secondary-views | Login/contraseñas/perfil/documentos/blog/Rappi: lifecycle, errores parciales, archivos por demanda e idempotencia. | Pendiente |
| P26 | p26-final-validation | Bundles/render/medios/memoria, matriz completa, regresiones y métricas A/B. Nada omitido por fase indefinida. | Pendiente |

Dependencias: P01→lecturas; P02→P03; P03→P04/P05/P07/P08/P17; P05→P06/P09; P10→P11/P12; P20→P21/P24; P21→P22; todos→P26.

## Contratos

- Reutilizar contexto operativo API 62 para ajustes POS.
- `GET /api/orders/deliveryman-options`: rango Colombia y contexto equivalente al selector actual; pares ID/nombre completos.
- `GET /api/whatsapp/conversations/{id}/messages/page`: cursor anterior opaco fecha/ID; `items`, `nextCursor`, `hasMore`; orden de presentación ascendente; acceso y semántica de lectura conservados.
- Mapa de gestión: últimas ubicaciones agrupadas y pedidos paginados con proyección mínima; autorización de sucursal/tenant existente.
- No se prevé DDL. Cualquier índice exige evidencia SQL, script idempotente y actualización del inicializador raíz.

## Validación

Cada ruta/sección: inicial, refresh, vacío, error/reintento, filtros/paginación, enlaces/back/forward, permisos, teclado/foco y móvil. Transversal: contextos A/B, respuestas invertidas, logout, dos consumidores, eventos durante snapshot, borradores, pagos/cierres/voz/almuerzo, reconexión/red y cambios de build.

Reutilizar Vitest y Playwright existente. Pruebas de escrituras externas con proveedores simulados; nunca presentarlas como producción. Suite completa por ola, typecheck/build y pruebas focalizadas por bloque.

Métricas A/B en build de producción con iguales equipo/red/dataset/rol/sucursal: feedback, contenido útil, acción habilitada, solicitudes/bytes/tareas largas/memoria. Objetivos iniciales: feedback 100 ms, navegación caliente útil 1 s; si baseline supera 1 s, buscar reducción ≥30 %, registrando desviaciones. Mínimo 20 repeticiones por recorrido prioritario y 20 ciclos para recursos. No inventar resultados.

## Registro de ejecución

- 26-oct-2026: inicio autorizado. Checkouts originales sucios en Vite/Program; se preservan. Preparación de integración y sincronización de main/PR existentes.

## Finalización

Cada bloque cierra con implementación o descarte justificado, pruebas y evidencia. No marcar rendimiento productivo por build verde. Publicación futura: API compatible antes de frontend, verificación real y reversión por bloque.
