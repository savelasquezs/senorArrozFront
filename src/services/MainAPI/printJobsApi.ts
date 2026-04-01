import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'

export type EnqueuePrintJobResponse = {
	jobId: number
}

class PrintJobsApi extends BaseApi {
	async enqueueKitchenJob(
		branchId: number,
		orderIds: number[]
	): Promise<ApiResponse<EnqueuePrintJobResponse>> {
		return this.post<ApiResponse<EnqueuePrintJobResponse>>(`/branches/${branchId}/print-jobs`, {
			kind: 'kitchen',
			orderIds,
		})
	}

	async enqueueDeliveryJob(
		branchId: number,
		orderIds: number[]
	): Promise<ApiResponse<EnqueuePrintJobResponse>> {
		return this.post<ApiResponse<EnqueuePrintJobResponse>>(`/branches/${branchId}/print-jobs`, {
			kind: 'delivery',
			orderIds,
		})
	}

	/** Payload ficticio; solo cocina o domicilio (administradores). */
	async enqueueTestPrintJob(
		branchId: number,
		kind: 'kitchen' | 'delivery'
	): Promise<ApiResponse<EnqueuePrintJobResponse>> {
		return this.post<ApiResponse<EnqueuePrintJobResponse>>(
			`/branches/${branchId}/print-jobs/test`,
			{ kind }
		)
	}
}

export const printJobsApi = new PrintJobsApi()
