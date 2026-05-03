# Senor Arroz Frontend - Codex Rules

## Contexto del proyecto

Este es un sistema de gestion de restaurante desarrollado en Vue 3 + TypeScript + Tailwind CSS. El proyecto maneja pedidos, clientes, productos, pagos y multiples roles de usuario.

si ves algun archivo que contenga alerts nativos vamos a cambiarlos por los modales ya existentes.

## Documentacion principal

- `agents.md` - documentacion amplia del frontend
- `docs/README.md` - overview y navegacion
- `docs/architecture.md` - arquitectura tecnica
- `docs/components.md` - guia de componentes UI
- `docs/business-rules.md` - reglas de negocio
- `docs/api-reference.md` - referencia de APIs
- `docs/development.md` - guias y convenciones
- `docs/patterns.md` - patrones de arquitectura
- `docs/recommendations.md` - mejores practicas

## Stack

- Frontend: Vue 3 + Composition API + TypeScript
- Styling: Tailwind CSS
- Estado: Pinia
- Routing: Vue Router
- HTTP: Axios con interceptores JWT
- Build: Vite
- Testing: Vitest

## Roles

- `SUPERADMIN`
- `ADMIN`
- `CASHIER`
- `KITCHEN`
- `DELIVERYMAN`

## Regla critica: reactividad optimista

Despues de mutaciones `CREATE`, `UPDATE` y `DELETE`, actualiza el estado local inmediatamente sin recargar desde el servidor salvo que exista una razon real para refrescar.

### CREATE

```ts
const created = await api.create(data);
items.value.unshift(created);
if (totalCount.value !== undefined) totalCount.value++;
```

### UPDATE

```ts
const updated = await api.update(id, data);
const index = items.value.findIndex((item) => item.id === id);
if (index !== -1) {
	items.value[index] = { ...items.value[index], ...updated };
}
```

### DELETE

```ts
await api.delete(id);
items.value = items.value.filter((item) => item.id !== id);
if (totalCount.value !== undefined) totalCount.value--;
```

### Cuando si recargar

- cambios que afectan multiples items
- operaciones con agregaciones o totales calculados por backend
- cambio de pagina
- filtros nuevos
- desincronizacion detectada

## Patrones de componentes

- Usar Composition API con `<script setup lang="ts">`
- Props y emits tipados
- Seguir el orden: imports, props/emits, composables, state, computed, methods, lifecycle
- Preferir componentes base reutilizables
- Mantener consistencia con el sistema de diseno existente

## Componentes autonomos

Usar prop `mode` cuando el mismo componente tenga comportamiento distinto entre draft y persisted.

```ts
if (props.mode === 'draft') {
	store.updateData(data);
} else {
	emit('data-updated', data);
}
```

Los modales autonomos deben manejar internamente:

- llamadas a API
- validacion
- estados de carga y error
- actualizacion optimista del store

Y emitir `updated` con el objeto actualizado cuando aplique.

## Convenciones

- Componentes: PascalCase
- Servicios y variables: camelCase
- Constantes: UPPER_SNAKE_CASE
- Tipos e interfaces: PascalCase
- Eventos: kebab-case

## Reglas de negocio importantes

### Pedidos

- `delivery`: cliente + direccion obligatorios
- `reservation`: fecha/hora obligatoria
- `app payments`: maximo 1 por pedido
- `bank payments`: multiples permitidos
- cancelacion: requiere motivo

### Usuarios

- solo 1 superadmin
- 1 admin/cocina por sucursal
- los usuarios ven datos de su sucursal salvo superadmin

## Para Codex

- Usa este archivo como reglas base del frontend.
- Consulta `agents.md` para contexto amplio del modulo.
- Sigue `docs/patterns.md` y `docs/recommendations.md` antes de introducir patrones nuevos.
- Prefiere cambios pequenos y consistentes con la implementacion existente.
