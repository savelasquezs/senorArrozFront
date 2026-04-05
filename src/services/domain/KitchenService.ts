import type { OrderListItem } from '@/types/order'
import { orderStatusToStatusTimesKey } from '@/composables/useFormatting'

// Constantes de tiempo (sin feature flags)
const KITCHEN_MAX_TAKEN_TIME = 5 * 60 * 1000 // 5 minutos
const KITCHEN_MAX_PREPARATION_TIME = 15 * 60 * 1000 // 15 minutos

export class KitchenService {
    /**
     * Instante en que la cocina debe tomar la reserva: prepareAt, o reservedFor − 1h (misma regla que OrderRepository forKitchen).
     */
    static getReservationKitchenEntryTime(order: OrderListItem): Date | null {
        if (order.prepareAt != null && String(order.prepareAt).trim() !== '') {
            const d = new Date(order.prepareAt as string)
            return Number.isNaN(d.getTime()) ? null : d
        }
        if (order.reservedFor != null && String(order.reservedFor).trim() !== '') {
            const d = new Date(order.reservedFor as string)
            if (Number.isNaN(d.getTime())) return null
            return new Date(d.getTime() - 60 * 60 * 1000)
        }
        return null
    }

    /**
     * Reserva en «Tomado»: se muestra en «Reservas hoy» solo si es el día calendario Colombia del ancla
     * y aún NO llegó la hora de entrada a cocina (prepareAt o reservedFor−1h).
     */
    static isReservationTakenPendingKitchenTime(order: OrderListItem, now: Date = new Date()): boolean {
        if (order.type !== 'reservation' || order.status !== 'taken') return false
        const anchor = order.reservedFor ?? order.prepareAt
        if (anchor == null) return false
        const anchorDate = new Date(anchor as string)
        if (Number.isNaN(anchorDate.getTime())) return false
        const bogotaDay = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
        if (bogotaDay(anchorDate) !== bogotaDay(now)) return false

        const entry = this.getReservationKitchenEntryTime(order)
        if (!entry) return false
        return entry.getTime() > now.getTime()
    }

    static getElapsedTime(order: OrderListItem): number {
        const now = new Date()
        if (order.type === 'reservation' && order.status === 'taken') {
            const entry = this.getReservationKitchenEntryTime(order)
            if (entry) {
                return Math.max(0, now.getTime() - entry.getTime())
            }
        }

        const takenTime = order.statusTimes?.taken
        if (!takenTime) return 0

        const takenDate = new Date(takenTime)
        return now.getTime() - takenDate.getTime()
    }

    static getElapsedTimeInCurrentStatus(order: OrderListItem): number {
        const now = new Date()
        if (order.type === 'reservation' && order.status === 'taken') {
            const entry = this.getReservationKitchenEntryTime(order)
            if (entry) {
                return Math.max(0, now.getTime() - entry.getTime())
            }
        }

        const statusKey = orderStatusToStatusTimesKey(order.status)
        const currentStatusTime = order.statusTimes?.[statusKey]
        if (!currentStatusTime) return 0

        const statusDate = new Date(currentStatusTime)
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

