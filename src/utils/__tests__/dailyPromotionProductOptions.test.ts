import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/product'
import { getDailyPromotionProductOptions } from '@/utils/dailyPromotionProductOptions'

function product(overrides: Partial<Product>): Product {
  return {
    id: 1,
    categoryId: 10,
    categoryName: 'Regalos',
    branchId: 1,
    branchName: 'Sucursal 1',
    name: 'Papas',
    price: 0,
    stock: null,
    active: true,
    storefrontSortOrder: 0,
    createdAt: '2026-08-31T00:00:00Z',
    updatedAt: '2026-08-31T00:00:00Z',
    ...overrides,
  }
}

describe('getDailyPromotionProductOptions', () => {
  it('solo expone productos activos de la sucursal seleccionada', () => {
    const products = [
      product({ id: 11, branchId: 1, branchName: 'Castilla', name: 'Papas Castilla' }),
      product({ id: 22, branchId: 2, branchName: 'Manrique', name: 'Papas Manrique' }),
      product({ id: 33, branchId: 1, branchName: 'Castilla', name: 'Yucas Castilla', active: false }),
    ]

    expect(getDailyPromotionProductOptions(products, 2)).toEqual([
      { id: 22, name: 'Papas Manrique', categoryName: 'Regalos' },
    ])
  })

  it('no expone productos cuando no hay sucursal seleccionada', () => {
    expect(getDailyPromotionProductOptions([product({})], null)).toEqual([])
  })
})
