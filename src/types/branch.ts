// src/types/branch.ts

export interface Branch {
	id: number;
	name: string;
	address: string;
	phone: string;
	email: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateBranchData {
	name: string;
	address: string;
	phone: string;
	email: string;
}

export interface UpdateBranchData {
	name?: string;
	address?: string;
	phone?: string;
	email?: string;
	isActive?: boolean;
}

export interface BranchUser {
	id: number;
	name: string;
	email: string;
	role: string;
	isActive: boolean;
	createdAt: string;
}

export interface CreateUserData {
	name: string;
	email: string;
	password: string;
	role: string;
	branchId: number;
}

export interface UpdateUserData {
	name?: string;
	email?: string;
	role?: string;
	isActive?: boolean;
}