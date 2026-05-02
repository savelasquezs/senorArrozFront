import type { AxiosRequestConfig } from 'axios'
import type {
    CreateExpenseHeaderDto,
    ExpenseHeader,
    ExpenseHeaderFilters,
    ExpenseHeaderListResult,
    UpdateExpenseHeaderDto,
} from '@/types/expense'
import { BaseApi } from './baseApi'
import { toNumberFilterList, toStringFilterList } from '@/utils/filterNormalization'

export function buildExpenseHeaderQueryParams(filters?: ExpenseHeaderFilters): URLSearchParams {
    const params = new URLSearchParams()

    if (!filters) return params

    if (filters.fromDate) params.append('FromDate', filters.fromDate)
    if (filters.toDate) params.append('ToDate', filters.toDate)

    for (const supplierId of toNumberFilterList(filters.supplierIds)) {
        params.append('SupplierIds', String(supplierId))
    }

    for (const bankName of toStringFilterList(filters.bankNames)) {
        params.append('BankNames', bankName)
    }

    for (const categoryName of toStringFilterList(filters.categoryNames)) {
        params.append('CategoryNames', categoryName)
    }

    if (filters.expenseName?.trim()) params.append('ExpenseName', filters.expenseName.trim())
    params.append('Page', String(filters.page ?? 1))
    params.append('PageSize', String(filters.pageSize ?? 10))
    if (filters.sortBy) params.append('SortBy', filters.sortBy)
    if (filters.sortOrder) params.append('SortOrder', filters.sortOrder)

    return params
}

class ExpenseHeaderApi extends BaseApi {
    async getExpenseHeaders(filters?: ExpenseHeaderFilters): Promise<ExpenseHeaderListResult> {
        const config: AxiosRequestConfig = { params: buildExpenseHeaderQueryParams(filters) }
        return this.get<ExpenseHeaderListResult>('/expenseheaders', config)
    }

    async getExpenseHeaderById(id: number): Promise<ExpenseHeader> {
        return this.get<ExpenseHeader>(`/expenseheaders/${id}`)
    }

    async createExpenseHeader(payload: CreateExpenseHeaderDto): Promise<ExpenseHeader> {
        return this.post<ExpenseHeader>('/expenseheaders', payload)
    }

    async updateExpenseHeader(id: number, payload: UpdateExpenseHeaderDto): Promise<ExpenseHeader> {
        return this.put<ExpenseHeader>(`/expenseheaders/${id}`, payload)
    }

    async deleteExpenseHeader(id: number): Promise<void> {
        return this.delete<void>(`/expenseheaders/${id}`)
    }
}

export const expenseHeaderApi = new ExpenseHeaderApi()
