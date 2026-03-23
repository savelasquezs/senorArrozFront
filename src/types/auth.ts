// src/types/auth.ts

// User roles as const assertion for better type safety
export const UserRole = {
	SUPERADMIN: 'Superadmin',
	ADMIN: 'Admin',
	CASHIER: 'Cashier',
	KITCHEN: 'Kitchen',
	DELIVERYMAN: 'Deliveryman',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export interface User {
	id: number;
	name: string;
	email: string;
	phone: string;
	active: boolean;
	role: UserRoleType;
	branchId: number;
	branchName: string;
	/** Datos de la sucursal (login/refresh) para contacto y mapa en domiciliario */
	branchAddress?: string;
	branchPhone1?: string;
	branchPhone2?: string | null;
	branchLatitude?: number | null;
	branchLongitude?: number | null;
	profileImageUrl?: string;
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

export interface ChangePasswordCredentials {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface resetPasswordCredentials {
	token: string;
	email: string;
	newPassword: string;
	confirmPassword: string;
}
