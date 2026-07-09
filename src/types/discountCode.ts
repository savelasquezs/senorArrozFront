export type DiscountCodeType = 'GiftProduct' | 'FreeDelivery' | 'PercentageDiscount'

export interface DiscountCode {
  id: number
  branchId: number
  code: string
  type: DiscountCodeType
  giftProductId?: number | null
  giftProductName?: string | null
  giftProductCategoryName?: string | null
  discountPercentage?: number | null
  startsAt: string
  endsAt?: string | null
  minimumOrderValue?: number | null
  isActive: boolean
  label: string
  description?: string | null
  createdAt: string
  updatedAt?: string | null
  status: 'active' | 'inactive' | 'scheduled' | 'expired' | string
}

export interface UpsertDiscountCode {
  id?: number | null
  code: string
  type: DiscountCodeType
  giftProductId?: number | null
  discountPercentage?: number | null
  startsAt: string
  endsAt?: string | null
  minimumOrderValue?: number | null
  isActive: boolean
  label: string
  description?: string | null
}
