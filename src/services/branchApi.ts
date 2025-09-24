// src/services/branchApi.ts
import { mainApi } from './mainApi';
import type { Branch, CreateBranchData, UpdateBranchData } from '@/types/branch';

export const branchApi = {
	// Obtener todas las sucursales (solo Superadmin)
	async getAllBranches(): Promise<Branch[]> {
		const response = await mainApi.get('/branches');
		return response.data;
	},

	// Obtener una sucursal por ID
	async getBranchById(id: number): Promise<Branch> {
		const response = await mainApi.get(`/branches/${id}`);
		return response.data;
	},

	// Crear nueva sucursal (solo Superadmin)
	async createBranch(data: CreateBranchData): Promise<Branch> {
		const response = await mainApi.post('/branches', data);
		return response.data;
	},

	// Actualizar sucursal (solo Superadmin)
	async updateBranch(id: number, data: UpdateBranchData): Promise<Branch> {
		const response = await mainApi.put(`/branches/${id}`, data);
		return response.data;
	},

	// Eliminar sucursal (solo Superadmin)
	async deleteBranch(id: number): Promise<void> {
		await mainApi.delete(`/branches/${id}`);
	},

	// Activar/Desactivar sucursal (solo Superadmin)
	async toggleBranchStatus(id: number): Promise<Branch> {
		const response = await mainApi.patch(`/branches/${id}/toggle-status`);
		return response.data;
	}
};