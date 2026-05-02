import type { OrderListItem } from '@/types/order'
import type { KitchenOrderModificationSummary } from '@/types/kitchenModification'
import { orderStatusToStatusTimesKey } from '@/composables/useFormatting'
import { defaultBusinessCalendar } from '@/utils/datetime'

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
        const businessDay = (x: Date) => defaultBusinessCalendar.formatYmd(x)
        if (businessDay(anchorDate) !== businessDay(now)) return false

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
        return defaultBusinessCalendar.formatTime(date)
    }

    /**
     * Misma regla que backend: taken/in_preparation y reserva solo si ya pasó la hora de entrada a cocina.
     */
    static isVisibleToActiveKitchenForAlerts(order: OrderListItem, now: Date = new Date()): boolean {
        if (order.status !== 'taken' && order.status !== 'in_preparation') return false
        if (order.type !== 'reservation') return true
        const entry = this.getReservationKitchenEntryTime(order)
        if (!entry) return false
        return entry.getTime() <= now.getTime()
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

    private static qtyWord(n: number): string {
        if (n === 1) return 'una'
        if (n === 2) return 'dos'
        if (n === 3) return 'tres'
        return `${n}`
    }

    /** Texto de notas del pedido listo para TTS / notificación (espacios y longitud). */
    private static formatOrderNotesForVoice(notes: string | null | undefined, maxLen = 400): string {
        const t = (notes ?? '').replace(/\s+/g, ' ').trim()
        if (!t) return ''
        if (t.length <= maxLen) return t
        return `${t.slice(0, maxLen)}…`
    }

    /** Cuerpo de notificación del navegador (sin título). */
    static buildOrderModifiedNotificationBody(
        orderId: number,
        _kind: string,
        changes: KitchenOrderModificationSummary | null | undefined,
        /** Notas actuales del pedido tras el cambio (para leer en voz si notesChanged). */
        orderNotes?: string | null
    ): { body: string; usedFallback: boolean } {
        const intro = `Modificación del pedido número ${orderId}.`
        const parts: string[] = []

        if (changes) {
            const rep = changes.productReplacements ?? []
            for (const r of rep) {
                parts.push(`Cambio de ${r.previousProductName} por ${r.newProductName}.`)
            }
            const added = changes.addedLines ?? []
            if (added.length === 1) {
                parts.push(`Se agregó ${this.qtyWord(added[0].quantity)} ${added[0].productName}.`)
            } else if (added.length > 1) {
                parts.push(
                    `Se agregaron: ${added.map((a) => `${a.quantity}x ${a.productName}`).join(', ')}.`
                )
            }
            const rem = changes.removedLines ?? []
            if (rem.length === 1) {
                parts.push(`Ya el pedido no lleva: ${rem[0].productName}.`)
            } else if (rem.length > 1) {
                parts.push(`Ya el pedido no lleva: ${rem.map((r) => r.productName).join(', ')}.`)
            }
            const qc = changes.quantityChanges ?? []
            for (const q of qc) {
                const dir =
                    q.newQuantity > q.previousQuantity ? 'se aumentó' : 'se disminuyó'
                parts.push(
                    `Ya no es ${this.qtyWord(q.previousQuantity)} de ${q.productName}, ${dir} a ${this.qtyWord(q.newQuantity)}.`
                )
            }
            if (changes.scheduleChanged) {
                if (changes.scheduleChangeKind === 'prepare_now') {
                    parts.push('Se cambió la hora del pedido. Queda para preparar ya.')
                } else if (changes.scheduleChangeKind === 'reservation') {
                    parts.push('Se cambió la hora del pedido. Queda como reserva.')
                } else {
                    parts.push('Se cambió la hora del pedido.')
                }
            }
            if (changes.notesChanged) {
                const spoken = this.formatOrderNotesForVoice(orderNotes)
                if (spoken) {
                    parts.push(spoken.endsWith('.') ? spoken : `${spoken}.`)
                }
            }
        }

        const usedFallback = parts.length === 0
        const mid = usedFallback ? 'Cambio en el pedido. Verifica en pantalla.' : parts.join(' ')
        const closing = usedFallback ? '' : ' Verifica en tu pantalla los cambios.'
        return { body: `${intro} ${mid}${closing}`.replace(/\s+/g, ' ').trim(), usedFallback }
    }

    /** Texto completo para TTS. */
    static buildOrderModifiedSpeechText(
        orderId: number,
        kind: string,
        changes: KitchenOrderModificationSummary | null | undefined,
        orderNotes?: string | null
    ): string {
        const { body } = this.buildOrderModifiedNotificationBody(orderId, kind, changes, orderNotes)
        return `Atención cocina. ${body}`
    }

    /** Título corto para notificación del sistema. */
    static buildOrderModifiedNotificationTitle(orderId: number): string {
        return `Pedido #${orderId} modificado`
    }
}

