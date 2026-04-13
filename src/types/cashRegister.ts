// src/types/cashRegister.ts

// ===== DENOMINACIONES =====
export const DENOMINATIONS = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50] as const
export type Denomination = (typeof DENOMINATIONS)[number]
export type DenominationCounts = Record<Denomination, number>

// ===== BANK TRANSFERS =====
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

// ===== CASH REGISTER CLOSURE =====
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
  bankReconciliations: CashClosureBankReconciliation[]
  informalLoans: CashClosureInformalLoan[]
  createdAt: string
}

// ===== EXPECTED (para iniciar el cuadre) =====
export interface BankExpectedBalance {
  bankId: number
  bankName: string
  /** snake_case desde API: normal | cash_vault | real_vault */
  bankType?: string
  openingBalance: number
  expectedBalance: number
}

export interface CashRegisterExpected {
  openingCash: number
  /** Efectivo + bancos + snapshot préstamos al último cierre. */
  openingGlobalTotal: number
  /** Ventas (pedidos entregados) en el período por instante PrepareAt/CreatedAt. */
  salesInPeriodTotal: number
  expensesInPeriodTotal: number
  expectedGlobalTotal: number
  /** Préstamos informales activos: suman al total global contado (efectivo del negocio fuera del cajón). */
  informalLoansActiveTotal: number
  /** Pedidos sin entregar ni cancelar en la sucursal; si hay alguno no se permite guardar el cuadre. */
  undeliveredOrdersCount: number
  asOf: string
  lastClosureAt?: string
  banks: BankExpectedBalance[]
}

/** Préstamo informal por sucursal (tabla branch_informal_loan). */
export interface BranchInformalLoan {
  id: number
  branchId: number
  concept: string
  amount: number
  createdAt: string
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

/** Movimiento Caja Mayor Efectivo (API enum snake_case). */
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
}

// ===== DTO PARA ENVIAR CUADRE =====
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
