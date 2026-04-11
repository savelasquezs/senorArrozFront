import { BaseApi } from './baseApi'

export interface FcmTestFreeDeliverymenPayload {
	branchId?: number | null
}

export interface FcmTestFreeDeliverymenResult {
	branchId: number
	tokensTargeted: number
	busyDeliverymanCount: number
	correlationId: string
}

class FcmApi extends BaseApi {
	async testFreeDeliverymen(
		payload: FcmTestFreeDeliverymenPayload
	): Promise<FcmTestFreeDeliverymenResult> {
		return this.post<FcmTestFreeDeliverymenResult>('/fcm/test-free-deliverymen', payload)
	}
}

export const fcmApi = new FcmApi()
