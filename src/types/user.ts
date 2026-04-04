// src/types/user.ts
export type UserRole = 'Superadmin' | 'Admin' | 'Cashier' | 'Kitchen' | 'Deliveryman'

export interface User {
    id: number
    branchId: number
    branchName?: string
    role: UserRole
    name: string
    email: string
    phone: string
    active: boolean
    lastLogin?: string
    createdAt: string
    updatedAt: string
    /** Ítem de catálogo solo para préstamos/gastos de quincena de esta persona */
    payrollExpenseId?: number | null
    payrollExpenseName?: string | null
}

export interface CreateUserRequest {
    branchId: number
    role: UserRole
    name: string
    email: string
    phone: string
    password: string
    payrollExpenseId?: number | null
}

export interface UpdateUserRequest {
    name?: string
    email?: string
    phone?: string
    role?: UserRole
    active?: boolean
    /** Solo superadmin; cambia la sucursal del usuario */
    branchId?: number
    payrollExpenseId?: number | null
}

export interface UserFilters {
    branchId?: number
    role?: UserRole
    active?: boolean
    search?: string
}

// Role labels for UI
export const USER_ROLE_LABELS: Record<UserRole, string> = {
    Superadmin: 'Super Administrador',
    Admin: 'Administrador',
    Cashier: 'Cajero',
    Kitchen: 'Cocina',
    Deliveryman: 'Domiciliario'
}

// Role descriptions for UI
export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    Superadmin: 'Acceso total al sistema y todas las sucursales',
    Admin: 'Gestión completa de su sucursal asignada',
    Cashier: 'Gestión de pedidos, clientes y caja',
    Kitchen: 'Visualización y gestión de pedidos en preparación',
    Deliveryman: 'Gestión de entregas y pedidos asignados'
}