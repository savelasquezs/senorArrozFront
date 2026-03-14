// src/services/MainAPI/cashRegisterApi.ts
import { BaseApi } from './baseApi'
import type { PagedResult } from '@/types/common'
import type {
  CashClosure,
  CashRegisterExpected,
  CloseCashRegisterDto,
} from '@/types/cashRegister'

class CashRegisterApi extends BaseApi {
  async getLastClosure(branchId?: number): Promise<CashClosure | null> {
    const params: Record<string, any> = {}
    if (branchId !== undefined) params.BranchId = branchId
    try {
      return await this.get<CashClosure>('/cash-register/last-closure', { params })
    } catch (e: any) {
      if (e.message?.includes('404')) return null
      throw e
    }
  }

  async getExpected(branchId?: number): Promise<CashRegisterExpected> {
    const params: Record<string, any> = {}
    if (branchId !== undefined) params.BranchId = branchId
    return this.get<CashRegisterExpected>('/cash-register/expected', { params })
  }

  async closeCashRegister(dto: CloseCashRegisterDto, branchId?: number): Promise<CashClosure> {
    const params: Record<string, any> = {}
    if (branchId !== undefined) params.BranchId = branchId
    return this.post<CashClosure>('/cash-register/close', dto, { params })
  }

  async getClosures(branchId?: number, page = 1, pageSize = 10): Promise<PagedResult<CashClosure>> {
    const params: Record<string, any> = { Page: page, PageSize: pageSize }
    if (branchId !== undefined) params.BranchId = branchId
    return this.get<PagedResult<CashClosure>>('/cash-register/closures', { params })
  }

  async getClosureById(id: number): Promise<CashClosure> {
    return this.get<CashClosure>(`/cash-register/closures/${id}`)
  }
}

export const cashRegisterApi = new CashRegisterApi()
