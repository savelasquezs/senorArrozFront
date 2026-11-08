const benefitTypes: Record<string, string> = {
    none: 'None', daily_promotion: 'DailyPromotion', loyalty: 'Loyalty',
    discount_code: 'DiscountCode', manual: 'Manual',
}
const rewardTypes: Record<string, string> = {
    gift_product: 'GiftProduct', percentage_discount: 'PercentageDiscount', free_delivery: 'FreeDelivery',
}

export function normalizeOrderBenefits<T extends { appliedBenefitType?: string | null; appliedBenefitRewardType?: string | null }>(order: T): T {
    return {
        ...order,
        ...(order.appliedBenefitType ? { appliedBenefitType: benefitTypes[order.appliedBenefitType] ?? order.appliedBenefitType } : {}),
        ...(order.appliedBenefitRewardType ? { appliedBenefitRewardType: rewardTypes[order.appliedBenefitRewardType] ?? order.appliedBenefitRewardType } : {}),
    }
}
