export interface ReservationDeposit {
  id: number
  orderId: number
  branchId: number
  amount: number
  isEffective: boolean
  bankId?: number
  bankName?: string
  appId?: number
  appName?: string
  receivedAt: string
  receivedById: number
  receivedByName: string
  notes?: string
  createdAt: string
}

export interface CreateReservationDepositDto {
  orderId: number
  amount: number
  isEffective: boolean
  bankId?: number
  appId?: number
  notes?: string
}
