/**
 * Mensaje copiable para cliente (WhatsApp, etc.) según tipo de pedido y programación.
 */

import type { DraftOrder, OrderType } from '@/types/order'
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
    /** Nombres de las líneas gratis agregadas por un beneficio. */
    freeGiftProductNames?: string[]
    /** Porcentaje de descuento aplicado por promo, fidelización o código. */
    benefitDiscountPercentage?: number | null
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

function friendlyGiftName(productName: string): string {
    const normalized = productName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    if (normalized.includes('yuca')) return 'unas yuquitas'
    if (normalized.includes('papa')) return 'unas papitas'
    if (normalized.includes('costilla')) return 'una costillita'
    if (normalized.includes('gaseosa')) return 'una gaseosita'
    if (normalized.includes('chicharron')) return 'un chicharroncito'
    return productName.trim()
}

function appendGiftBenefit(message: string, productNames: string[] | undefined): string {
    const gifts = [...new Set((productNames ?? []).map(friendlyGiftName).filter(Boolean))]
    if (gifts.length === 0) return message

    const description = gifts.length === 1
        ? gifts[0]
        : `${gifts.slice(0, -1).join(', ')} y ${gifts[gifts.length - 1]}`
    return `${message}\n\nHoy te llegan ${description} gratis\n¿Deseas algo de tomar?`
}

function applyPercentageBenefit(
    message: string,
    percentage: number | null | undefined,
    total: number,
    formatCurrency: (amount: number) => string,
): string {
    const value = Number(percentage)
    if (!Number.isFinite(value) || value <= 0) return message

    const formattedPercentage = Number.isInteger(value)
        ? String(value)
        : value.toLocaleString('es-CO', { maximumFractionDigits: 2 })
    const formattedTotal = formatCurrency(total)
    const withFinalTotal = message
        .replace(`El total serían ${formattedTotal}`, `En total pagas ${formattedTotal}`)
        .replace(`serían ${formattedTotal}`, `en total pagas ${formattedTotal}`)
    const continuation = withFinalTotal.charAt(0).toLowerCase() + withFinalTotal.slice(1)
    return `Hoy tienes ${formattedPercentage}% de descuento, ${continuation}`
}

function finalizeBenefitMessage(message: string, p: BuildPosOrderCopyMessageParams, total: number): string {
    const withDiscount = applyPercentageBenefit(
        message,
        p.benefitDiscountPercentage,
        total,
        p.formatCurrency,
    )
    return appendGiftBenefit(withDiscount, p.freeGiftProductNames)
}

/**
 * Obtiene el regalo desde las líneas marcadas y, como respaldo, desde los metadatos
 * persistidos del beneficio. Esto cubre borradores antiguos cuyas líneas no guardaron el flag.
 */
export function resolveFreeGiftProductNames(order: DraftOrder): string[] {
    const marked = order.orderItems
        .filter(item =>
            item.isDailyPromotionGift === true ||
            item.isLoyaltyGift === true ||
            item.isDiscountCodeGift === true)
        .map(item => item.productName)
        .filter(Boolean)

    if (marked.length > 0) return marked
    const rewardType = order.appliedBenefitRewardType
        ?? (order.appliedBenefitType === 'DailyPromotion' ? order.appliedDailyPromotionType : null)
        ?? (order.appliedBenefitType === 'Loyalty' ? order.appliedLoyaltyRewardType : null)
        ?? (order.appliedBenefitType === 'DiscountCode' ? order.appliedDiscountCodeType : null)
    if (rewardType?.toLowerCase() !== 'giftproduct') return []

    const benefitName = order.appliedBenefitType === 'DailyPromotion'
        ? order.appliedDailyPromotionGiftProductName
        : order.appliedBenefitType === 'Loyalty'
            ? order.appliedLoyaltyGiftProductName
            : order.appliedBenefitType === 'DiscountCode'
                ? order.appliedDiscountCodeGiftProductName
                : null

    return benefitName?.trim() ? [benefitName] : []
}

export function resolveBenefitDiscountPercentage(order: DraftOrder): number | null {
    const rewardType = order.appliedBenefitRewardType
        ?? (order.appliedBenefitType === 'DailyPromotion' ? order.appliedDailyPromotionType : null)
        ?? (order.appliedBenefitType === 'Loyalty' ? order.appliedLoyaltyRewardType : null)
        ?? (order.appliedBenefitType === 'DiscountCode' ? order.appliedDiscountCodeType : null)
    if (rewardType?.toLowerCase() !== 'percentagediscount') return null

    const value = order.appliedBenefitAmount
        ?? (order.appliedBenefitType === 'DailyPromotion' ? order.appliedDailyPromotionDiscountPercentage : null)
        ?? (order.appliedBenefitType === 'Loyalty' ? order.appliedLoyaltyDiscountPercentage : null)
        ?? (order.appliedBenefitType === 'DiscountCode' ? order.appliedDiscountCodeDiscountPercentage : null)
    const percentage = Number(value)
    return Number.isFinite(percentage) && percentage > 0 ? percentage : null
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
        return finalizeBenefitMessage(
            `El total serían ${fc(total)} ${recoger}${guestClaimLine(p.guestName)}`,
            p,
            total,
        )
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

        return finalizeBenefitMessage(buildDeliveryCopyMessage({
            deliveryFee: p.deliveryFee,
            orderTotal: p.orderTotal,
            freeDeliveryRequested: p.freeDeliveryRequested,
            maxBranchCap: p.maxBranchCap,
            formatCurrency: p.formatCurrency,
            etaPhrase: p.etaPhrase,
            arrivalClosings,
        }), p, total)
    }

    if (p.orderType === 'reservation') {
        if (reserved) {
            return finalizeBenefitMessage(
                `El total serían ${fc(total)} y allá estaremos entonces el ${p.formatDateShort(reserved)} a las ${p.formatTime(reserved)}.${guestClaimLine(p.guestName)}`,
                p,
                total,
            )
        }
        return finalizeBenefitMessage(
            `El total serían ${fc(total)}.${guestClaimLine(p.guestName)}`,
            p,
            total,
        )
    }

    return finalizeBenefitMessage(`El total serían ${fc(total)}.`, p, total)
}
