import type { OrderItem, Product } from '@/types/order'

export function createOrderItem(product: Product, quantity = 1): OrderItem {
    return {
        tempId: `item-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        productId: product.id, productName: product.name, productPrice: product.price,
        quantity, unitPrice: product.price, discount: 0,
        dailyPromotionDiscount: 0, dailyPromotionDiscountPercentage: null,
        loyaltyDiscount: 0, loyaltyDiscountPercentage: null,
        discountCodeDiscount: 0, discountCodeDiscountPercentage: null,
        freeDeliveryDiscount: 0, subtotal: product.price * quantity, notes: '',
        isDailyPromotionGift: false, isLoyaltyGift: false, isDiscountCodeGift: false,
    }
}

export function orderItemSubtotal(item: Pick<OrderItem, 'quantity' | 'unitPrice' | 'discount'>
    & Partial<Pick<OrderItem, 'dailyPromotionDiscount' | 'loyaltyDiscount' | 'discountCodeDiscount' | 'freeDeliveryDiscount'>>) {
    const automatic = [item.dailyPromotionDiscount, item.loyaltyDiscount, item.discountCodeDiscount, item.freeDeliveryDiscount]
        .reduce<number>((sum, value) => sum + Math.max(0, Number(value ?? 0) || 0), 0)
    return Math.max(0, item.quantity * item.unitPrice - item.discount - automatic)
}
