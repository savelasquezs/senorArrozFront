import { afterEach, expect, it, vi } from 'vitest'
import { orderApi } from '../orderApi'

afterEach(() => vi.restoreAllMocks())

it.each([
    ['none', null, 'None', null],
    ['manual', 'gift_product', 'Manual', 'GiftProduct'],
    ['loyalty', 'percentage_discount', 'Loyalty', 'PercentageDiscount'],
    ['daily_promotion', 'free_delivery', 'DailyPromotion', 'FreeDelivery'],
    ['discount_code', 'GiftProduct', 'DiscountCode', 'GiftProduct'],
    ['Manual', 'GiftProduct', 'Manual', 'GiftProduct'],
])('normalizes persisted benefit %s / %s before exposing order details', async (type, reward, expectedType, expectedReward) => {
    const response = { id: 9600, appliedBenefitType: type, appliedBenefitRewardType: reward, total: 28500, orderDetails: [{ productId: 90, unitPrice: 0 }] }
    const get = vi.spyOn(orderApi, 'get').mockResolvedValue(response)

    const detail = await orderApi.fetchDetail(9600)

    expect(get).toHaveBeenCalledWith('/orders/9600/details')
    expect(detail).toEqual({ ...response, appliedBenefitType: expectedType, appliedBenefitRewardType: expectedReward })
    expect(response.appliedBenefitType).toBe(type)
})
