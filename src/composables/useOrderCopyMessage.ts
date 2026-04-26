/**
 * Mensaje copiable para cliente (WhatsApp, etc.) según tipo de pedido y programación.
 */

import type { OrderType } from '@/types/order'
import { buildDeliveryCopyMessage } from '@/composables/useFreeDeliveryDiscount'

export interface BuildPosOrderCopyMessageParams {
    orderType: OrderType
    isLater: boolean
    addressId: number | null
    reservedFor: Date | string | null | undefined
    orderTotal: number
    deliveryFee: number
    freeDeliveryRequested: boolean
    maxBranchCap: number
    formatCurrency: (amount: number) => string
    formatTime: (date: string | Date) => string
    formatDateShort: (date: string | Date) => string
    guestName: string | null | undefined
    /** Texto de ventana aproximada, p. ej. "30-40 min". */
    etaPhrase: string
}

function toDate(value: Date | string | null | undefined): Date | null {
    if (value == null) return null
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return d
}

/** Línea final sobre a quién se reclama (recogida en tienda / evento). */
function guestClaimLine(guest: string | null | undefined): string {
    const g = (guest ?? '').trim()
    if (g) return ` Recuerda reclamar a nombre de ${g}.`
    return ' Recuerda identificarte al recoger tu pedido.'
}

function isDeliveryStyle(orderType: OrderType, addressId: number | null): boolean {
    if (orderType === 'delivery') return true
    if (orderType === 'reservation' && addressId != null) return true
    return false
}

/**
 * Construye el texto copiable unificado: onsite (recogida), delivery, reserva con o sin entrega a domicilio.
 */
export function buildPosOrderCopyMessage(p: BuildPosOrderCopyMessageParams): string {
    const fc = p.formatCurrency
    const total = Math.max(0, Math.round(Number(p.orderTotal) || 0))
    const reserved = toDate(p.reservedFor)
    const eta = p.etaPhrase

    if (p.orderType === 'onsite') {
        const recoger =
            p.isLater && reserved
                ? `y lo puedes recoger a las ${p.formatTime(reserved)}.`
                : `y lo puedes recoger en ${eta}.`
        return `El total serían ${fc(total)} ${recoger}${guestClaimLine(p.guestName)}`
    }

    if (isDeliveryStyle(p.orderType, p.addressId)) {
        let arrivalClosings: { plain: string; pesitos: string } | undefined

        if (p.orderType === 'reservation' && reserved) {
            const d = p.formatDateShort(reserved)
            const t = p.formatTime(reserved)
            const plain = ` y allá estaremos entonces el ${d} a las ${t}.`
            arrivalClosings = { plain, pesitos: `, y allá estaremos entonces el ${d} a las ${t}.` }
        } else if (p.orderType === 'delivery' && p.isLater && reserved) {
            const t = p.formatTime(reserved)
            const plain = ` y allá estaremos entonces a las ${t}.`
            arrivalClosings = { plain, pesitos: `, y allá estaremos entonces a las ${t}.` }
        }

        return buildDeliveryCopyMessage({
            deliveryFee: p.deliveryFee,
            orderTotal: p.orderTotal,
            freeDeliveryRequested: p.freeDeliveryRequested,
            maxBranchCap: p.maxBranchCap,
            formatCurrency: p.formatCurrency,
            etaPhrase: p.etaPhrase,
            arrivalClosings,
        })
    }

    if (p.orderType === 'reservation') {
        if (reserved) {
            return `El total serían ${fc(total)} y allá estaremos entonces el ${p.formatDateShort(reserved)} a las ${p.formatTime(reserved)}.${guestClaimLine(p.guestName)}`
        }
        return `El total serían ${fc(total)}.${guestClaimLine(p.guestName)}`
    }

    return `El total serían ${fc(total)}.`
}
