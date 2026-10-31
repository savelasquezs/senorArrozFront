import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type { RemoteOrderBranch, OrderOperationOptions, OrderTracking } from '@/types/orderManagement'

/** Every read is authorized against an order. This never selects another global branch. */
class OrderManagementApi extends BaseApi {
    remoteBranches(): Promise<RemoteOrderBranch[]> {
        return this.get('/orders/remote-branches')
    }
    options(orderId: number, signal?: AbortSignal): Promise<OrderOperationOptions> {
        return this.get(`/orders/${orderId}/operation-options`, { signal })
    }
    tracking(orderId: number): Promise<OrderTracking> {
        return this.get(`/orders/${orderId}/tracking`)
    }
    reprint(orderId: number, kind: 'kitchen' | 'delivery'): Promise<ApiResponse<{ jobId: number }>> {
        return this.post(`/orders/${orderId}/print`, { kind })
    }
}
export const orderManagementApi = new OrderManagementApi()
