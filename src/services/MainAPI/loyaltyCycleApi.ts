import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type { LoyaltyCycleStep, UpsertLoyaltyCycleStep } from '@/types/loyaltyCycle'

class LoyaltyCycleApi extends BaseApi {
  getCycle(branchId: number): Promise<ApiResponse<LoyaltyCycleStep[]>> {
    return this.get<ApiResponse<LoyaltyCycleStep[]>>(`/branches/${branchId}/loyalty-cycle`)
  }

  saveCycle(branchId: number, payload: UpsertLoyaltyCycleStep[]): Promise<ApiResponse<LoyaltyCycleStep[]>> {
    return this.put<ApiResponse<LoyaltyCycleStep[]>>(`/branches/${branchId}/loyalty-cycle`, payload)
  }

  saveStep(branchId: number, stepId: number, payload: UpsertLoyaltyCycleStep): Promise<ApiResponse<LoyaltyCycleStep>> {
    return this.put<ApiResponse<LoyaltyCycleStep>>(`/branches/${branchId}/loyalty-cycle/${stepId}`, payload)
  }

  disableStep(branchId: number, stepId: number): Promise<ApiResponse<LoyaltyCycleStep | null>> {
    return this.delete<ApiResponse<LoyaltyCycleStep | null>>(`/branches/${branchId}/loyalty-cycle/${stepId}`)
  }
}

export const loyaltyCycleApi = new LoyaltyCycleApi()
