// src/services/userApi.ts
import { BaseApi } from './baseApi';
import type { ApiResponse, PagedResult } from '@/types/common';
import type { User, CreateUserRequest, UpdateUserRequest, UserFilters } from '@/types/user';
import type { UserPayrollInsights, UserPayrollSeriesGranularity } from '@/types/userPayroll';

class UserApi extends BaseApi {
	// Get all users with optional filters
	async getUsers(filters?: UserFilters): Promise<PagedResult<User>> {
		return this.get<PagedResult<User>>('/Users', { params: filters });
	}

	// Get users by branch
	async getUsersByBranch(branchId: number): Promise<ApiResponse<User[]>> {
		return this.get<ApiResponse<User[]>>(`/Users/branch/${branchId}`);
	}

	// Get single user by ID (cuerpo plano UserDto, sin envoltorio ApiResponse)
	async getUserById(id: number): Promise<User> {
		return this.get<User>(`/Users/${id}`);
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
	async toggleUserStatus(id: number): Promise<User> {
		return this.put<User>(`/Users/${id}/toggle-status`);
	}

	// Reset user password (admin action)
	async resetUserPassword(id: number): Promise<ApiResponse<{ temporaryPassword: string }>> {
		return this.post<ApiResponse<{ temporaryPassword: string }>>(`/Users/${id}/reset-password`);
	}

	// Delete user (soft delete)
	async deleteUser(id: number): Promise<ApiResponse<string>> {
		return this.delete<ApiResponse<string>>(`/Users/${id}`);
	}

	// Update own profile (email + phone)
	async updateProfile(id: number, payload: { email: string; phone: string }): Promise<User> {
		return this.put<User>(`/Users/${id}/profile`, payload);
	}

	// Upload profile image
	async uploadProfileImage(id: number, file: File): Promise<User> {
		const formData = new FormData();
		formData.append('file', file);
		return this.post<User>(`/Users/${id}/profile-image`, formData);
	}

	async getPayrollInsights(
		userId: number,
		params: { from: string; to: string; seriesGranularity: UserPayrollSeriesGranularity }
	): Promise<UserPayrollInsights> {
		return this.get<UserPayrollInsights>(`/Users/${userId}/payroll-insights`, {
			params: {
				from: params.from,
				to: params.to,
				seriesGranularity: params.seriesGranularity,
			},
		});
	}
}

export const userApi = new UserApi();
