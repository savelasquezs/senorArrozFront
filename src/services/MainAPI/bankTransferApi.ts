// src/services/MainAPI/bankTransferApi.ts
import { BaseApi } from './baseApi'
import type { PagedResult } from '@/types/common'
import type { BankTransfer, BankTransferFilters, CreateBankTransferDto } from '@/types/cashRegister'

class BankTransferApi extends BaseApi {
  async getBankTransfers(filters?: BankTransferFilters): Promise<PagedResult<BankTransfer>> {
    const params: Record<string, any> = {}
    if (filters) {
      if (filters.branchId !== undefined) params.BranchId = filters.branchId
      if (filters.fromBankId !== undefined) params.FromBankId = filters.fromBankId
      if (filters.toBankId !== undefined) params.ToBankId = filters.toBankId
      if (filters.fromDate) params.FromDate = filters.fromDate
      if (filters.toDate) params.ToDate = filters.toDate
      params.Page = filters.page || 1
      params.PageSize = filters.pageSize || 10
      if (filters.sortBy) params.SortBy = filters.sortBy
      if (filters.sortOrder) params.SortOrder = filters.sortOrder
    }
    return this.get<PagedResult<BankTransfer>>('/bank-transfers', { params })
  }

  async createBankTransfer(dto: CreateBankTransferDto): Promise<BankTransfer> {
    return this.post<BankTransfer>('/bank-transfers', dto)
  }
}

export const bankTransferApi = new BankTransferApi()
