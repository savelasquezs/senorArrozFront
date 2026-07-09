import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type { DailyPromotion, UpsertDailyPromotion } from '@/types/dailyPromotion'

class DailyPromotionApi extends BaseApi {
  getActive(branchId: number): Promise<ApiResponse<DailyPromotion | null>> {
    return this.get<ApiResponse<DailyPromotion | null>>(`/branches/${branchId}/daily-promotion/active`)
  }

  getCurrent(branchId: number): Promise<ApiResponse<DailyPromotion | null>> {
    return this.get<ApiResponse<DailyPromotion | null>>(`/branches/${branchId}/daily-promotion`)
  }

  save(branchId: number, payload: UpsertDailyPromotion): Promise<ApiResponse<DailyPromotion>> {
    return this.put<ApiResponse<DailyPromotion>>(`/branches/${branchId}/daily-promotion`, payload)
  }

  disable(branchId: number): Promise<ApiResponse<DailyPromotion | null>> {
    return this.delete<ApiResponse<DailyPromotion | null>>(`/branches/${branchId}/daily-promotion`)
  }
}

export const dailyPromotionApi = new DailyPromotionApi()
