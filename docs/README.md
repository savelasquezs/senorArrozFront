# Señor Arroz - Sistema de Gestión de Restaurante

## 📋 Overview General

**Señor Arroz** es un sistema completo de gestión de restaurante desarrollado en Vue 3 + TypeScript + Tailwind CSS. El sistema maneja pedidos, clientes, productos, pagos y múltiples roles de usuario con funcionalidades específicas para cada tipo de operación.

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build
```

## 📚 Documentación

Esta documentación está organizada de manera modular para facilitar la navegación:

### 🏗️ Arquitectura y Desarrollo
- **[Architecture](./architecture.md)** - Stack tecnológico, configuración y estructura del proyecto
- **[Development](./development.md)** - Guías de desarrollo, convenciones y comandos
- **[Components](./components.md)** - Guía completa de componentes UI y funcionalidad

### 💼 Reglas de Negocio y APIs
- **[Business Rules](./business-rules.md)** - Reglas de negocio, roles y permisos del sistema
- **[API Reference](./api-reference.md)** - Referencia completa de APIs y servicios

### 📋 Especificaciones Originales
- **[Requerimientos](../requerimientos.txt)** - Especificación funcional original del sistema
- **[Frontend Specs](../tofrontend.txt)** - Especificaciones de interfaz de usuario

## 🎯 Funcionalidades Principales

### Sistema de Pedidos
- **Tipos**: Onsite, Delivery, Reservation
- **Estados**: Taken → In Preparation → Ready → On The Way → Delivered
- **Pagos**: Apps (máx 1), Bancos (múltiples), Efectivo

### Roles de Usuario
- **Superadmin**: Acceso total al sistema
- **Admin**: Administrador de sucursal
- **Cashier**: Cajero
- **Kitchen**: Cocina
- **Deliveryman**: Domiciliario

### Gestión Completa
- ✅ Productos y categorías por sucursal
- ✅ Clientes con múltiples direcciones
- ✅ Sistema de pagos integrado
- ✅ Liquidación de apps de delivery
- ✅ Reportes y dashboards por rol

## 🎨 Sistema de Diseño

### Colores Principales
- **Primario**: Emerald (Verde) - `#009966`
- **Secundario**: Gray - `#6b7280`
- **Éxito**: Green - `#10b981`
- **Peligro**: Red - `#ef4444`

### Tecnologías
- **Frontend**: Vue 3 + Composition API + TypeScript
- **Styling**: Tailwind CSS v4
- **Estado**: Pinia (stores modulares)
- **Routing**: Vue Router 4
- **HTTP**: Axios con interceptores JWT
- **Icons**: Heroicons
- **Build**: Vite

## 🔄 Estado de Desarrollo

### ✅ Completado
- Sistema de autenticación JWT
- Layout base con sidebar responsive
- Gestión de usuarios y roles
- Sistema de pedidos básico
- Componentes UI base reutilizables
- Stores de Pinia modulares
- APIs de servicios completas

### 🚧 En Desarrollo
- Pantalla completa de pedidos
- Sistema de pagos integrado
- Gestión de productos completa
- Dashboard y reportes

### ⏳ Pendiente
- Módulo de cocina
- Módulo de domicilios
- Sistema de gastos
- Caja y cuadres
- Reportes avanzados

## 🤝 Para Nuevos Desarrolladores

1. **Leer este README** para entender el overview
2. **Revisar [Architecture](./architecture.md)** para setup técnico
3. **Estudiar [Components](./components.md)** para entender la UI
4. **Consultar [Business Rules](./business-rules.md)** para reglas del negocio
5. **Explorar [API Reference](./api-reference.md)** para integración backend

## 🤖 Para Agentes IA

- **Contexto Principal**: Usar este README como punto de entrada
- **Detalles Técnicos**: Consultar [Architecture](./architecture.md)
- **Componentes**: Revisar [Components](./components.md) para patrones UI
- **Reglas**: Seguir [Business Rules](./business-rules.md) para lógica de negocio
- **APIs**: Usar [API Reference](./api-reference.md) para integración

---

**Última actualización**: Diciembre 2024  
**Versión**: 0.0.0 (desarrollo)  
**Stack**: Vue 3 + TypeScript + Tailwind + Pinia
