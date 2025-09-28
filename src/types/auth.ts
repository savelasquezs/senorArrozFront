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
	active: boolean;
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
