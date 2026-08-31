import type { Product } from '@/types/product'

export interface DailyPromotionProductOption {
  id: number
  name: string
  categoryName: string
}

export function getDailyPromotionProductOptions(
  products: Product[],
  branchId: number | null,
): DailyPromotionProductOption[] {
  if (!branchId) return []

  return products
    .filter((product) => product.active && product.branchId === branchId)
    .map((product) => ({
      id: product.id,
      name: product.name,
      categoryName: product.categoryName,
    }))
}
