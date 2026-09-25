export type InventoryBaseUnit = 'unit' | 'gram' | 'milliliter'
export type InventoryControlMode = 'estimated' | 'strict'
export interface ProductAvailability { productId: number; available: boolean; maximumQuantity?: number | null; controlMode?: InventoryControlMode | null; usesFallback: boolean }

export interface InventoryBalance {
  expenseId: number
  expenseName: string
  baseUnit: InventoryBaseUnit
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  averageUnitCost: number
  inventoryValue: number
}

export interface InventoryMovement {
  id: number
  expenseId: number
  expenseName: string
  type: string
  onHandDelta: number
  reservedDelta: number
  unitCost: number
  orderId?: number | null
  expenseHeaderId?: number | null
  transferId?: number | null
  inventoryCountId?: number | null
  operationKey: string
  reason?: string | null
  createdAt: string
}

export interface InventoryRequirement { expenseId: number; expenseName: string; baseUnit: InventoryBaseUnit; baseQuantity: number }
export interface InventoryRecipe { productId: number; inventoryEnabled: boolean; controlMode: InventoryControlMode; requirements: InventoryRequirement[] }
export interface InventoryCountLine { expenseId: number; expenseName: string; baseUnit: InventoryBaseUnit; expectedQuantity: number; countedQuantity?: number | null; difference?: number | null }
export interface InventoryCount { id: number; branchId: number; status: string; createdAt: string; confirmedAt?: string | null; lines: InventoryCountLine[] }
export interface InventoryTransferLine { expenseId: number; expenseName: string; baseUnit: InventoryBaseUnit; quantity: number; receivedQuantity?: number | null; unitCost: number }
export interface InventoryTransfer { id: number; sourceBranchId: number; sourceBranchName: string; destinationBranchId: number; destinationBranchName: string; status: string; createdAt: string; dispatchedAt?: string | null; receivedAt?: string | null; differenceReason?: string | null; lines: InventoryTransferLine[] }
export interface InventoryReportRow { expenseId: number; expenseName: string; baseUnit: InventoryBaseUnit; purchases: number; estimatedConsumption: number; strictConsumption: number; adjustments: number; waste: number; transferIn: number; transferOut: number; latestExpected?: number | null; latestCounted?: number | null; latestDifference?: number | null; latestDifferencePercentage?: number | null; latestCountedAt?: string | null }
export interface InventoryDeviationPoint { countId: number; expenseId: number; expenseName: string; expectedQuantity: number; countedQuantity: number; difference: number; differencePercentage?: number | null; countedAt: string }
