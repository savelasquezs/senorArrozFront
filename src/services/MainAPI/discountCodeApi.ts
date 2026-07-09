import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type { DiscountCode, UpsertDiscountCode } from '@/types/discountCode'

class DiscountCodeApi extends BaseApi {
  getAll(branchId: number): Promise<ApiResponse<DiscountCode[]>> {
    return this.get<ApiResponse<DiscountCode[]>>(`/branches/${branchId}/discount-codes`)
  }

  validate(branchId: number, code: string, orderValue?: number): Promise<ApiResponse<DiscountCode>> {
    const params = new URLSearchParams({ code })
    if (typeof orderValue === 'number' && Number.isFinite(orderValue)) {
      params.set('orderValue', String(Math.max(0, Math.round(orderValue))))
    }
    return this.get<ApiResponse<DiscountCode>>(`/branches/${branchId}/discount-codes/validate?${params.toString()}`)
  }

  create(branchId: number, payload: UpsertDiscountCode): Promise<ApiResponse<DiscountCode>> {
    return this.post<ApiResponse<DiscountCode>>(`/branches/${branchId}/discount-codes`, payload)
  }

  update(branchId: number, payload: UpsertDiscountCode): Promise<ApiResponse<DiscountCode>> {
    return this.put<ApiResponse<DiscountCode>>(`/branches/${branchId}/discount-codes`, payload)
  }

  remove(branchId: number, id: number): Promise<ApiResponse<DiscountCode | null>> {
    return this.delete<ApiResponse<DiscountCode | null>>(`/branches/${branchId}/discount-codes/${id}`)
  }
}

export const discountCodeApi = new DiscountCodeApi()
