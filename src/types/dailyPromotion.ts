export type DailyPromotionType = 'GiftProduct' | 'FreeDelivery' | 'PercentageDiscount'
export type DailyPromotionDiscountScope = 'AllProducts' | 'SpecificProducts'

export interface DailyPromotionProduct {
  productId: number
  productName: string
}

export interface DailyPromotion {
  id: number
  branchId: number
  type: DailyPromotionType
  giftProductId?: number | null
  giftProductName?: string | null
  giftProductCategoryName?: string | null
  discountPercentage?: number | null
  discountScope?: DailyPromotionDiscountScope | null
  discountProducts: DailyPromotionProduct[]
  minimumOrderValue?: number | null
  isActive: boolean
  startsAt: string
  endsAt?: string | null
  createdAt: string
  updatedAt?: string | null
  status?: string
}

export interface UpsertDailyPromotion {
  type: DailyPromotionType
  giftProductId?: number | null
  discountPercentage?: number | null
  discountScope?: DailyPromotionDiscountScope | null
  discountProductIds: number[]
  minimumOrderValue?: number | null
  isActive: boolean
  startsAt: string
  endsAt?: string | null
}
