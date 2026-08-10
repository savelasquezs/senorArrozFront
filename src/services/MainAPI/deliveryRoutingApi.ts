import { BaseApi } from './baseApi'
import type { DeliveryRouteProposal, DeliveryRoutingPlan } from '@/types/deliveryRouting'

class DeliveryRoutingApi extends BaseApi {
    getPlan(): Promise<DeliveryRoutingPlan> {
        return this.get('/delivery-routing/plan')
    }

    recalculate(): Promise<DeliveryRoutingPlan> {
        return this.post('/delivery-routing/recalculate')
    }

    preview(orderIds: number[]): Promise<DeliveryRouteProposal> {
        return this.post('/delivery-routing/preview', { orderIds })
    }
}

export const deliveryRoutingApi = new DeliveryRoutingApi()
