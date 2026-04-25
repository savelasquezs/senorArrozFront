// src/services/MainAPI/bankApi.ts
import { BaseApi } from './baseApi';
import type {
    PagedResult,
} from '@/types/common';
import type {
    Bank,
    BankBalanceBreakdown,
    BankDetail,
    BankFilters,
    CreateBankDto,
    DeliverymanBankAdvanceLine,
    ExpenseBankPaymentLine,
    UpdateBankDto,
} from '@/types/bank';
import { buildQueryParams } from './queryParams';

class BankApi extends BaseApi {
    async getBanks(
        filters?: BankFilters
    ): Promise<PagedResult<Bank>> {
        const params = buildQueryParams(filters, {
            Name: 'name',
            BranchId: 'branchId',
            Active: 'active',
            Page: (value) => value.page ?? 1,
            PageSize: (value) => value.pageSize ?? 10,
            SortBy: 'sortBy',
            SortOrder: 'sortOrder',
        });

        return this.get<PagedResult<Bank>>('/banks', {
            params,
        });
    }

    async getBankById(id: number): Promise<Bank> {
        return this.get<Bank>(`/banks/${id}`);
    }

    async getBankDetail(id: number): Promise<BankDetail> {
        return this.get<BankDetail>(`/banks/${id}/detail`);
    }

    async createBank(
        payload: CreateBankDto
    ): Promise<Bank> {
        return this.post<Bank>('/banks', payload);
    }

    async updateBank(
        id: number,
        payload: UpdateBankDto
    ): Promise<Bank> {
        return this.put<Bank>(`/banks/${id}`, payload);
    }

    async deleteBank(id: number): Promise<string> {
        return this.delete<string>(`/banks/${id}`);
    }

    async getBankLedgerPeriod(
        bankId: number,
        fromDate: string,
        toDate: string
    ): Promise<BankBalanceBreakdown> {
        return this.get<BankBalanceBreakdown>(`/banks/${bankId}/movements/period-summary`, {
            params: { FromDate: fromDate, ToDate: toDate },
        });
    }

    async getBankExpensePaymentsPaged(
        bankId: number,
        fromDate: string,
        toDate: string,
        options?: { branchId?: number; page?: number; pageSize?: number }
    ): Promise<PagedResult<ExpenseBankPaymentLine>> {
        const params: Record<string, unknown> = {
            FromDate: fromDate,
            ToDate: toDate,
            Page: options?.page ?? 1,
            PageSize: options?.pageSize ?? 20,
        };
        if (options?.branchId != null) params.BranchId = options.branchId;
        return this.get<PagedResult<ExpenseBankPaymentLine>>(
            `/banks/${bankId}/movements/expense-payments`,
            { params }
        );
    }

    async getBankDeliverymanTransfersPaged(
        bankId: number,
        fromDate: string,
        toDate: string,
        options?: { branchId?: number; page?: number; pageSize?: number }
    ): Promise<PagedResult<DeliverymanBankAdvanceLine>> {
        const params: Record<string, unknown> = {
            FromDate: fromDate,
            ToDate: toDate,
            Page: options?.page ?? 1,
            PageSize: options?.pageSize ?? 20,
        };
        if (options?.branchId != null) params.BranchId = options.branchId;
        return this.get<PagedResult<DeliverymanBankAdvanceLine>>(
            `/banks/${bankId}/movements/deliveryman-transfers`,
            { params }
        );
    }
}

export const bankApi = new BankApi();
