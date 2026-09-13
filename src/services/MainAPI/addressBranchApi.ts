import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'

export interface AddressBranchService {
    branchId: number
    branchName: string
    deliveryFee: number
    isCovered: boolean
    validatedAt?: string | null
}

export interface UpsertAddressBranchServicePayload {
    deliveryFee: number
    latitude?: number | null
    longitude?: number | null
}

class AddressBranchApi extends BaseApi {
    getServices(customerId: number, addressId: number): Promise<ApiResponse<AddressBranchService[]>> {
        return this.get<ApiResponse<AddressBranchService[]>>(
            `/customers/${customerId}/addresses/${addressId}/branch-service`,
        )
    }

    upsert(
        customerId: number,
        addressId: number,
        payload: UpsertAddressBranchServicePayload,
    ): Promise<ApiResponse<AddressBranchService>> {
        return this.put<ApiResponse<AddressBranchService>>(
            `/customers/${customerId}/addresses/${addressId}/branch-service`,
            payload,
        )
    }
}

export const addressBranchApi = new AddressBranchApi()
