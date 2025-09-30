// src/services/branchApi.ts
import { BaseApi } from './baseApi';
import type {
	ApiResponse,
	PagedResult,
	Branch,
	BranchFilters,
	NeighborhoodSummary,
} from '@/types/common';
import type { NeighborhoodFormData } from '@/types/customer';

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

	// Neighborhood management
	async createNeighborhood(
		payload: NeighborhoodFormData & { branchId: number }
	): Promise<ApiResponse<NeighborhoodSummary>> {
		return this.post<ApiResponse<NeighborhoodSummary>>(`/Branches/${payload.branchId}/neighborhoods`, payload);
	}

	async updateNeighborhood(
		id: number,
		payload: NeighborhoodFormData
	): Promise<ApiResponse<NeighborhoodSummary>> {
		return this.put<ApiResponse<NeighborhoodSummary>>(`/Branches/${id}/neighborhoods`, payload);
	}

	async deleteNeighborhood(id: number): Promise<ApiResponse<string>> {
		return this.delete<ApiResponse<string>>(`/Branches/${id}/neighborhoods`);
	}
}

export const branchApi = new BranchApi();
