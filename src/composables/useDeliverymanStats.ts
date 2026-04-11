import type { OrderListItem } from '@/types/order'
import type { DeliverymanStats } from '@/types/deliveryman'
import { orderCashToCollect } from '@/utils/orderCashToCollect'

export function useDeliverymanStats() {
    /**
     * Calcula estadísticas de un domiciliario basado en sus pedidos y abonos
     */
    const calculateStats = (
        deliverymanId: number,
        deliverymanName: string,
        orders: OrderListItem[],
        totalAdvances: number,
        baseAmount: number = 55000
    ): DeliverymanStats => {
        const totalCash = orders.reduce(
            (sum, order) =>
                sum +
                orderCashToCollect(order.total, {
                    bankPayments: order.bankPayments,
                    appPayments: order.appPayments,
                }, { paidInStoreCash: order.paidInStoreCash === true }),
            0
        )

        // Total de delivery fees
        const totalDeliveryFee = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0)

        // Tiempo promedio de entrega (en minutos)
        let averageDeliveryTime = 0
        if (orders.length > 0) {
            const totalTime = orders.reduce((sum, order) => {
                if (order.statusTimes?.ready && order.statusTimes?.delivered) {
                    const readyTime = new Date(order.statusTimes.ready).getTime()
                    const deliveredTime = new Date(order.statusTimes.delivered).getTime()
                    return sum + (deliveredTime - readyTime)
                }
                return sum
            }, 0)
            averageDeliveryTime = Math.round(totalTime / orders.length / 1000 / 60) // Convertir a minutos
        }

        // Balance actual
        const currentBalance = totalCash + baseAmount - totalAdvances

        return {
            deliverymanId,
            deliverymanName,
            ordersCount: orders.length,
            averageDeliveryTime,
            totalCash,
            totalDeliveryFee,
            totalAdvances,
            baseAmount,
            currentBalance
        }
    }

    /**
     * Calcula el monto sugerido de abono para dejar al domiciliario solo con la base
     */
    const calculateSuggestedAdvance = (totalCash: number, totalAdvances: number): number => {
        const suggested = totalCash - totalAdvances
        return suggested > 0 ? suggested : 0
    }

    /**
     * Calcula el monto máximo permitido para un abono
     */
    const calculateMaxAdvance = (totalCash: number, totalAdvances: number, baseAmount: number): number => {
        return totalCash + baseAmount - totalAdvances
    }

    return {
        calculateStats,
        calculateSuggestedAdvance,
        calculateMaxAdvance
    }
}

