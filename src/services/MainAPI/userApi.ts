// src/services/userApi.ts
import { BaseApi } from './baseApi';
import type { ApiResponse, PagedResult } from '@/types/common';
import type { User, CreateUserRequest, UpdateUserRequest, UserFilters } from '@/types/user';

class UserApi extends BaseApi {
	// Get all users with optional filters
	async getUsers(filters?: UserFilters): Promise<ApiResponse<PagedResult<User>>> {
		return this.get<ApiResponse<PagedResult<User>>>('/Users', { params: filters });
	}

	// Get users by branch
	async getUsersByBranch(branchId: number): Promise<ApiResponse<User[]>> {
		return this.get<ApiResponse<User[]>>(`/Users/branch/${branchId}`);
	}

	// Get single user by ID
	async getUserById(id: number): Promise<ApiResponse<User>> {
		return this.get<ApiResponse<User>>(`/Users/${id}`);
	}

	// Create new user
	async createUser(payload: CreateUserRequest): Promise<User> {
		return this.post<User>('/Users', payload);
	}

	// Update user
	async updateUser(id: number, payload: UpdateUserRequest): Promise<User> {
		return this.put<User>(`/Users/${id}`, payload);
	}

	// Toggle user active status
	async toggleUserStatus(id: number): Promise<ApiResponse<User>> {
		return this.put<ApiResponse<User>>(`/Users/${id}/toggle-status`);
	}

	// Reset user password (admin action)
	async resetUserPassword(id: number): Promise<ApiResponse<{ temporaryPassword: string }>> {
		return this.post<ApiResponse<{ temporaryPassword: string }>>(`/Users/${id}/reset-password`);
	}

	// Delete user (soft delete)
	async deleteUser(id: number): Promise<ApiResponse<string>> {
		return this.delete<ApiResponse<string>>(`/Users/${id}`);
	}
}

export const userApi = new UserApi();
