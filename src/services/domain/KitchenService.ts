import type { OrderListItem } from '@/types/order'

// Constantes de tiempo (sin feature flags)
const KITCHEN_MAX_TAKEN_TIME = 5 * 60 * 1000 // 5 minutos
const KITCHEN_MAX_PREPARATION_TIME = 15 * 60 * 1000 // 15 minutos

export class KitchenService {
    static getElapsedTime(order: OrderListItem): number {
        const takenTime = order.statusTimes?.taken
        if (!takenTime) return 0

        const takenDate = new Date(takenTime)
        const now = new Date()
        return now.getTime() - takenDate.getTime()
    }

    static getElapsedTimeInCurrentStatus(order: OrderListItem): number {
        const currentStatusTime = order.statusTimes?.[order.status]
        if (!currentStatusTime) return 0

        const statusDate = new Date(currentStatusTime)
        const now = new Date()
        return now.getTime() - statusDate.getTime()
    }

    static getCardColorClass(order: OrderListItem): string {
        const elapsed = this.getElapsedTimeInCurrentStatus(order)
        const maxTime = order.status === 'taken'
            ? KITCHEN_MAX_TAKEN_TIME
            : KITCHEN_MAX_PREPARATION_TIME

        const percentage = (elapsed / maxTime) * 100

        if (percentage < 50) return 'bg-green-50 border-green-400'
        if (percentage < 75) return 'bg-yellow-50 border-yellow-400'
        if (percentage < 100) return 'bg-orange-50 border-orange-400'
        return 'bg-red-50 border-red-400'
    }

    static formatElapsedTime(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    static generateOrderSpeechText(order: OrderListItem, products: Array<{ name: string; quantity: number }>): string {
        const items = products.map((p, index) => {
            const quantity = p.quantity === 1 ? 'una' : p.quantity === 2 ? 'dos' : p.quantity === 3 ? 'tres' : `${p.quantity}`
            const isLast = index === products.length - 1
            const connector = isLast && products.length > 1 ? ' y ' : ', '
            return `${quantity} ${p.name}${!isLast ? connector : ''}`
        })

        return `Nuevo pedido número ${order.id}: ${items.join('')}`
    }
}

