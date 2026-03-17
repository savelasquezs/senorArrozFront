import { BaseApi } from './baseApi'
import type { PagedResult } from '@/types/common'
import type { ReservationDeposit, CreateReservationDepositDto } from '@/types/reservationDeposit'

class ReservationDepositApi extends BaseApi {
  async getByOrder(orderId: number): Promise<ReservationDeposit[]> {
    return this.get<ReservationDeposit[]>(`/reservation-deposits/by-order/${orderId}`)
  }

  async create(dto: CreateReservationDepositDto): Promise<ReservationDeposit> {
    return this.post<ReservationDeposit>('/reservation-deposits', dto)
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
    return this.get<PagedResult<ReservationDeposit>>('/reservation-deposits', { params })
  }
}

export const reservationDepositApi = new ReservationDepositApi()
