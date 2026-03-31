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
}

export const printJobsApi = new PrintJobsApi()
