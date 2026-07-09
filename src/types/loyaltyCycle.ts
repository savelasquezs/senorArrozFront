export type LoyaltyRewardType = 'GiftProduct' | 'FreeDelivery' | 'PercentageDiscount'

export interface LoyaltyCycleStep {
  id: number
  branchId: number
  stepIndex: number
  stepName?: string | null
  rewardLabel: string
  rewardType?: LoyaltyRewardType | null
  giftProductId?: number | null
  giftProductName?: string | null
  giftProductCategoryName?: string | null
  discountPercentage?: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertLoyaltyCycleStep {
  stepIndex: number
  stepName?: string | null
  rewardLabel: string
  rewardType: LoyaltyRewardType
  giftProductId?: number | null
  discountPercentage?: number | null
  isActive: boolean
}
