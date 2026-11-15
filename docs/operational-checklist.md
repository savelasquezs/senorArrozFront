# Recordatorios operativos del POS

Integración pequeña en `TopNavigation.vue`: sol/mañana y luna/tarde. Reutiliza `BaseButton`, `BaseDialog`, `BaseInput`, `BaseSelect`, Heroicons, `branchContext`, BaseApi/JWT y el SignalR existente. `ReminderList` es la misma vista para desplegable y modal. `BaseTooltip` es la única primitiva nueva, con soporte mouse/teclado/toque y posicionamiento dentro del viewport.

## Comportamiento

- El backend entrega solamente las tareas del día de Colombia y de la sucursal activa. El cliente no infiere festivos, permisos ni tenant.
- Cada badge cuenta todos los pendientes de su franja, incluidos condicionales y tareas de administración.
- El estado se comparte entre cajero y administradores. Las mutaciones envían valor explícito, fecha y revisión; se reconcilian tras un conflicto o error.
- El servidor conserva una sola fila actual por tarea. No hay historial de cumplimiento ni atribución del check a un trabajador.
- Modales opcionales a las 10:30 y 18:00: nunca se apilan sobre otro diálogo; al volver tarde se ofrece únicamente la franja más reciente. Cerrar no marca tareas. No se pide completar todo.
- La supresión del aviso se guarda localmente por usuario/sucursal/franja y fecha; no es un registro de cumplimiento. Una nueva fecha reemplaza la anterior.
- Cambio de sucursal/cierre de sesión invalida respuestas pendientes y limpia la vista. Reconexión, regreso a la pestaña y eventos del mismo branch refrescan el estado.
- Configuración está disponible desde el desplegable solo para administradores. Una falla de Mintlify no deshace una configuración guardada; se puede reintentar.

## Activación

Requiere los endpoints `/api/operational-checklist` del backend y el esquema de `add_operational_checklist.sql`. Aplicar SQL antes de desplegar el código. Cargar los textos operativos por canal privado: no copiar el manual interno en este repositorio público. La configuración se edita en el POS y el backend publica únicamente el snippet generado del manual privado.

## Pruebas

```bash
npx vitest run src/store/__tests__/operationalChecklist.test.ts src/utils/__tests__/checklistReminder.test.ts src/components/operationalChecklist/__tests__
npm run build
```

Pruebas con fixtures genéricas. Las capturas visuales privadas usan las mismas vistas, con API simulada, no una conexión a producción. Validar también a 390 px de ancho, tooltip fuera de contenedores scroll, teclado, modal abierto durante la hora de aviso y guardado con red fallida.
