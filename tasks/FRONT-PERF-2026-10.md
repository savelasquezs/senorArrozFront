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
| P00 | baseline detached | Inventario completo, builds A/B, escenarios frío/caliente y trazas anonimizadas. Distinguir simulación, integración y producción. | Evidencia A/B local reproducible |
| P01 | p01-http-lifecycle | Preservar cancelación HTTP, compartir lecturas y descartar resultados/errores obsoletos. Dos consumidores no se cancelan entre sí. | Código local verificado |
| P02 | p02-persistent-layout | Shell autenticada persistente; propietarios globales únicos; desmontaje por identidad/rol/contexto. Navegar no reinicia hubs. | Código local verificado |
| P03 | p03-route-state | Identidad por recurso/contexto, queries en sitio y estado de listados. Back/forward y enlaces directos conservan contexto. | Código local verificado |
| P04 | p04-build-recovery | Recuperación de chunks con salida visible, cooldown/storage/red, borradores y ruta destino. Prueba A→B sin bucles. | Código local verificado |
| P05 | p05-pos | Catálogo POS separado del listado administrativo; skeleton/error reales; páginas completas; stock por contexto; auxiliares independientes. | Código local verificado |
| P06 | p06-products | Listado/categorías paralelos, detalle/gráficos async, perfiles comerciales e invalidaciones. Sin Chart.js antes de abrir detalle. | Código local verificado |
| P07 | p07-orders | Filas antes de opciones; proyección domiciliarios; cancelación EF; reservas existentes; detalle/ediciones sin pérdida. | Código local verificado |
| P08 | p08-customers | Listado/búsqueda/detalle/direcciones/historial con generación; API 68; invalidación entre consumidores. | Código local verificado |
| P09 | p09-drafts | Medir 1/5/20 borradores; retirar escrituras redundantes sin debilitar recuperación. Sin migración especulativa de storage. | Código local verificado |
| P10 | p10-whatsapp-workspace | Integrar 46; bandeja y contexto independientes; A lento→B rápido; fallback serial visible/online. | Código local verificado |
| P11 | p11-whatsapp-history | Cursor fecha/ID, 50 mensajes iniciales (máx. 100), páginas/scroll/realtime y medios acotados. Endpoint anterior compatible. | Código local verificado |
| P12 | p12-whatsapp-settings | Plantillas y canal; quitar espera artificial 350 ms; promesas reales, abort/generación y cleanup. | Código local verificado |
| P13 | existente, sin rama nueva | Verificar batch/coalescencia/render, voz durable y estados. Sin anuncios ni transiciones duplicadas. | Implementación existente conservada y verificada |
| P14 | p14-delivery | Disponibles/asignados independientes, métricas/historial por demanda y eventos antes del snapshot. | Código local verificado |
| P15 | p15-delivery-management | Ubicaciones/pedidos agrupados para mapa; resumen independiente; sin HTTP proporcional a empleados. | Código local verificado |
| P16 | p16-tracking | Alertas/incidentes/playback bajo demanda; abort/contexto y timers visibles. Histórico no se refresca. | Código local verificado |
| P17 | p17-inventory | Cargas por sección, metadata mínima, coalescencia, conteos/recetas/transferencias protegidos. | Código local verificado |
| P18 | PR 44 / API 70 + p26-validation | Integrar 44/70; gastos/conceptos/proveedores/imputación. Última intención gana y lecturas no restauran borrados. | PR 44/70 integrados localmente; imputación protegida |
| P19 | p19-dashboard | Retener última clave por sección, TTL 30 s, cleanup/cancelación oculta; mapas/detalles diferidos. | Código local verificado |
| P20 | p20-branches | Ficha primero; usuarios/nómina/horarios/barrios/impresión/descuentos/fidelización/integraciones por sección. | Código local verificado |
| P21 | p21-banks-apps | Ficha/movimientos/pagos independientes; paginación real, contexto y selección vigente tras mutaciones. | Código local verificado |
| P22 | p22-cash | Esperado sin espera auxiliar; borradores conservados y cierre con todos los prerrequisitos frescos. | Código local verificado |
| P23 | p23-workforce | Almuerzos/permisos/adjuntos/historial; no perder bloqueo ni avisos con shell persistente. | Código local verificado |
| P24 | p24-invoicing | Destinatarios/configuración/progreso/archivos; polling visible serial; renovar token no borra identidad estable. | Código local verificado |
| P25 | p25-secondary-views | Login/contraseñas/perfil/documentos/blog/Rappi: lifecycle, errores parciales, archivos por demanda e idempotencia. | Código local verificado |
| P26 | p26-final-validation | Bundles/render/medios/memoria, matriz completa, regresiones y métricas A/B. Nada omitido por fase indefinida. | Validación local completada; producción pendiente |

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

## Cierre local — 26-oct-2026

El ZIP se utilizó como propuesta de diagnóstico; la autorización y el alcance provienen de la solicitud del propietario. Los cambios se contrastaron con los repositorios actuales y con los PR existentes.

