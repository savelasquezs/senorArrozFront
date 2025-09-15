// src/types/auth.ts

// User roles as const assertion for better type safety
export const UserRole = {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    CASHIER: 'cashier',
    KITCHEN: 'kitchen',
    DELIVERYMAN: 'deliveryman'
} as const

export type UserRoleType = typeof UserRole[keyof typeof UserRole]

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRoleType;
    branchId: number;
    branchName: string;
}

export interface LoginResponse {
    token: string;
    refreshToken: string;
    expiresAt: string;
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface ApiError {
    message: string;
    code?: string;
    details?: any;
}