// src/services/userApi.ts
import { BaseApi } from './baseApi';
import type { ApiResponse } from '@/types/common';
import type { UserRoleType } from '@/types/auth';

class UserApi extends BaseApi {
	async createUser(payload: {
		name: string;
		email: string;
		password: string;
		role: UserRoleType;
		branchId?: number;
	}): Promise<ApiResponse<any>> {
		return this.post<ApiResponse<any>>('/Users', payload);
	}

	async updateUser(
		id: number,
		payload: {
			name?: string;
			email?: string;
			role?: UserRoleType;
			active?: boolean;
		}
	): Promise<ApiResponse<any>> {
		return this.put<ApiResponse<any>>(`/Users/${id}`, payload);
	}
}

export const userApi = new UserApi();
