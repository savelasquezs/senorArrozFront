import type { OrderListItem } from '@/types/order'

// Constantes de tiempo (sin feature flags)
const KITCHEN_MAX_TAKEN_TIME = 5 * 60 * 1000 // 5 minutos
const KITCHEN_MAX_PREPARATION_TIME = 15 * 60 * 1000 // 15 minutos

export class KitchenService {
    /** Día calendario UTC de reservedFor o prepareAt coincide con hoy UTC (paridad con filtro cocina en API). */
    static isReservationTakenSameUtcServiceDay(order: OrderListItem): boolean {
        if (order.type !== 'reservation' || order.status !== 'taken') return false
        const anchor = order.reservedFor ?? order.prepareAt
        if (anchor == null) return false
        const d = new Date(anchor as string)
        if (Number.isNaN(d.getTime())) return false
        const now = new Date()
        const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
        const dayEnd = dayStart + 86400000
        const t = d.getTime()
        return t >= dayStart && t < dayEnd
    }

    static getElapsedTime(order: OrderListItem): number {
        // Para reservas: contar desde prepareAt (cuando debe empezar la cocina)
        if (order.type === 'reservation' && order.prepareAt) {
            const prepareAtDate = new Date(order.prepareAt)
            const now = new Date()
            const elapsed = now.getTime() - prepareAtDate.getTime()
            return Math.max(0, elapsed)
        }

        const takenTime = order.statusTimes?.taken
        if (!takenTime) return 0

        const takenDate = new Date(takenTime)
        const now = new Date()
        return now.getTime() - takenDate.getTime()
    }

    static getElapsedTimeInCurrentStatus(order: OrderListItem): number {
        // Para reservas en "taken": el estado empezó en prepareAt
        if (order.type === 'reservation' && order.prepareAt && order.status === 'taken') {
            const prepareAtDate = new Date(order.prepareAt)
            const now = new Date()
            const elapsed = now.getTime() - prepareAtDate.getTime()
            return Math.max(0, elapsed)
        }

        const statusKey = order.status === 'in_preparation' ? 'inpreparation' : order.status === 'on_the_way' ? 'ontheway' : order.status
        const currentStatusTime = order.statusTimes?.[statusKey]
        if (!currentStatusTime) return 0

        const statusDate = new Date(currentStatusTime)
        const now = new Date()
        return now.getTime() - statusDate.getTime()
    }

    /** Hora de tener listo = prepareAt + 30 min. Solo para reservas. */
    static getReadyByTime(order: OrderListItem): Date | null {
        if (order.type !== 'reservation' || !order.prepareAt) return null
        const d = new Date(order.prepareAt)
        d.setMinutes(d.getMinutes() + 30)
        return d
    }

    static formatReadyByTime(date: Date): string {
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
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

    static generateOrderNotificationText(order: OrderListItem, products: Array<{ name: string; quantity: number }>): string {
        const items = products.map(p => `${p.quantity}x ${p.name}`).join(', ')
        return `Pedido #${order.id}: ${items}`
    }

    /** Notificación en pantalla cuando un pedido ya en cocina se modifica (horario, notas, productos). */
    static generateOrderModifiedNotificationText(
        order: OrderListItem,
        products: Array<{ name: string; quantity: number }>,
        kind: string
    ): string {
        const items = products.length ? products.map(p => `${p.quantity}x ${p.name}`).join(', ') : 'revisa el pedido'
        const prefix =
            kind === 'schedule' ? 'Cambio de horario. ' : kind === 'content' ? 'Cambios en el pedido. ' : 'Actualización. '
        return `${prefix}#${order.id}: ${items}`
    }

    /** Texto para TTS en pedido modificado (taken / in_preparation). */
    static generateOrderModifiedSpeechText(
        order: OrderListItem,
        products: Array<{ name: string; quantity: number }>,
        kind: string
    ): string {
        const items = products.map((p, index) => {
            const quantity = p.quantity === 1 ? 'una' : p.quantity === 2 ? 'dos' : p.quantity === 3 ? 'tres' : `${p.quantity}`
            const isLast = index === products.length - 1
            const connector = isLast && products.length > 1 ? ' y ' : ', '
            return `${quantity} ${p.name}${!isLast ? connector : ''}`
        })
        const intro =
            kind === 'schedule'
                ? 'Atención cocina. Cambio de horario en el pedido número'
                : kind === 'content'
                  ? 'Atención cocina. Pedido número'
                  : 'Atención cocina. Actualización del pedido número'
        const tail = items.length ? `: ${items.join('')}` : ''
        return `${intro} ${order.id}${tail}`
    }
}

