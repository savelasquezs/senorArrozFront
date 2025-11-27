import type { DeliverymanAdvance, CreateDeliverymanAdvanceDto, UpdateDeliverymanAdvanceDto } from '@/types/deliveryman'
import type { PagedResult } from '@/types/common'
import { BaseApi } from './baseApi'

class DeliverymanApi extends BaseApi {
    /**
     * Obtiene una lista paginada de abonos con filtros
     */
    async getAdvances(filters: {
        deliverymanId?: number
        branchId?: number
        fromDate?: string
        toDate?: string
        page?: number
        pageSize?: number
        sortBy?: string
        sortOrder?: string
    }): Promise<PagedResult<DeliverymanAdvance>> {
        return this.get<PagedResult<DeliverymanAdvance>>('/Users/advances', { params: filters })
    }

    /**
     * Crea un nuevo abono para un domiciliario
     */
    async createAdvance(deliverymanId: number, data: CreateDeliverymanAdvanceDto): Promise<DeliverymanAdvance> {
        return this.post<DeliverymanAdvance>(`/Users/${deliverymanId}/advances`, data)
    }

    /**
     * Actualiza un abono existente
     */
    async updateAdvance(deliverymanId: number, advanceId: number, data: UpdateDeliverymanAdvanceDto): Promise<DeliverymanAdvance> {
        return this.put<DeliverymanAdvance>(`/Users/${deliverymanId}/advances/${advanceId}`, data)
    }

    /**
     * Elimina un abono
     */
    async deleteAdvance(deliverymanId: number, advanceId: number): Promise<void> {
        return this.delete<void>(`/Users/${deliverymanId}/advances/${advanceId}`)
    }
}

export const deliverymanApi = new DeliverymanApi()

