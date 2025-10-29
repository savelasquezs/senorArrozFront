import type { OrderListItem } from '@/types/order'

export class DeliveryService {
    // Calcular tiempo de entrega (desde que salió hasta que entregó)
    static getDeliveryTime(order: OrderListItem): number {
        // ✅ Las claves en el backend son camelCase sin separador
        const onTheWayTime = order.statusTimes?.ontheway
        const deliveredTime = order.statusTimes?.delivered

        if (!onTheWayTime || !deliveredTime) return 0

        const startDate = new Date(onTheWayTime)
        const endDate = new Date(deliveredTime)
        return endDate.getTime() - startDate.getTime()
    }

    // Formatear tiempo de entrega
    static formatDeliveryTime(milliseconds: number): string {
        const totalMinutes = Math.floor(milliseconds / (1000 * 60))
        if (totalMinutes < 60) {
            return `${totalMinutes} min`
        }
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        return `${hours}h ${minutes}min`
    }

    // Calcular efectivo cobrado (total - bank - app payments)
    static getCashCollected(order: OrderListItem): number {
        const bankTotal = order.bankPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
        const appTotal = order.appPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
        return order.total - bankTotal - appTotal
    }

    // Calcular totales para historial
    static calculateTotals(orders: OrderListItem[]) {
        const cashTotal = orders.reduce((sum, o) => sum + this.getCashCollected(o), 0)
        const deliveryFeeTotal = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0)

        return {
            cashTotal,
            deliveryFeeTotal,
            grandTotal: cashTotal + deliveryFeeTotal
        }
    }
}

