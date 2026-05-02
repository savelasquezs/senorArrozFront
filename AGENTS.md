# Señor Arroz Frontend - Codex Guide

## Objetivo

Este archivo ayuda a Codex a encontrar rápido dónde hacer cambios sin escanear todo el frontend.

## Stack

- Vue 3
- Pinia
- Vue Router
- Vite
- Tailwind
- Axios

## Lectura obligatoria antes de modificar

1. Identificar módulo en `src/views`
2. Identificar store en `src/store`
3. Identificar componentes en `src/components`
4. Confirmar impacto en backend (`SenorArroz`)

## Estructura general

### Vistas

```text
src/views/
```

Responsables de:

- Pantallas completas
- Layouts
- Orquestación de componentes

### Stores (Pinia)

```text
src/store/
```

Responsables de:

- Estado global
- Llamadas HTTP
- Manejo de listas, filtros y paginación

Regla:

- La lógica de negocio ligera puede vivir aquí
- No duplicar lógica del backend

### Componentes

```text
src/components/
```

Responsables de:

- UI reutilizable
- Tarjetas
- Tablas
- Inputs

## Módulos principales

### Orders

Buscar en:

- `views/orders`
- `store/orders.ts`
- componentes relacionados

Reglas:

- Filtros pueden hacerse en frontend para agilidad
- Cambios de fecha deben consultar backend
- No romper paginación

### Kitchen

Buscar en:

- vista de cocina

Reglas:

- Mantener agrupación por categoría
- Mantener comportamiento responsive
- No romper flujo de estados

### Expenses

Buscar en:

- `views/expenses`

Reglas:

- Tabla tipo Excel
- Filtros locales rápidos
- Backend solo para cambios de fecha

## Multitenancy

Reglas:

- El frontend NO decide el tenant
- Nunca enviar `TenantId` manualmente
- El backend determina el tenant

## Reglas para Codex

Antes de cambiar algo:

1. Identificar vista
2. Identificar store
3. Identificar endpoint backend
4. Ver impacto en UX

Evitar:

- Buscar en todo el repo sin contexto
- Cambiar múltiples módulos a la vez
- Romper contratos con backend

## Buenas prácticas

- Reutilizar componentes
- Mantener stores consistentes
- Evitar duplicación
- Mantener naming consistente

## Checklist

- ¿Rompe alguna vista existente?
- ¿Rompe filtros?
- ¿Rompe cocina?
- ¿Rompe pedidos?
- ¿Sigue funcionando con backend actual?
