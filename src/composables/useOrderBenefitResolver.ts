import { computed, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useDailyPromotionStore } from '@/store/dailyPromotion'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { loyaltyCycleApi } from '@/services/MainAPI/loyaltyCycleApi'
import type { AppliedBenefitType, DraftOrder } from '@/types/order'
import type { Customer } from '@/types/customer'
import type { DailyPromotion } from '@/types/dailyPromotion'
import type { LoyaltyCycleStep } from '@/types/loyaltyCycle'
import type { DiscountCode } from '@/types/discountCode'

const activeDailyPromotion = ref<DailyPromotion | null>(null)
const activeLoyaltyStep = ref<LoyaltyCycleStep | null>(null)
const activeDiscountCode = ref<DiscountCode | null>(null)
const conflictExists = ref(false)
const isResolving = ref(false)
const cycleByBranch = new Map<number, LoyaltyCycleStep[]>()
const cycleInFlight = new Map<number, Promise<LoyaltyCycleStep[]>>()

const currency = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
})

const realItems = (order: DraftOrder) =>
    order.orderItems.filter((item) =>
        item.isDailyPromotionGift !== true &&
        item.isLoyaltyGift !== true &&
        item.isDiscountCodeGift !== true)

const realItemsCount = (order: DraftOrder) => realItems(order).length

const purchasedProductsGrossSubtotal = (order: DraftOrder) =>
    realItems(order).reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice), 0)

const promotionMinimumReached = (order: DraftOrder, promo: DailyPromotion) => {
    const minimum = Math.max(0, Number(promo.minimumOrderValue ?? 0) || 0)
    return minimum <= 0 || purchasedProductsGrossSubtotal(order) >= minimum
}

const discountCodeIsEligible = (order: DraftOrder, code: DiscountCode | null | undefined) => {
    if (!code?.isActive) return false
    const now = Date.now()
    const startsAt = new Date(code.startsAt).getTime()
    const endsAt = code.endsAt ? new Date(code.endsAt).getTime() : null
    if (Number.isFinite(startsAt) && startsAt > now) return false
    if (endsAt != null && Number.isFinite(endsAt) && endsAt <= now) return false
    const minimum = Math.max(0, Number(code.minimumOrderValue ?? 0) || 0)
    return minimum <= 0 || purchasedProductsGrossSubtotal(order) >= minimum
}

const summarizeDailyPromotion = (promo: DailyPromotion | null) => {
    if (!promo) return 'Promo del dia'
    if (promo.type === 'GiftProduct') return `${promo.giftProductName ?? 'Producto gratis'} gratis`
    if (promo.type === 'FreeDelivery') return 'Domicilio gratis'
    if (promo.type === 'PercentageDiscount') {
        const percentage = Number(promo.discountPercentage ?? 0) || 0
        const scope = promo.discountScope === 'SpecificProducts' ? ' en productos seleccionados' : ''
        return `${percentage}% de descuento${scope}`
    }
    return 'Promo del dia'
}

const summarizeLoyaltyStep = (step: LoyaltyCycleStep | null) => {
    if (!step) return 'Premio de fidelizacion'
    return step.rewardLabel || step.stepName || 'Premio de fidelizacion'
}

const summarizeDiscountCode = (code: DiscountCode | null) => {
    if (!code) return 'Codigo promocional'
    if (code.label) return `${code.label} (${code.code})`
    if (code.type === 'GiftProduct') return `${code.giftProductName ?? 'Producto gratis'} gratis (${code.code})`
    if (code.type === 'FreeDelivery') return `Domicilio gratis (${code.code})`
    if (code.type === 'PercentageDiscount') return `${Number(code.discountPercentage ?? 0) || 0}% de descuento (${code.code})`
    return `Codigo ${code.code}`
}

const loadLoyaltyCycle = async (branchId: number) => {
    if (cycleByBranch.has(branchId)) return cycleByBranch.get(branchId) ?? []
    const existing = cycleInFlight.get(branchId)
    if (existing) return existing

    const promise = (async () => {
        try {
            const response = await loyaltyCycleApi.getCycle(branchId)
            const steps = response.data ?? []
            cycleByBranch.set(branchId, steps)
            return steps
        } catch {
            cycleByBranch.set(branchId, [])
            return []
        } finally {
            cycleInFlight.delete(branchId)
        }
    })()

    cycleInFlight.set(branchId, promise)
    return promise
}

