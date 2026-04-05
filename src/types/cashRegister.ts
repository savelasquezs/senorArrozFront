// src/types/cashRegister.ts

// ===== DENOMINACIONES =====
export const DENOMINATIONS = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50] as const
export type Denomination = (typeof DENOMINATIONS)[number]
export type DenominationCounts = Record<Denomination, number>

// ===== BANK TRANSFERS =====
export interface BankTransfer {
  id: number
  fromBankId: number
  fromBankName: string
  toBankId: number
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
  fromBankId: number
  toBankId: number
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
  openingBalance: number
  expectedBalance: number
}

export interface CashRegisterExpected {
  openingCash: number
  expectedCash: number
  cashFromOrders: number
  cashDeposits: number
  cashExpenses: number
  /** Abonos domiciliario por transferencia: restados del efectivo esperado (cuadran en banco). */
  advancesBankTransfer: number
  /** Suma de préstamos informales activos; ya restada en expectedCash. */
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

export interface CreateBranchInformalLoanDto {
  concept: string
  amount: number
}

export interface DeactivateBranchInformalLoanDto {
  notes?: string | null
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
