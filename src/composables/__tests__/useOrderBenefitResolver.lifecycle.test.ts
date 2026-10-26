import { expect, it, vi } from 'vitest'
import { useOrderBenefitResolver } from '../useOrderBenefitResolver'

const mocks = vi.hoisted(() => ({
    orders: { currentOrder: null as any, customers: [], applyDailyPromotionBenefitToCurrentOrder: vi.fn() },
    promo: vi.fn(),
}))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ user: { id: 1 }, branchId: 1 }) }))
vi.mock('@/store/ordersDrafts', () => ({ useOrdersDraftsStore: () => mocks.orders }))
vi.mock('@/store/dailyPromotion', () => ({ useDailyPromotionStore: () => ({ loadActive: mocks.promo }) }))

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
