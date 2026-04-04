export type UserPayrollSeriesGranularity = 'day' | 'month' | 'biweek'

export interface UserPayrollLinkedExpense {
	id: number
	name: string
}

export interface UserPayrollExpenseLineItem {
	detailId: number
	headerId: number
	headerCreatedAt: string
	lineTotal: number
	notes?: string | null
}

export interface UserPayrollPeriodTotals {
	expenseLinesTotal: number
	expenseLines: UserPayrollExpenseLineItem[]
	deliveredOrdersCount: number
	sumDeliveryFee: number
	payableDeliveryFee: number
	isDeliveryman: boolean
}

export interface UserPayrollSeriesPoint {
	key: string
	label: string
	expenseLinesTotal: number
	deliveredOrdersCount: number
	sumDeliveryFee: number
	payableDeliveryFee: number
}

export interface UserPayrollInsights {
	linkedExpense: UserPayrollLinkedExpense | null
	deliveryFeePayRate: number
	fromDate: string
	toDate: string
	seriesGranularity: UserPayrollSeriesGranularity
	period: UserPayrollPeriodTotals
	series: UserPayrollSeriesPoint[]
}
