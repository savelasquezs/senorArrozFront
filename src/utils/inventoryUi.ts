import type { Expense } from '@/types/expense'
import type { InventoryCount } from '@/types/inventory'

export type InventorySection = 'balances' | 'movements' | 'counts' | 'adjustments' | 'transfers' | 'catalog' | 'recipes' | 'reports'

export function normalizeInventoryText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

export function matchesInventorySearch(value: unknown, search: string) {
  const normalizedSearch = normalizeInventoryText(search)
  return !normalizedSearch || normalizeInventoryText(value).includes(normalizedSearch)
}

export function expenseInventoryPayload(expense: Expense, configuration?: {
  active: boolean
  baseUnit: 'unit' | 'gram' | 'milliliter'
  conversions: Array<{ name: string; baseQuantity: number; active: boolean }>
}) {
  const next = configuration ?? {
    active: expense.inventoryActive,
    baseUnit: expense.inventoryBaseUnit,
    conversions: expense.inventoryConversions,
  }
  return {
    name: expense.name,
    categoryId: expense.categoryId,
    unit: expense.unit,
    menuTargets: (expense.menuTargets || []).map(target => ({
      targetType: target.targetType as 0 | 1,
      targetId: target.targetId,
    })),
    tracksInventory: true,
    inventoryActive: next.active,
    inventoryBaseUnit: next.baseUnit,
    inventoryConversions: next.conversions.map(conversion => ({
      name: conversion.name.trim(),
      baseQuantity: Number(conversion.baseQuantity),
      active: conversion.active,
    })),
  }
}

export function countDraftStorageKey(userId: number | undefined, branchId: number, countId: number) {
  return `senor-arroz:inventory-count:${userId || 'anonymous'}:${branchId}:${countId}`
}

export function restoreCountDraft(count: InventoryCount, stored: string | null) {
  if (!stored) return Object.fromEntries(count.lines.map(line => [line.expenseId, line.countedQuantity ?? null]))
  try {
    const values = JSON.parse(stored) as Record<string, number | null>
    return Object.fromEntries(count.lines.map(line => {
      const value = values[String(line.expenseId)]
      return [line.expenseId, typeof value === 'number' && Number.isFinite(value) ? value : null]
    }))
  } catch {
    return Object.fromEntries(count.lines.map(line => [line.expenseId, line.countedQuantity ?? null]))
  }
}

export function inventoryDateRange(days: number, now = new Date()) {
  const to = new Date(now)
  const from = new Date(now)
  from.setDate(from.getDate() - Math.max(days - 1, 0))
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}
