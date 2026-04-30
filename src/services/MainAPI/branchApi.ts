// src/services/branchApi.ts
import { BaseApi } from './baseApi';

/** Origen del host API sin sufijo /api (para imágenes en wwwroot). */
export function apiStaticOrigin(): string {
	const api = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
	return api.replace(/\/?api\/?$/i, '');
}
import type {
	ApiResponse,
	PagedResult,
	Branch,
	BranchFilters,
	BranchPrintSettings,
	UpdateBranchPrintSettingsPayload,
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
		payload: Pick<
			Branch,
			| 'name'
			| 'address'
			| 'phone1'
			| 'phone2'
			| 'latitude'
			| 'longitude'
			| 'businessName'
			| 'nit'
			| 'maxFreeDeliveryDiscount'
			| 'posCopyEtaMinMinutes'
			| 'posCopyEtaRangeMinutes'
		>
	): Promise<ApiResponse<Branch>> {
		return this.post<ApiResponse<Branch>>('/Branches', payload);
	}

	async updateBranch(
		id: number,
		payload: Pick<
			Branch,
			| 'name'
			| 'address'
			| 'phone1'
			| 'phone2'
			| 'latitude'
			| 'longitude'
			| 'businessName'
			| 'nit'
			| 'maxFreeDeliveryDiscount'
			| 'posCopyEtaMinMinutes'
			| 'posCopyEtaRangeMinutes'
		>
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
		branchId: number,
		neighborhoodId: number,
		payload: NeighborhoodFormData
	): Promise<ApiResponse<NeighborhoodSummary>> {
		return this.put<ApiResponse<NeighborhoodSummary>>(
			`/Branches/${branchId}/neighborhoods/${neighborhoodId}`,
			payload
		);
	}

	async deleteNeighborhood(
		branchId: number,
		neighborhoodId: number
	): Promise<ApiResponse<string>> {
		return this.delete<ApiResponse<string>>(
			`/Branches/${branchId}/neighborhoods/${neighborhoodId}`
		);
	}

	async updateBranchPrintSettings(
		branchId: number,
		payload: UpdateBranchPrintSettingsPayload
	): Promise<ApiResponse<BranchPrintSettings>> {
		return this.put<ApiResponse<BranchPrintSettings>>(
			`/Branches/${branchId}/print-settings`,
			payload
		);
	}

	async rotateBranchAgentToken(branchId: number): Promise<ApiResponse<{ plainToken: string }>> {
		return this.post<ApiResponse<{ plainToken: string }>>(
			`/Branches/${branchId}/print-settings/rotate-agent-token`,
			{}
		);
	}

	async uploadBranchReceiptLogo(branchId: number, file: File): Promise<ApiResponse<BranchPrintSettings>> {
		const fd = new FormData();
		fd.append('file', file);
		return this.post<ApiResponse<BranchPrintSettings>>(
			`/Branches/${branchId}/print-settings/receipt-logo`,
			fd
		);
	}

	async deleteBranchReceiptLogo(branchId: number): Promise<ApiResponse<BranchPrintSettings>> {
		return this.delete<ApiResponse<BranchPrintSettings>>(`/Branches/${branchId}/print-settings/receipt-logo`);
	}
}

export const branchApi = new BranchApi();
