import { describe, expect, it } from 'vitest'
import { expenseInventoryPayload, inventoryDateRange, matchesInventorySearch, normalizeInventoryText, restoreCountDraft } from '@/utils/inventoryUi'
import type { Expense } from '@/types/expense'
import type { InventoryCount } from '@/types/inventory'

const expense: Expense = {
  id: 7,
  name: 'Coca-Cola 1.5 L',
  categoryId: 3,
  categoryName: 'Bebidas',
  unit: 'Package',
  unitDisplay: 'Paquete',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  menuTargets: [{ targetType: 1, targetId: 42, targetName: 'Coca Cola', productMissingWeight: false }],
  tracksInventory: true,
  inventoryActive: false,
  inventoryBaseUnit: 'unit',
  inventoryConversions: [],
}

const count: InventoryCount = {
  id: 12,
  branchId: 2,
  status: 'draft',
  createdAt: '2026-09-25T00:00:00Z',
  lines: [
    { expenseId: 7, expenseName: 'Coca-Cola 1.5 L', baseUnit: 'unit', expectedQuantity: 24 },
    { expenseId: 8, expenseName: 'Coca Cola personal', baseUnit: 'unit', expectedQuantity: 12 },
  ],
}

describe('inventory UI helpers', () => {
  it('normaliza tildes, espacios y guiones para buscar nombres comunes', () => {
    expect(normalizeInventoryText('CÓCA - Cola')).toBe('cocacola')
    expect(matchesInventorySearch('Coca-Cola 1.5 L', 'coca cola')).toBe(true)
    expect(matchesInventorySearch('Coca Cola personal', 'CÓCA-COLA')).toBe(true)
  })

  it('copia solo la configuración de inventario y conserva los datos contables', () => {
    const payload = expenseInventoryPayload(expense, {
      active: true,
      baseUnit: 'unit',
      conversions: [{ name: 'Caja x12', baseQuantity: 12, active: true }],
    })

    expect(payload).toMatchObject({
      name: expense.name,
      categoryId: expense.categoryId,
      unit: expense.unit,
      menuTargets: [{ targetType: 1, targetId: 42 }],
      inventoryActive: true,
      inventoryBaseUnit: 'unit',
      inventoryConversions: [{ name: 'Caja x12', baseQuantity: 12, active: true }],
    })
  })

  it('inicia un conteo sin copiar la existencia teórica', () => {
    expect(restoreCountDraft(count, null)).toEqual({ 7: null, 8: null })
    expect(restoreCountDraft(count, '{mal-json')).toEqual({ 7: null, 8: null })
  })

  it('restaura únicamente cantidades válidas guardadas en el navegador', () => {
    expect(restoreCountDraft(count, JSON.stringify({ 7: 22, 8: null, 99: 3 }))).toEqual({ 7: 22, 8: null })
  })

  it('restaura el borrador persistido por el servidor cuando no hay respaldo local', () => {
    const serverDraft = { ...count, lines: count.lines.map((line, index) => ({ ...line, countedQuantity: index === 0 ? 23 : null })) }
    expect(restoreCountDraft(serverDraft, null)).toEqual({ 7: 23, 8: null })
  })

  it('calcula rangos inclusivos', () => {
    expect(inventoryDateRange(7, new Date('2026-09-25T12:00:00Z'))).toEqual({ from: '2026-09-19', to: '2026-09-25' })
  })
})
