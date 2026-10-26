# Selector de productos del detalle

Autorizado: reutilizar el POS como selector compacto de escritorio, con catálogo a la izquierda y resumen editable del mismo ancho del OrderSidebar a la derecha.

- Compartir OrderProductCatalog entre Orders y AddProductModal; reutilizar CategoriesBar, ProductGrid, ProductCard, ProductStock, skeletons, BaseInput y BaseDialog.
- Reutilizar OrderItem sin modificar su distribución, incluidas notas, cantidad, precio, descuento y subtotal. Compartir creación de líneas y cálculo monetario mediante helpers; mantener separados los estados de selección y del POS.
- Altura máxima de ventana, scroll exclusivo en catálogo/selección, encabezado/filtros/total/acciones estáticos.
- Confirmar múltiples productos como un lote local, conservar reglas de stock, sede, permisos y guardado explícito; proteger selección frente a cierre accidental y error.
- Verificar entrada directa y catálogo paginado, búsqueda sin tildes, agrupaciones, vacío, carga/error/reintento, stock, personalización, cancelación, cambio externo y aislamiento del borrador POS.
- Comprobar regresiones del POS, tipos, build y suite completa; verificar geometría y recorridos de navegador antes de publicar.

No requiere API ni SQL. Regalos y beneficios existentes conservan sus reglas; un precio cero no convierte una línea en regalo promocional.

## Validación local

- Suite completa: 151 archivos / 955 pruebas aprobadas. Tras añadir el caso monetario de lote, las dos suites focalizadas cerraron con 14 pruebas aprobadas; CI debe validar el conjunto final.
- Typecheck y build de producción aprobados. OrderItem.vue se reutiliza sin modificaciones.
- Navegador con API simulada y 95 productos: a 1366×768, panel de 1280×691 y resumen de 478 px; a 1280×720, panel de 1248×648 y resumen de 448 px. Ambos conservan encabezado y footer dentro de la ventana.
- Se verificaron scroll de catálogo/selección, búsqueda sin tildes, cantidad, precio, descuento, notas, lote hacia edición sin guardar y cancelación sin persistir. Las pruebas cubren también aislamiento de borradores/filtros POS, bloqueo por stock/permisos, reintento y descarte explícito.
- Estos recorridos locales no constituyen evidencia productiva ni mediciones de rendimiento productivo.
