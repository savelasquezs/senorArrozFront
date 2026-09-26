import { BaseApi } from './baseApi'
import type { InventoryBalance, InventoryCount, InventoryDeviationPoint, InventoryMovement, InventoryRecipe, InventoryReportRow, InventoryTransfer, ProductAvailability } from '@/types/inventory'

const operationConfig = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

class InventoryApi extends BaseApi {
  getAvailability(productIds: number[]) {
    const params = new URLSearchParams()
    productIds.forEach(id => params.append('productIds', String(id)))
    return this.get<ProductAvailability[]>('/inventory/availability', { params })
  }
  getBalances() { return this.get<InventoryBalance[]>('/inventory/balances') }
  getMovements(take = 200) { return this.get<InventoryMovement[]>('/inventory/movements', { params: { take } }) }
  getCounts() { return this.get<InventoryCount[]>('/inventory/counts') }
  startCount() { return this.post<InventoryCount>('/inventory/counts') }
  saveCountDraft(id: number, lines: Array<{ expenseId: number; countedQuantity: number | null }>) {
    return this.put<InventoryCount>(`/inventory/counts/${id}/draft-lines`, lines)
  }
  confirmCount(id: number, lines: Array<{ expenseId: number; countedQuantity: number }>) {
    return this.post<InventoryCount>(`/inventory/counts/${id}/confirm`, lines, operationConfig())
  }
  adjust(payload: { expenseId: number; quantityDelta: number; reason: string; waste: boolean }) {
    return this.post<void>('/inventory/adjustments', payload, operationConfig())
  }
  getTransfers() { return this.get<InventoryTransfer[]>('/inventory/transfers') }
  createTransfer(payload: { sourceBranchId: number; destinationBranchId: number; lines: Array<{ expenseId: number; quantity: number }> }) {
    return this.post<InventoryTransfer>('/inventory/transfers', payload, operationConfig())
  }
  dispatchTransfer(id: number) { return this.post<InventoryTransfer>(`/inventory/transfers/${id}/dispatch`, undefined, operationConfig()) }
  receiveTransfer(id: number, payload: { lines: Array<{ expenseId: number; receivedQuantity: number }>; differenceReason?: string }) {
    return this.post<InventoryTransfer>(`/inventory/transfers/${id}/receive`, payload, operationConfig())
  }
  getRecipe(productId: number) { return this.get<InventoryRecipe>(`/inventory/products/${productId}/recipe`) }
  setRecipe(productId: number, payload: { controlMode: 'estimated' | 'strict'; enabled: boolean; requirements: Array<{ expenseId: number; baseQuantity: number }> }) {
    return this.put<InventoryRecipe>(`/inventory/products/${productId}/recipe`, payload)
  }
  copyCatalogConfiguration(sourceExpenseId: number, targetExpenseIds: number[]) {
    return this.post<{ sourceExpenseId: number; updatedExpenseIds: number[] }>('/inventory/catalog/copy-configuration', { sourceExpenseId, targetExpenseIds })
  }
  getReport(fromUtc: string, toUtc: string) { return this.get<InventoryReportRow[]>('/inventory/report', { params: { fromUtc, toUtc } }) }
  getDeviation(fromUtc: string, toUtc: string) { return this.get<InventoryDeviationPoint[]>('/inventory/deviation', { params: { fromUtc, toUtc } }) }
}

export const inventoryApi = new InventoryApi()
