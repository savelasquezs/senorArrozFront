import { BaseApi } from './baseApi'
import { orderMutationConfig, type OrderMutationSnapshot } from './orderMutation'
import type { PagedResult } from '@/types/common'
import type { ReservationDeposit, CreateReservationDepositDto } from '@/types/reservationDeposit'

class ReservationDepositApi extends BaseApi {
  async getByOrder(orderId: number): Promise<ReservationDeposit[]> {
    return this.get<ReservationDeposit[]>(`/reservationdeposits/by-order/${orderId}`)
  }

  async create(dto: CreateReservationDepositDto, snapshot?: OrderMutationSnapshot): Promise<ReservationDeposit> {
    return this.post<ReservationDeposit>('/reservationdeposits', dto, orderMutationConfig(snapshot))
  }

  async updateAmount(id: number, amount: number, snapshot?: OrderMutationSnapshot): Promise<ReservationDeposit> {
    return this.put<ReservationDeposit>(`/reservationdeposits/${id}`, { amount }, orderMutationConfig(snapshot))
  }

  async remove(id: number, snapshot?: OrderMutationSnapshot): Promise<void> {
    try {
      await this.api.delete(`/reservationdeposits/${id}`, orderMutationConfig(snapshot))
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  async getPaged(filters?: {
    branchId?: number
    fromDate?: string
    toDate?: string
    orderId?: number
    page?: number
    pageSize?: number
  }): Promise<PagedResult<ReservationDeposit>> {
    const params: Record<string, any> = {}
    if (filters?.branchId !== undefined) params.branchId = filters.branchId
    if (filters?.fromDate) params.fromDate = filters.fromDate
    if (filters?.toDate) params.toDate = filters.toDate
    if (filters?.orderId !== undefined) params.orderId = filters.orderId
    params.page = filters?.page ?? 1
    params.pageSize = filters?.pageSize ?? 20
    return this.get<PagedResult<ReservationDeposit>>('/reservationdeposits', { params })
  }
}

export const reservationDepositApi = new ReservationDepositApi()