- Frontend base: `5b29fcf613a244cd832724e4802237231883bb12`; código medido: `6309c6ca45e58cd7c21a0606b89f379a02fd2cc2`.
- API con implementación: `70ac0a1f9c25675df6e02a3128d9789deedfcb06`.
- Rama de integración en ambos repositorios: `perf/front-ux-integration`. Las ramas Pxx conservan las entregas locales y sus commits. No se modificaron los checkouts originales ni se publicaron cambios remotos.
- Referencia estructurada: [evidencia](FRONT-PERF-2026-10.evidence.json). Logs, builds, screenshots y registros sintéticos de navegación quedan en `.front-performance/evidence` y `.front-performance/*.log` del workspace.

### Verificación

- Frontend: 149 archivos y 940 pruebas aprobadas en el código final; typecheck y dos builds de producción aprobados.
- API: 1.289 aprobadas, 101 omitidas por configuración, cero fallos. La prueba del mapa ejecutó SQL real en PostgreSQL 17 aislado. Las otras regresiones nuevas usan EF InMemory/controladores.
- Navegador: 35 rutas registradas con prueba inicial/error, sin excepciones JavaScript; el detalle de sucursal redirige al listado cuando el servicio simulado falla. Formularios públicos sin autenticación y rutas privadas con Superadmin; los permisos de otros roles tienen cobertura focalizada, sin afirmar validación operativa real.
- 20 cargas frías de Productos y 20 ciclos Productos/Clientes por versión. API sintética con 180 productos, 200 clientes y demora de 150 ms; builds comprimidos, mismo Chrome/equipo. La ejecución final se hizo con las suites detenidas.
- Recuperación A→B: asset antiguo devuelve 404; se conserva el borrador, se impide recargar offline y la recarga explícita abre `/documents`. La prueba detectó y permitió corregir la pérdida original del destino. El filtro de clientes sobrevive al cambio de pantalla. Sin desbordamiento horizontal de página a 390 px; la tabla conserva su scroll interno.

### Resultados medidos en simulación

| Métrica | Base | Candidato |
|---|---:|---:|
| Mediana, primera fila útil de Productos, carga fría | 1.048 ms | 542 ms |
| Mediana, navegación caliente | 1.233 ms | 705 ms |
| p95, navegación caliente | 1.309 ms | 1.117 ms |
| Solicitudes durante 40 cambios de pantalla | 320 | 64 |
| Lecturas de promoción / almuerzo durante esos cambios | 40 / 40 | 0 / 0 |
| JS estático necesario para Productos, sin hijos dinámicos | 770.797 bytes | 579.281 bytes |
| JS de Productos, estimación gzip | 259.001 bytes | 204.737 bytes |

Reducción de mediana: ~48 % en carga fría y ~43 % en navegación caliente; JS inicial de Productos ~25 % menor. El p95 de navegación todavía supera 1 s en esta simulación. Otros conjuntos estáticos crecen entre ~2 % y ~3 % por la infraestructura compartida; no se afirma una reducción universal del bundle. Chart.js queda fuera del listado inicial de Productos.

En 20 ciclos, los intervalos activos permanecieron estables: base 3→3 y candidato 4→4. SignalR se simuló sin transporte disponible; las negociaciones no sustituyen una prueba de conexión real. Los valores de heap sin GC forzado son referencia y no prueban ausencia de fugas.

### Decisiones conservadas por evidencia

- Cocina ya disponía de páginas completas, detalles incluidos, coalescencia y cola durable de voz. Sus siete regresiones de rendimiento/voz pasaron; se mantuvo esa implementación.
- Gastos reutiliza los PR frontend 44 y API 70; se completó cancelación y paralelismo en imputación. No se duplicó el coordinador.
- La ficha general de sucursal muestra usuarios y barrios; esos datos siguen siendo necesarios allí. Bancos/apps y gastos esperan su sección; nómina, horarios, impresión, fidelidad y otras integraciones conservan los límites de sus componentes existentes.
- Guardado síncrono de 1/5/20 borradores con 20 productos: medianas jsdom de 0,28/1,15/4,56 ms, respectivamente. Se conserva la recuperación inmediata en localStorage. La resolución de beneficios ahora serializa invalidaciones y no aplica respuestas a otro borrador.
- Sin nuevas dependencias productivas, DDL ni índices propuestos sin evidencia. La disponibilidad del POS consulta la sede del borrador y valida rol/tenant/sede activa; el contrato administrativo anterior permanece disponible.
- Frontend adopta los nuevos endpoints de domiciliarios y mensajes paginados. La API conserva los endpoints anteriores para los otros clientes.

### Publicación y verificación real pendientes

La implementación local está integrada y revisable. Falta ejecutar CI remoto y publicar API antes de frontend, después verificar recorridos reales con cajero, cocina, administrador y domiciliario: creación/edición, stock, pagos, caja, voz, almuerzos, WhatsApp/medios/reconexión y facturación. La evaluación de LCP/INP/CLS, p95 productivo, carga SQL, RLS y proveedores reales no se sustituye con estas pruebas. No se ejecutó ninguna mutación operativa ni despliegue productivo.

Para revertir una publicación, retirar primero el frontend que consume los endpoints nuevos y después la API, conservando los contratos anteriores. No hay reversión de esquema.

Los artefactos compilados de API/pruebas se movieron a `D:/CodexTemp/SenorArroz-front-performance-20261026` y se enlazaron desde el worktree para resolver falta de espacio en C:. El PostgreSQL de prueba es independiente de la base de la aplicación.

El smoke inicial/error de las 35 rutas se repitió sobre el build final `6309c6c`, sin excepciones. El PostgreSQL desechable quedó detenido al terminar.
