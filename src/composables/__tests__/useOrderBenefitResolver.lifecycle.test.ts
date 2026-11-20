import { expect, it, vi } from 'vitest'
import { useOrderBenefitResolver } from '../useOrderBenefitResolver'

const mocks = vi.hoisted(() => ({
    orders: { currentOrder: null as any, customers: [] as any[], applyDailyPromotionBenefitToCurrentOrder: vi.fn(), applyLoyaltyBenefitToCurrentOrder: vi.fn() },
    promo: vi.fn(),
    cycle: vi.fn(),
}))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ user: { id: 1 }, branchId: 1 }) }))
vi.mock('@/store/ordersDrafts', () => ({ useOrdersDraftsStore: () => mocks.orders }))
vi.mock('@/store/dailyPromotion', () => ({ useDailyPromotionStore: () => ({ loadActive: mocks.promo }) }))
vi.mock('@/services/MainAPI/loyaltyCycleApi', () => ({ loyaltyCycleApi: { getCycle: mocks.cycle } }))

it('keeps the latest benefit invalidation and never applies an old result to another draft', async () => {
    let finish!: (value: any) => void
    mocks.promo.mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockResolvedValueOnce(null)
    mocks.orders.currentOrder = { tabId: 'a', branchId: 1, selectedBenefitType: 'DailyPromotion', orderItems: [{ productId: 1, quantity: 1, unitPrice: 1000 }] }
    const resolver = useOrderBenefitResolver()
    const first = resolver.resolveBenefits()
    await Promise.resolve()
    mocks.orders.currentOrder = { tabId: 'b', branchId: 2, orderItems: [{ productId: 2, quantity: 1, unitPrice: 1000 }] }
    const second = resolver.resolveBenefits()
    finish({ id: 1, type: 'PercentageDiscount', discountPercentage: 10 })
    await Promise.all([first, second])
    expect(mocks.promo).toHaveBeenCalledTimes(2)
    expect(mocks.orders.applyDailyPromotionBenefitToCurrentOrder).not.toHaveBeenCalled()
})

it('retries an unavailable loyalty cycle instead of caching an empty cycle permanently', async () => {
    const branchId = 987654 // synthetic, distinct from other tests
    const step = { id: 11, branchId, stepIndex: 1, isActive: true, rewardLabel: 'Regalo de prueba' }
    mocks.orders.currentOrder = {
        tabId: 'retry', branchId, customerId: 18, selectedBenefitType: 'Loyalty',
        orderItems: [{ productId: 1, quantity: 1, unitPrice: 1000 }],
    }
    mocks.orders.customers = [{ id: 18, loyaltyRewardDueOnCurrentOrder: true, loyaltyNextStepIndex: 1 }]
    mocks.orders.applyLoyaltyBenefitToCurrentOrder.mockClear()
    mocks.promo.mockReset()
    mocks.promo.mockResolvedValue(null)
    mocks.cycle.mockReset()
    mocks.cycle.mockRejectedValueOnce(new Error('transient network failure'))
        .mockResolvedValueOnce({ data: [step] })

    const resolver = useOrderBenefitResolver()
    await resolver.resolveBenefits()
    expect(mocks.cycle).toHaveBeenCalledTimes(1)
    expect(mocks.orders.applyLoyaltyBenefitToCurrentOrder).not.toHaveBeenCalled()

    await resolver.resolveBenefits()
    expect(mocks.cycle).toHaveBeenCalledTimes(2)
    expect(mocks.orders.applyLoyaltyBenefitToCurrentOrder).toHaveBeenCalledExactlyOnceWith(step, 'Loyalty')

    // A successful response remains cached: no new HTTP read on another resolution.
    await resolver.resolveBenefits()
    expect(mocks.cycle).toHaveBeenCalledTimes(2)
})
