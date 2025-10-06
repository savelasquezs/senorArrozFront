# Contexto Rápido - Señor Arroz

## 🚀 Stack Principal
- **Vue 3** + **TypeScript** + **Tailwind CSS** + **Pinia**
- **Vite** como build tool
- **Axios** con interceptores JWT
- **Heroicons** para iconografía

## 🎨 Colores del Sistema
- **Primario**: Emerald (Verde) - `#009966`, `emerald-600`, `emerald-700`
- **Secundario**: Gray - `gray-500`, `gray-700`, `gray-900`
- **Éxito**: Green - `green-600`, `green-700`
- **Peligro**: Red - `red-600`, `red-700`

## 👥 Roles de Usuario
- **SUPERADMIN**: Acceso total al sistema
- **ADMIN**: Administrador de sucursal
- **CASHIER**: Cajero
- **KITCHEN**: Cocina
- **DELIVERYMAN**: Domiciliario

## 🍽️ Funcionalidades Principales
- **Pedidos**: Onsite, Delivery, Reservation
- **Pagos**: Apps (máx 1), Bancos (múltiples), Efectivo
- **Productos**: Por sucursal con categorías y stock
- **Clientes**: Con múltiples direcciones
- **Liquidación**: Apps se liquidan creando bank_payments

## 📁 Estructura Clave
```
src/
├── components/ui/     # BaseButton, BaseInput, BaseCard, etc.
├── components/layout/ # MainLayout, Sidebar, TopNav
├── store/            # auth.ts, orders.ts, products.ts
├── services/MainAPI/ # APIs por dominio
├── types/            # Definiciones TypeScript
└── views/            # Páginas principales
```

## 🔧 Comandos
```bash
npm run dev      # Desarrollo
npm run build    # Build
npm run test     # Tests
```

## 📚 Documentación Completa
- **agents.md** - Documentación completa
- **docs/** - Documentación modular especializada
- **requerimientos.txt** - Especificación funcional
- **tofrontend.txt** - Especificaciones de UI

## 🎯 Reglas Importantes
- Delivery requiere cliente + dirección
- Solo 1 app payment por pedido
- Cancelación requiere motivo
- Usuarios solo ven su sucursal (excepto superadmin)

---
**Para información detallada**: Ver `agents.md` y carpeta `docs/`
