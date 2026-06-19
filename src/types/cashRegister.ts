export const DENOMINATIONS = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50] as const
export type Denomination = (typeof DENOMINATIONS)[number]
export type DenominationCounts = Record<Denomination, number>

export interface BankTransfer {
  id: number
  fromBankId: number | null
  fromBankName: string
  toBankId: number | null
  toBankName: string
  amount: number
  note?: string
  createdById: number
  createdByName: string
  createdAt: string
}

export interface BankTransferFilters {
  branchId?: number
  fromBankId?: number
  toBankId?: number
  fromDate?: string
  toDate?: string
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateBankTransferDto {
  fromBankId?: number | null
  toBankId?: number | null
  amount: number
  note?: string
}

export interface CashClosureBankReconciliation {
  id: number
  bankId: number
  bankName: string
  expectedBalance: number
  actualBalance: number
  adjustments: string
  difference: number
}

export interface CashClosureInformalLoan {
  id: number
  concept: string
  amount: number
}

export interface CashClosure {
  id: number
  branchId: number
  branchName: string
  closedAt: string
  createdById: number
  createdByName: string
  openingCash: number
  closingCash: number
  denominationCounts: string
  pendingAppPaymentsSnapshot?: string
  auditBusinessDate: string
  auditDispatchStatus: string
  auditDispatchError?: string | null
  auditDispatchedAt?: string | null
  bankReconciliations: CashClosureBankReconciliation[]
  informalLoans: CashClosureInformalLoan[]
  createdAt: string
}

export interface CashClosureAuditGroup {
  key: string
  title: string
  eventCount: number
  netDifference: number
  details: string[]
}

export interface CashClosureAuditEvent {
  id: number
  changedAt: string
  userName: string
  entityType: string
  entityId: number
  operationType: string
  summaryText: string
  totalBefore?: number | null
  totalAfter?: number | null
  difference: number
}

export interface CashClosureAuditSummary {
  cashClosureId: number
  branchId: number
  branchName: string
  businessDate: string
  dispatchStatus: string
  dispatchError?: string | null
  dispatchedAt?: string | null
  periodStartUtc: string
  periodEndUtc: string
  recipientEmails: string[]
  groups: CashClosureAuditGroup[]
  events: CashClosureAuditEvent[]
}

export interface BankExpectedBalance {
  bankId: number
  bankName: string
  bankType?: string
  openingBalance: number
  expectedBalance: number
}

export interface UnsettledAppLine {
  appId: number
  appName: string
  amount: number
}

export interface CashRegisterExpected {
  openingCash: number
  openingGlobalTotal: number
  openingUnsettledAppsTotal?: number
  salesInPeriodTotal: number
  expensesInPeriodTotal: number
  reservationDepositsAddedToGlobalTotal?: number
  bankPaymentsAddedToGlobalTotal?: number
  expectedGlobalTotal: number
  informalLoansActiveTotal: number
  undeliveredOrdersCount: number
  asOf: string
  lastClosureAt?: string
  banks: BankExpectedBalance[]
  unsettledAppLines?: UnsettledAppLine[]
  unsettledAppsTotal?: number
}

export interface BranchInformalLoan {
  id: number
  branchId: number
  concept: string
  amount: number
  createdAt: string
  updatedAt: string
  createdById: number
  createdByName: string
  deactivatedAt?: string | null
  deactivatedById?: number | null
  deactivatedByName?: string | null
  deactivationNotes?: string | null
}

export interface DeliveryAdvanceLineDto {
  orderId: number
  vueltoAdd: number
}

export interface CreateDeliveryAdvanceInformalLoanDto {
  deliverymanId: number
  lines: DeliveryAdvanceLineDto[]
}

export interface CreateBranchInformalLoanDto {
  concept?: string
  amount?: number
  deliveryAdvance?: CreateDeliveryAdvanceInformalLoanDto
}

export interface DeliveryAdvanceOrderRow {
  id: number
  total: number
  status: string
  addressSummary: string
}

export interface LiquidatedDeliverymanOption {
  id: number
  name: string
}

export interface DeactivateBranchInformalLoanDto {
  notes?: string | null
}

export interface UpdateBranchInformalLoanDto {
  concept: string
  amount: number
}

export type CashVaultMovementKind = 'abono_to_vault' | 'withdraw_from_vault'

export interface CreateCashVaultMovementDto {
  kind: CashVaultMovementKind
  amount?: number | null
  withdrawAll?: boolean
  note?: string | null
}

export interface CashVaultMovement {
  id: number
  branchId: number
  bankId: number
  bankName: string
  kind: CashVaultMovementKind
  amount: number
  note?: string | null
  createdAt: string
  createdById: number
  createdByName?: string | null
}

export interface CloseBankReconciliationDto {
  bankId: number
  expectedBalance: number
  actualBalance: number
  adjustments: string
}

export interface CloseCashRegisterDto {
  closedAt: string
  denominationCounts: string
  closingCash: number
  bankReconciliations: CloseBankReconciliationDto[]
}
