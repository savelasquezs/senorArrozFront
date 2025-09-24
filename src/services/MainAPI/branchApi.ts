// src/services/branchApi.ts
import { BaseApi } from './baseApi';
import type {
	ApiResponse,
	PagedResult,
	Branch,
	BranchFilters,
} from '@/types/common';

class BranchApi extends BaseApi {
	async getAllBranches(
		params?: Partial<BranchFilters>
	): Promise<ApiResponse<PagedResult<Branch>>> {
		return this.get<ApiResponse<PagedResult<Branch>>>('/Branches/all', {
			params,
		});
	}

	async getBranches(
		filters?: BranchFilters
	): Promise<ApiResponse<PagedResult<Branch>>> {
		return this.get<ApiResponse<PagedResult<Branch>>>('/Branches', {
			params: filters,
		});
	}

	async getBranchById(id: number): Promise<ApiResponse<Branch>> {
		return this.get<ApiResponse<Branch>>(`/Branches/${id}`);
	}

	async createBranch(
		payload: Pick<Branch, 'name' | 'address' | 'phone1' | 'phone2'>
	): Promise<ApiResponse<Branch>> {
		return this.post<ApiResponse<Branch>>('/Branches', payload);
	}

	async updateBranch(
		id: number,
		payload: Pick<Branch, 'name' | 'address' | 'phone1' | 'phone2'>
	): Promise<ApiResponse<Branch>> {
		return this.put<ApiResponse<Branch>>(`/Branches/${id}`, payload);
	}

	async deleteBranch(id: number): Promise<ApiResponse<string>> {
		return this.delete<ApiResponse<string>>(`/Branches/${id}`);
	}
}

export const branchApi = new BranchApi();