const customerHasLoyaltyDue = (customer: Customer | null | undefined) =>
    customer?.loyaltyRewardDueOnCurrentOrder === true ||
    customer?.loyaltyDeliveriesUntilNextReward === 1

const resolveCustomerLoyaltyStep = async (
    branchId: number,
    customer: Customer | null | undefined,
) => {
    if (!customerHasLoyaltyDue(customer)) return null
    const stepIndex = customer?.loyaltyNextStepIndex
    if (typeof stepIndex !== 'number' || stepIndex < 1) return null
    const steps = await loadLoyaltyCycle(branchId)
    return steps.find((step) => step.isActive === true && step.stepIndex === stepIndex) ?? null
}

export function useOrderBenefitResolver() {
    const ordersStore = useOrdersDraftsStore()
    const dailyPromotionStore = useDailyPromotionStore()
    const authStore = useAuthStore()

    const selectedBenefitType = computed<AppliedBenefitType | null>(
        () => ordersStore.currentOrder?.selectedBenefitType ?? null,
    )

    const copyMessage = computed(() => {
        if (!conflictExists.value) return ''
        const options = [
            activeDailyPromotion.value ? `- ${summarizeDailyPromotion(activeDailyPromotion.value)} (Promo del dia)` : null,
            activeLoyaltyStep.value ? `- ${summarizeLoyaltyStep(activeLoyaltyStep.value)} (Fidelizacion)` : null,
            activeDiscountCode.value ? `- ${summarizeDiscountCode(activeDiscountCode.value)} (Codigo promocional)` : null,
        ].filter((item): item is string => Boolean(item))

        return [
            'Hoy puedes elegir entre:',
            ...options,
            'Cual quieres que te apliquemos?',
        ].join('\n')
    })

    const resolveBenefits = async () => {
        if (isResolving.value) return
        const order = ordersStore.currentOrder
        if (!order) {
            activeDailyPromotion.value = null
            activeLoyaltyStep.value = null
            activeDiscountCode.value = null
            conflictExists.value = false
            return
        }

        if (realItemsCount(order) === 0) {
            activeDailyPromotion.value = null
            activeLoyaltyStep.value = null
            activeDiscountCode.value = null
            conflictExists.value = false
            if (order.appliedBenefitType) {
                ordersStore.clearAppliedBenefitForCurrentOrder({ clearSelection: true })
            }
            return
        }

        const branchId = order.branchId || authStore.branchId
        if (!branchId) return

        isResolving.value = true
        try {
            const customer = ordersStore.customers.find((item) => item.id === order.customerId)
            const [promo, loyaltyStep] = await Promise.all([
                dailyPromotionStore.loadActive(branchId),
                resolveCustomerLoyaltyStep(branchId, customer),
            ])

            const eligibleDailyPromotion = promo && promotionMinimumReached(order, promo) ? promo : null
            const eligibleLoyaltyStep = loyaltyStep && loyaltyStep.isActive ? loyaltyStep : null
            const eligibleDiscountCode = discountCodeIsEligible(order, order.activeDiscountCode)
                ? order.activeDiscountCode ?? null
                : null

            activeDailyPromotion.value = eligibleDailyPromotion
            activeLoyaltyStep.value = eligibleLoyaltyStep
            activeDiscountCode.value = eligibleDiscountCode

            if (order.activeDiscountCode && !eligibleDiscountCode) {
                ordersStore.setCurrentOrderActiveDiscountCode(null, 'El codigo ya no cumple las condiciones del pedido.')
                return
            }

            const selected = order.selectedBenefitType ?? null
            if (selected === 'None') {
                conflictExists.value = false
                if (order.appliedBenefitType) {
                    ordersStore.clearAppliedBenefitForCurrentOrder({ selectedBenefitType: 'None' })
                }
                return
            }

            if (selected === 'DailyPromotion') {
                conflictExists.value = false
                if (eligibleDailyPromotion) {
                    ordersStore.applyDailyPromotionBenefitToCurrentOrder(eligibleDailyPromotion, 'DailyPromotion')
                } else if (order.appliedBenefitType === 'DailyPromotion') {
                    ordersStore.clearAppliedBenefitForCurrentOrder({ clearSelection: true })
                }
                return
            }

            if (selected === 'Loyalty') {
                conflictExists.value = false
                if (eligibleLoyaltyStep) {
                    ordersStore.applyLoyaltyBenefitToCurrentOrder(eligibleLoyaltyStep, 'Loyalty')
                } else if (order.appliedBenefitType === 'Loyalty') {
                    ordersStore.clearAppliedBenefitForCurrentOrder({ clearSelection: true })
                }
                return
            }

            if (selected === 'DiscountCode') {
                conflictExists.value = false
                if (eligibleDiscountCode) {
                    ordersStore.applyDiscountCodeBenefitToCurrentOrder(eligibleDiscountCode, 'DiscountCode')
                } else if (order.appliedBenefitType === 'DiscountCode') {
                    ordersStore.clearAppliedBenefitForCurrentOrder({ clearSelection: true })
                }
                return
            }

            const eligibleCount = [eligibleDailyPromotion, eligibleLoyaltyStep, eligibleDiscountCode].filter(Boolean).length
            if (eligibleCount > 1) {
                conflictExists.value = true
                if (order.appliedBenefitType) {
                    ordersStore.clearAppliedBenefitForCurrentOrder({ selectedBenefitType: null })
                }
                return
            }

            conflictExists.value = false
            if (eligibleDiscountCode) {
                ordersStore.applyDiscountCodeBenefitToCurrentOrder(eligibleDiscountCode, null)
                return
            }
            if (eligibleDailyPromotion) {
                ordersStore.applyDailyPromotionBenefitToCurrentOrder(eligibleDailyPromotion, null)
                return
            }
            if (eligibleLoyaltyStep) {
                ordersStore.applyLoyaltyBenefitToCurrentOrder(eligibleLoyaltyStep, null)
                return
            }
            if (order.appliedBenefitType) {
                ordersStore.clearAppliedBenefitForCurrentOrder({ clearSelection: true })
            }
        } finally {
            isResolving.value = false
        }
    }

    const applyDailyPromotion = async () => {
        ordersStore.setCurrentOrderSelectedBenefit('DailyPromotion')
        conflictExists.value = false
        const promo = activeDailyPromotion.value
        if (promo) {
            ordersStore.applyDailyPromotionBenefitToCurrentOrder(promo, 'DailyPromotion')
        } else {
            await resolveBenefits()
        }
    }

    const applyLoyaltyBenefit = async () => {
        ordersStore.setCurrentOrderSelectedBenefit('Loyalty')
        conflictExists.value = false
        const step = activeLoyaltyStep.value
        if (step) {
            ordersStore.applyLoyaltyBenefitToCurrentOrder(step, 'Loyalty')
        } else {
            await resolveBenefits()
        }
    }

    const applyDiscountCode = async () => {
        ordersStore.setCurrentOrderSelectedBenefit('DiscountCode')
        conflictExists.value = false
        const code = activeDiscountCode.value
        if (code) {
            ordersStore.applyDiscountCodeBenefitToCurrentOrder(code, 'DiscountCode')
        } else {
            await resolveBenefits()
        }
    }

    const clearAppliedBenefit = () => {
        conflictExists.value = false
        ordersStore.clearAppliedBenefitForCurrentOrder({ selectedBenefitType: 'None' })
    }

    const dailyPromotionSummary = computed(() => summarizeDailyPromotion(activeDailyPromotion.value))
    const loyaltySummary = computed(() => summarizeLoyaltyStep(activeLoyaltyStep.value))
    const discountCodeSummary = computed(() => summarizeDiscountCode(activeDiscountCode.value))
    const minimumOrderHint = computed(() => {
        const promo = activeDailyPromotion.value
        if (!promo?.minimumOrderValue) return ''
        return `Minimo ${currency.format(promo.minimumOrderValue)}`
    })

    return {
        activeDailyPromotion,
        activeLoyaltyStep,
        activeDiscountCode,
        selectedBenefitType,
        conflictExists,
        copyMessage,
        dailyPromotionSummary,
        loyaltySummary,
        discountCodeSummary,
        minimumOrderHint,
        resolveBenefits,
        applyDailyPromotion,
        applyLoyaltyBenefit,
        applyDiscountCode,
        clearAppliedBenefit,
    }
}
