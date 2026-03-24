import type {
    DeliverymanAdvance,
    DeliverymanStats,
    DeliverymanDetail,
    CreateDeliverymanAdvanceDto,
    UpdateDeliverymanAdvanceDto,
    SettleDeliverymanDayDto,
    SettleDeliverymanDayResultDto,
} from '@/types/deliveryman'
import type { PagedResult } from '@/types/common'
import type { OrderListItem } from '@/types/order'
import { BaseApi } from './baseApi'

export interface DailyOverviewResponse {
    deliverymen: DeliverymanStats[]
    advances: DeliverymanAdvance[]
}

export interface CreateAdvanceBody {
    amount: number
    notes?: string
}

/** Respuesta de GET /deliverymen/with-orders-today */
export interface DeliverymanWithOrdersTodayItem {
    id: number
    name: string
    ordersCount: number
    currentBalance: number
}

class DeliverymanApi extends BaseApi {
    /**
     * Resumen completo del día: domiciliarios con stats + abonos.
     */
    async getDailyOverview(params?: {
        date?: string
        fromDate?: string
        toDate?: string
        branchId?: number
    }): Promise<DailyOverviewResponse> {
        return this.get<DailyOverviewResponse>('/deliverymen/daily-overview', { params })
    }

    /**
     * Detalle de un domiciliario: stats + pedidos (para modal).
     */
    async getDaySummary(
        deliverymanId: number,
        params?: { date?: string; fromDate?: string; toDate?: string; baseAmount?: number }
    ): Promise<DeliverymanDetail> {
        const res = await this.get<{ stats: DeliverymanStats; orders: OrderListItem[] }>(
            `/deliverymen/${deliverymanId}/day-summary`,
            { params }
        )
        return { ...res.stats, orders: res.orders }
    }

    async settleDay(deliverymanId: number, payload: SettleDeliverymanDayDto): Promise<SettleDeliverymanDayResultDto> {
        return this.post<SettleDeliverymanDayResultDto>(`/deliverymen/${deliverymanId}/settle-day`, payload)
    }

    async unlockDay(deliverymanId: number, date: string): Promise<void> {
        await this.post<void>(`/deliverymen/${deliverymanId}/unlock-day`, {}, {
            params: { date },
        })
    }

    /**
     * Pedidos de un domiciliario (para modal de pedidos).
     */
    async getOrders(
        deliverymanId: number,
        params?: { date?: string; fromDate?: string; toDate?: string; page?: number; pageSize?: number }
    ): Promise<PagedResult<OrderListItem>> {
        return this.get<PagedResult<OrderListItem>>(`/deliverymen/${deliverymanId}/orders`, { params })
    }

    /**
     * Lista de abonos del período (opcional).
     */
    async getAdvances(params?: {
        date?: string
        fromDate?: string
        toDate?: string
    }): Promise<{ advances: DeliverymanAdvance[] }> {
        return this.get<{ advances: DeliverymanAdvance[] }>('/deliverymen/advances', { params })
    }

    /**
     * Domiciliarios con pedidos de delivery en el día actual (o rango dado).
     * Usado para seleccionar a quién aplicar un abono desde otros módulos.
     */
    async getWithOrdersToday(params?: {
        date?: string
        fromDate?: string
        toDate?: string
        branchId?: number
    }): Promise<DeliverymanWithOrdersTodayItem[]> {
        return this.get<DeliverymanWithOrdersTodayItem[]>('/deliverymen/with-orders-today', { params })
    }

    /**
     * Crea un nuevo abono para un domiciliario
     */
    async createAdvance(deliverymanId: number, data: CreateDeliverymanAdvanceDto | CreateAdvanceBody): Promise<DeliverymanAdvance> {
        return this.post<DeliverymanAdvance>(`/deliverymen/${deliverymanId}/advances`, {
            deliverymanId,
            amount: data.amount,
            notes: data.notes,
        })
    }

    /**
     * Actualiza un abono existente
     */
    async updateAdvance(deliverymanId: number, advanceId: number, data: UpdateDeliverymanAdvanceDto): Promise<DeliverymanAdvance> {
        return this.put<DeliverymanAdvance>(`/deliverymen/${deliverymanId}/advances/${advanceId}`, data)
    }

    /**
     * Elimina un abono
     */
    async deleteAdvance(deliverymanId: number, advanceId: number): Promise<void> {
        return this.delete<void>(`/deliverymen/${deliverymanId}/advances/${advanceId}`)
    }
}

export const deliverymanApi = new DeliverymanApi()

